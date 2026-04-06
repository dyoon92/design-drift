/**
 * DS Coverage Overlay
 * ───────────────────
 * Dev-only tool that paints colored borders over every rendered React
 * component, cross-referenced against the design system manifest.
 *
 *   Green  = DS component  →  corner badge opens Storybook / Figma
 *   Red    = custom gap    →  click badge to inspect live props
 *                             hover name in panel → highlight on canvas
 *
 * Toggle:  D (while not typing)  or  click the floating badge
 * Inspect: I (while not typing)  or  click any component badge
 */

import React, { useState, useEffect, useRef, useCallback, useContext, createContext } from 'react'
import html2canvas from 'html2canvas'
import { scanFiberTree, hashComponents, type ScannedComponent } from './fiberScanner'
import { DS_STORY_PATHS, DS_FIGMA_LINKS, DS_COMPONENTS, STORYBOOK_URL, config, refreshDSFromStorybook, refreshDSFromFigma } from './manifest'
import { scanTokenViolations, getColorViolationsInSubtree, type TokenViolation, type DriftViolation, type DriftViolationType } from './tokenChecker'
import { SetupWizard } from './SetupWizard'
import { PromotePanel } from './PromotePanel'
import figmaLogoUrl from './figma-logo.svg'
import jiraLogoUrl from './jira-logo.png'

const SB_BASE         = STORYBOOK_URL
// True when storybookUrl points at localhost — links are only usable by the dev running the server locally.
// When true we suppress external Storybook links so the demo doesn't show broken ↗ icons to visitors.
const SB_IS_LOCAL     = SB_BASE.includes('localhost') || SB_BASE.includes('127.0.0.1')
// True when the page is loaded with ?demo=1 — shows the waitlist CTA in the panel footer.
const IS_DEMO         = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')
const BADGE_H         = 19
const PROMOTE_MIN     = 5
const HISTORY_KEY     = 'ds-coverage-history'
const HISTORY_MAX     = 15
const THEME_KEY       = 'ds-coverage-theme'
const IGNORE_KEY      = 'drift-approved-gaps'
const SCAN_CACHE_PFX  = 'ds-coverage-scan-'
// Counts active html2canvas captures — MutationObserver skips scans while > 0
let capturingCount = 0

// ─── Scan result cache ─────────────────────────────────────────────────────────

interface ScanCacheEntry {
  hash: string
  /** componentName → drift violations (serialisable subset) */
  driftMap: Record<string, Array<{ prop: string; value: string; type: DriftViolationType }>>
  tokenViolations: Array<{ prop: string; value: string; type: DriftViolationType; count: number }>
}

function cacheKey(route: string, surfaceMode: boolean): string {
  return `${SCAN_CACHE_PFX}${route}:${surfaceMode ? 'q' : 'f'}`
}

function loadScanCache(route: string, surfaceMode: boolean): ScanCacheEntry | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(route, surfaceMode))
    return raw ? (JSON.parse(raw) as ScanCacheEntry) : null
  } catch { return null }
}

function saveScanCache(route: string, surfaceMode: boolean, entry: ScanCacheEntry): void {
  try { sessionStorage.setItem(cacheKey(route, surfaceMode), JSON.stringify(entry)) } catch {}
}

function clearScanCache(route: string): void {
  try {
    sessionStorage.removeItem(cacheKey(route, true))
    sessionStorage.removeItem(cacheKey(route, false))
  } catch {}
}

// ─── Theme system ─────────────────────────────────────────────────────────────

type Theme  = 'dark' | 'light'
type Colors = typeof THEMES['dark'] | typeof THEMES['light']

const THEMES = {
  dark: {
    green: '#22c55e', red: '#ef4444', yellow: '#f59e0b', blue: '#3b82f6', purple: '#a855f7', orange: '#f59e0b',
    panel:          'rgba(13,16,25,0.97)',
    panelBorder:    'rgba(255,255,255,0.10)',
    text:           '#f1f5f9',
    textSub:        '#b0bdd0',
    muted:          '#8899b0',
    track:          'rgba(255,255,255,0.12)',
    btnBg:          'rgba(255,255,255,0.09)',
    kbdBg:          'rgba(255,255,255,0.10)',
    kbdText:        '#d0dae8',
    divider:        'rgba(255,255,255,0.08)',
    toggleBg:       'rgba(13,16,25,0.82)',
    toggleBgOn:     'rgba(13,16,25,0.96)',
    toggleBorder:   'rgba(255,255,255,0.09)',
    toggleBorderOn: 'rgba(255,255,255,0.14)',
    shadow:         '0 12px 48px rgba(0,0,0,0.6)',
    toggleShadow:   '0 2px 12px rgba(0,0,0,0.3)',
    toggleShadowOn: '0 4px 24px rgba(0,0,0,0.45)',
    pillBg:         'rgba(255,255,255,0.07)',
    promoChipBg:    'rgba(168,85,247,0.15)',
    redChipBg:      'rgba(239,68,68,0.14)',
    inspectBg:      'rgba(59,130,246,0.18)',
    inspectBorder:  '#3b82f6',
  },
  light: {
    green: '#16a34a', red: '#dc2626', yellow: '#b45309', blue: '#2563eb', purple: '#7c3aed', orange: '#d97706',
    panel:          'rgba(253,250,245,0.98)',   // warm cream — stands out from white-bg apps
    panelBorder:    'rgba(120,90,40,0.10)',
    text:           '#1a1207',
    textSub:        '#3d2f1a',
    muted:          '#7a6a55',
    track:          'rgba(120,90,40,0.09)',
    btnBg:          'rgba(120,90,40,0.06)',
    kbdBg:          'rgba(120,90,40,0.07)',
    kbdText:        '#2a1f0f',
    divider:        'rgba(120,90,40,0.08)',
    toggleBg:       'rgba(253,250,245,0.88)',
    toggleBgOn:     'rgba(253,250,245,0.98)',
    toggleBorder:   'rgba(120,90,40,0.13)',
    toggleBorderOn: 'rgba(120,90,40,0.20)',
    shadow:         '0 8px 32px rgba(80,50,10,0.16)',
    toggleShadow:   '0 2px 8px rgba(80,50,10,0.10)',
    toggleShadowOn: '0 4px 16px rgba(80,50,10,0.16)',
    pillBg:         'rgba(120,90,40,0.07)',
    promoChipBg:    'rgba(124,58,237,0.09)',
    redChipBg:      'rgba(220,38,38,0.09)',
    inspectBg:      'rgba(37,99,235,0.10)',
    inspectBorder:  '#2563eb',
  },
} as const

const ThemeCtx = createContext<Colors>(THEMES.dark)
const useC = () => useContext(ThemeCtx)

const coverageColor = (pct: number, C: Colors) =>
  pct >= 75 ? C.green : pct >= 50 ? C.yellow : C.red

// ─── Page history ─────────────────────────────────────────────────────────────

interface HistoryEntry { path: string; pct: number; ds: number; gaps: number; total: number; ts: number }

function loadIgnored(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(IGNORE_KEY) ?? '[]')) } catch { return new Set() }
}
function saveIgnored(s: Set<string>) {
  try { localStorage.setItem(IGNORE_KEY, JSON.stringify([...s])) } catch {}
}

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}
function saveHistory(e: Omit<HistoryEntry, 'ts'>) {
  const updated = [{ ...e, ts: Date.now() }, ...loadHistory().filter(h => h.path !== e.path)].slice(0, HISTORY_MAX)
  try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(updated)) } catch {}
}
function timeAgo(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

// ─── Clipboard report ─────────────────────────────────────────────────────────

function buildReport(components: ScannedComponent[], tokenViolations: TokenViolation[]) {
  const ds   = components.filter(c => c.inDS).length
  const gaps = components.filter(c => !c.inDS).length
  const pct  = components.length ? Math.round((ds / components.length) * 100) : 0
  const gapMap = new Map<string, number>()
  components.filter(c => !c.inDS).forEach(c => gapMap.set(c.name, (gapMap.get(c.name) ?? 0) + 1))
  const gapLines = [...gapMap.entries()].sort((a, b) => b[1] - a[1])
    .map(([n, cnt]) => `  • ${n} ×${cnt}${cnt >= PROMOTE_MIN ? ' ⬆ promote' : ''}`)
  const lines = [
    `DS Coverage — ${window.location.pathname}`,
    `${pct}% (${ds} DS · ${gaps} custom · ${components.length} total)`,
    '', 'Gaps:', ...gapLines,
  ]
  if (tokenViolations.length) {
    lines.push('', `Token violations (${tokenViolations.length} hardcoded colors):`)
    tokenViolations.slice(0, 10).forEach(v => lines.push(`  • ${v.prop}: ${v.value} (×${v.count})`))
  }
  lines.push('', `Generated by DS Coverage · ${new Date().toLocaleString()}`)
  return lines.join('\n')
}

// ─── Markdown report builder ──────────────────────────────────────────────────

function buildMarkdownReport(components: ScannedComponent[], tokenViolations: TokenViolation[]): string {
  const ds    = components.filter(c => c.inDS).length
  const total = components.length
  const pct   = total ? Math.round((ds / total) * 100) : 0
  const icon  = pct >= 75 ? '✅' : pct >= 50 ? '⚠️' : '🔴'

  const gapMap = new Map<string, number>()
  components.filter(c => !c.inDS).forEach(c => gapMap.set(c.name, (gapMap.get(c.name) ?? 0) + 1))
  const gaps = [...gapMap.entries()].sort((a, b) => b[1] - a[1])

  const lines = [
    `## ${icon} Drift Report — \`${window.location.pathname}\``,
    '',
    `| Metric | Value |`,
    `|---|---|`,
    `| DS Coverage | **${pct}%** |`,
    `| DS components | ${ds} |`,
    `| Custom (gaps) | ${total - ds} |`,
    `| Total | ${total} |`,
    `| Token violations | ${tokenViolations.length} |`,
    '',
  ]

  if (gaps.length > 0) {
    lines.push('### Custom components (gaps)')
    lines.push('')
    gaps.forEach(([name, count]) => {
      lines.push(`- \`${name}\` ×${count}${count >= PROMOTE_MIN ? ' ⬆ *consider promoting to DS*' : ''}`)
    })
    lines.push('')
  }

  if (tokenViolations.length > 0) {
    lines.push('### Token violations')
    lines.push('')
    tokenViolations.slice(0, 10).forEach(v => {
      lines.push(`- \`${v.prop}: ${v.value}\` (×${v.count})`)
    })
    lines.push('')
  }

  lines.push(`---`)
  lines.push(`*Generated by Drift · ${new Date().toLocaleString()}*`)
  return lines.join('\n')
}

// ─── PNG drift-map export ─────────────────────────────────────────────────────

/**
 * Captures the real screen using the browser's Screen Capture API, then
 * draws the drift overlay boxes on top — so the PNG shows the actual UI
 * with colour-coded component highlights.
 *
 * Falls back to a schematic dark-background drift map if the user denies
 * the screen-capture permission or the API is unavailable.
 */
async function downloadDriftMapPNG(
  components: ScannedComponent[],
  pct: number,
  _C: typeof THEMES['dark'],
): Promise<void> {
  const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const slug = window.location.pathname.replace(/\//g, '_').replace(/^_/, '') || 'root'

  // ── 1. Attempt real screen capture ────────────────────────────────────────
  let stream: MediaStream | null = null
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
  } catch {
    // User declined or API not available — fall back to schematic
    _schematicDriftMap(components, pct, slug, ts)
    return
  }

  // ── 2. Hide our own overlay so it doesn't appear in the capture ───────────
  const panel  = document.querySelector<HTMLElement>('[data-dd-panel]')
  const toggle = document.querySelector<HTMLElement>('[data-dd-toggle]')
  if (panel)  panel.style.visibility  = 'hidden'
  if (toggle) toggle.style.visibility = 'hidden'

  try {
    // ── 3. Grab one video frame ──────────────────────────────────────────────
    const video = document.createElement('video')
    video.srcObject = stream
    video.muted     = true
    await new Promise<void>(res => {
      video.onloadeddata = () => res()
      video.load()
    })
    await video.play()
    // Brief pause so React has time to remove the hidden panel from paint
    await new Promise(r => setTimeout(r, 150))

    const W = video.videoWidth  || window.innerWidth
    const H = video.videoHeight || window.innerHeight

    const canvas = document.createElement('canvas')
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    stream.getTracks().forEach(t => t.stop())

    // ── 4. Scale factors: capture res may differ from CSS pixel dimensions ──
    const sx = W / window.innerWidth
    const sy = H / window.innerHeight

    // ── 5. Overlay drift boxes ───────────────────────────────────────────────
    for (const c of components) {
      const r = c.rect
      if (r.width <= 0 || r.height <= 0) continue

      const color = c.drifted ? '#f97316' : c.inDS ? '#22c55e' : '#ef4444'

      ctx.fillStyle = color + (c.inDS ? '28' : '1e')
      ctx.fillRect(r.left * sx, r.top * sy, r.width * sx, r.height * sy)

      ctx.strokeStyle = color
      ctx.lineWidth   = c.drifted || !c.inDS ? 2 : 1.5
      ctx.strokeRect(r.left * sx + 0.5, r.top * sy + 0.5, r.width * sx - 1, r.height * sy - 1)

      // Name badge above the box
      const label  = c.name
      const fs     = Math.max(9, Math.round(10 * sx))
      ctx.font     = `600 ${fs}px Inter, sans-serif`
      const tw     = ctx.measureText(label).width
      const bx     = r.left * sx + 3
      const by     = r.top  * sy - 4
      if (by > fs + 2) {
        ctx.fillStyle = color + 'cc'
        ctx.fillRect(bx - 2, by - fs, tw + 8, fs + 4)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(label, bx + 2, by)
      }
    }

    // ── 6. Bottom legend bar ─────────────────────────────────────────────────
    const barH = Math.round(36 * sy)
    ctx.fillStyle = 'rgba(13,16,25,0.86)'
    ctx.fillRect(0, H - barH, W, barH)

    const legendItems = [
      { color: '#22c55e', label: 'DS component' },
      { color: '#f97316', label: 'Drift' },
      { color: '#ef4444', label: 'Custom gap' },
    ]
    const fs2 = Math.max(9, Math.round(10 * sx))
    let lx    = Math.round(16 * sx)
    const ly  = H - Math.round(13 * sy)
    legendItems.forEach(({ color, label }) => {
      ctx.fillStyle = color
      ctx.fillRect(lx, ly - Math.round(9 * sy), Math.round(10 * sx), Math.round(10 * sy))
      ctx.fillStyle = '#d0dae8'
      ctx.font = `${fs2}px Inter, sans-serif`
      ctx.fillText(label, lx + Math.round(14 * sx), ly)
      lx += Math.round(95 * sx)
    })

    const coverColor = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
    ctx.font      = `bold ${fs2}px Inter, sans-serif`
    ctx.fillStyle = coverColor
    ctx.fillText(
      `${pct}% DS coverage · ${window.location.pathname}`,
      W - Math.round(250 * sx), ly,
    )

    // ── 7. Download ──────────────────────────────────────────────────────────
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `drift-screenshot-${slug}-${ts}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    }, 'image/png')

  } finally {
    stream.getTracks().forEach(t => t.stop())
    if (panel)  panel.style.visibility  = ''
    if (toggle) toggle.style.visibility = ''
  }
}

/**
 * Fallback: schematic drift map on a dark canvas — used when getDisplayMedia
 * is denied or unavailable.
 */
function _schematicDriftMap(
  components: ScannedComponent[],
  pct: number,
  slug: string,
  ts: string,
): void {
  const W  = window.innerWidth
  const H  = window.innerHeight
  const PR = Math.min(window.devicePixelRatio ?? 1, 2)

  const canvas = document.createElement('canvas')
  canvas.width  = W * PR
  canvas.height = H * PR
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(PR, PR)

  ctx.fillStyle = '#0d1019'
  ctx.fillRect(0, 0, W, H)

  for (const c of components) {
    const r = c.rect
    if (r.width <= 0 || r.height <= 0) continue
    const color = c.drifted ? '#f97316' : c.inDS ? '#22c55e' : '#ef4444'
    ctx.fillStyle   = color + (c.inDS ? '33' : '22')
    ctx.fillRect(r.left, r.top, r.width, r.height)
    ctx.strokeStyle = color
    ctx.lineWidth   = c.drifted || !c.inDS ? 1.5 : 1
    ctx.strokeRect(r.left + 0.5, r.top + 0.5, r.width - 1, r.height - 1)
    ctx.font      = '500 10px Inter, sans-serif'
    ctx.fillStyle = color
    if (r.top - 3 > 10) ctx.fillText(c.name, r.left + 4, r.top - 3)
  }

  const barH = 40
  ctx.fillStyle = 'rgba(13,16,25,0.92)'
  ctx.fillRect(0, 0, W, barH)
  ctx.font      = 'bold 13px Inter, sans-serif'
  ctx.fillStyle = '#f1f5f9'
  ctx.fillText('Drift (schematic)', 16, 26)
  const coverColor = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
  ctx.fillStyle = coverColor
  ctx.fillText(`${pct}% DS coverage`, 200, 26)
  ctx.font      = '11px Inter, sans-serif'
  ctx.fillStyle = '#8899b0'
  ctx.fillText(window.location.pathname, 360, 26)

  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = `drift-map-${slug}-${ts}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, 'image/png')
}

// ─── Token suggestion maps (value → DS token) ─────────────────────────────────

const COLOR_TOKEN_MAP: Record<string, string> = {
  '#7d52f7': '--ds-color-primary',     '#5d1dd6': '--ds-color-primary-dark',
  '#9b78fa': '--ds-color-primary',     '#7d52f8': '--ds-color-primary',
  '#161616': '--ds-color-text-primary','#f0f0f0': '--ds-color-text-primary',
  '#94a0b8': '--ds-color-text-muted',  '#6b7a99': '--ds-color-text-muted',
  '#ffffff': '--ds-color-white',       '#1a1d26': '--ds-color-surface',
  '#f7f9fb': '--ds-color-surface-subtle','#1e2130': '--ds-color-surface-subtle',
  '#f0f2f8': '--ds-color-surface-muted','#252a38': '--ds-color-surface-muted',
  '#e1e5ef': '--ds-color-border',      '#2e3347': '--ds-color-border',
  '#e02c3b': '--ds-color-error',       '#f04a57': '--ds-color-error',
  '#e02d3c': '--ds-color-error',
  '#fee1e3': '--ds-color-error-light',
  '#08875c': '--ds-color-success',     '#0fa876': '--ds-color-success',
  '#08875d': '--ds-color-success',
  '#f1f3f9': '--ds-color-page-bg',     '#13151e': '--ds-color-page-bg',
  '#f8f9fc': '--ds-color-color-4',     '#f5f0ff': '--ds-color-primary-light',
}

const RADIUS_TOKEN_MAP: Record<string, string> = {
  '4px':   '--ds-border-radius-sm',
  '6px':   '--ds-border-radius-md',
  '8px':   '--ds-border-radius-lg',
  '999px': '--ds-border-radius-full',
  '9999px': '--ds-border-radius-full',
  '50%':    '--ds-border-radius-full',
  '100%':   '--ds-border-radius-full',
}

const SPACING_TOKEN_MAP: Record<string, string> = {
  '4px':  '--ds-spacing-1',
  '8px':  '--ds-spacing-2',
  '12px': '--ds-spacing-3',
  '16px': '--ds-spacing-4',
  '20px': '--ds-spacing-5',
  '24px': '--ds-spacing-6',
  '32px': '--ds-spacing-8',
}

const FONT_SIZE_TOKEN_MAP: Record<string, string> = {
  '12px': '--ds-font-size-sm',
  '14px': '--ds-font-size-base',
  '15px': '--ds-font-size-md',
}

const FONT_WEIGHT_TOKEN_MAP: Record<string, string> = {
  '400': '--ds-font-weight-regular',
  '500': '--ds-font-weight-medium',
  '600': '--ds-font-weight-semibold',
  '700': '--ds-font-weight-bold',
}

function suggestToken(type: DriftViolationType, value: string): string | null {
  const norm = value.trim().toLowerCase()
  if (type === 'color')       return COLOR_TOKEN_MAP[norm]       ? `var(${COLOR_TOKEN_MAP[norm]})`       : null
  if (type === 'radius')      return RADIUS_TOKEN_MAP[norm]      ? `var(${RADIUS_TOKEN_MAP[norm]})`      : null
  if (type === 'spacing')     return SPACING_TOKEN_MAP[norm]     ? `var(${SPACING_TOKEN_MAP[norm]})`     : null
  if (type === 'font-size')   return FONT_SIZE_TOKEN_MAP[norm]   ? `var(${FONT_SIZE_TOKEN_MAP[norm]})`   : null
  if (type === 'font-weight') return FONT_WEIGHT_TOKEN_MAP[norm] ? `var(${FONT_WEIGHT_TOKEN_MAP[norm]})` : null
  return null
}

// ─── Color palette generator (tokven-inspired) ────────────────────────────────
// Takes the raw hardcoded hex values already detected as token violations,
// clusters them by hue into semantic roles, measures WCAG AA contrast, and
// emits ready-to-paste CSS custom properties following the --ds-color-* naming
// convention.  Uses OKLCH-style perceptual grouping without a dependency.

function _hexToRgbNorm(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return null
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
}

function _rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else                h = ((r - g) / d + 4) / 6
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function _wcagContrast(hex: string): number {
  const rgb = _hexToRgbNorm(hex)
  if (!rgb) return 0
  const lin = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  const L = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
  return (1.05) / (L + 0.05) // contrast vs white background
}

interface PaletteEntry {
  hex: string
  hsl: [number, number, number]
  role: string
  tokenName: string
  contrast: number
  wcagAA: boolean
  count: number
}

function buildColorPalette(violations: TokenViolation[]): PaletteEntry[] {
  const seen = new Map<string, number>()
  for (const v of violations) {
    const raw = v.value.trim().toLowerCase()
    if (/^#[0-9a-f]{6}$/.test(raw)) {
      seen.set(raw, (seen.get(raw) ?? 0) + v.count)
    }
  }

  const roleOrder = ['primary', 'secondary', 'success', 'error', 'warning', 'caution', 'info', 'neutral']
  const groups = new Map<string, PaletteEntry[]>(roleOrder.map(r => [r, []]))

  for (const [hex, count] of seen) {
    const rgb = _hexToRgbNorm(hex)
    if (!rgb) continue
    const hsl = _rgbToHsl(...rgb)
    const [h, s] = hsl
    let role = 'neutral'
    if (s >= 8) {
      if (h < 15 || h >= 345)       role = 'error'
      else if (h < 45)              role = 'warning'
      else if (h < 75)              role = 'caution'
      else if (h < 165)             role = 'success'
      else if (h < 225)             role = 'info'
      else if (h < 285)             role = 'primary'
      else                          role = 'secondary'
    }
    const contrast = _wcagContrast(hex)
    const group = groups.get(role) ?? []
    group.push({ hex, hsl, role, tokenName: '', contrast, wcagAA: contrast >= 4.5, count })
    groups.set(role, group)
  }

  const out: PaletteEntry[] = []
  const variants = ['dark', '', 'light', 'subtle', 'muted']
  for (const role of roleOrder) {
    const group = groups.get(role) ?? []
    group.sort((a, b) => a.hsl[2] - b.hsl[2]) // dark → light
    group.forEach((e, i) => {
      const suf = variants[i] ?? `${i}`
      e.tokenName = `--ds-color-${role}${suf ? '-' + suf : ''}`
      out.push(e)
    })
  }
  return out
}

function paletteToCSSVars(entries: PaletteEntry[]): string {
  const lines = [':root {']
  for (const e of entries) {
    const note = e.wcagAA ? 'WCAG AA ✓' : 'low contrast on white'
    lines.push(`  ${e.tokenName}: ${e.hex}; /* ${note} · contrast ${e.contrast.toFixed(1)}:1 */`)
  }
  lines.push('}')
  return lines.join('\n')
}

// ─── DS bootstrap config generator ────────────────────────────────────────────

/**
 * Generates just the component entries to paste into an existing config.ts.
 * Never outputs a full file — avoids accidentally overwriting an existing config.
 */
function generateBootstrapConfig(selected: string[]): string {
  const entries = selected.map(name => `  ${name}: {},`).join('\n')
  return [
    `// Paste these inside the components: { ... } block in your config.ts`,
    `// Add storyPath / figmaLink to each entry as you build them out.`,
    entries,
  ].join('\n')
}

// ─── AI suggestion types + fetcher ───────────────────────────────────────────

// When VITE_AI_PROXY_URL is set, route AI calls through the local proxy server
// instead of calling Anthropic directly from the browser. This keeps the API
// key server-side. Set it in .env: VITE_AI_PROXY_URL=http://localhost:3001
const AI_PROXY_URL: string | undefined = (import.meta.env.VITE_AI_PROXY_URL as string | undefined)

// Optional shared secret sent as Bearer token on every proxy request.
// Must match PROXY_SECRET on the server. Set in .env: VITE_PROXY_SECRET=...
const AI_PROXY_SECRET: string | undefined = (import.meta.env.VITE_PROXY_SECRET as string | undefined)
const DRIFT_FIX_SERVER = 'http://localhost:7779'

/** Build headers for proxy requests — injects Authorization when secret is set. */
function proxyHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (AI_PROXY_SECRET) h['Authorization'] = `Bearer ${AI_PROXY_SECRET}`
  return h
}

/**
 * Read CSS custom properties (design tokens) from the live document stylesheets.
 * Works in any app that loads a variables.css — no hardcoded token list.
 * Falls back to an empty string if nothing is found.
 */
function readLiveTokens(): string {
  const lines: string[] = []
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList
      try { rules = sheet.cssRules } catch { continue } // cross-origin sheet
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule && (rule.selectorText === ':root' || rule.selectorText === 'html')) {
          const style = rule.style
          for (let i = 0; i < style.length; i++) {
            const prop = style[i]
            if (prop.startsWith('--')) {
              lines.push(`${prop}: ${style.getPropertyValue(prop).trim()}`)
            }
          }
        }
      }
    }
  } catch { /* ignore */ }
  return lines.slice(0, 80).join('\n  ') // cap at 80 to keep prompt size sane
}

// ─── AI Context File generator ────────────────────────────────────────────────

type ExportFormat = 'cursorrules' | 'claude' | 'md'

function buildAIContextFile(format: ExportFormat): string {
  const components = Array.from(DS_COMPONENTS).sort()
  const rawTokens  = readLiveTokens()
  const date       = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const componentList = components.map(c => `- ${c}`).join('\n')
  const tokenBlock    = rawTokens
    ? `\`\`\`css\n:root {\n  ${rawTokens}\n}\n\`\`\``
    : '*(no tokens found in live stylesheets)*'

  const rules = [
    'Always use design system components instead of custom HTML elements.',
    'All colors must use CSS variables (var(--ds-color-*)) — never hardcoded hex values.',
    'All spacing and border-radius must use CSS variables (var(--ds-spacing-*), var(--ds-border-radius-*)).',
    'No external CSS files or CSS modules — use inline styles only.',
    'If a required component is missing from the design system, use a Placeholder and file a design request.',
    'Never invent UI from scratch — compose exclusively from the registered components above.',
  ]

  if (format === 'cursorrules') {
    return [
      `# Design System Rules`,
      `# Auto-generated by Drift · ${date}`,
      ``,
      `## Registered components`,
      `Only use these components — never write raw HTML equivalents:`,
      componentList,
      ``,
      `## Rules`,
      rules.map(r => `- ${r}`).join('\n'),
      ``,
      `## Design tokens`,
      tokenBlock,
    ].join('\n')
  }

  if (format === 'claude') {
    return [
      `# Design System — Claude Rules`,
      `> Auto-generated by Drift · ${date}`,
      ``,
      `## Available components`,
      ``,
      `| Component |`,
      `|---|`,
      ...components.map(c => `| \`${c}\` |`),
      ``,
      `## Style rules`,
      ``,
      ...rules.map(r => `- ${r}`),
      ``,
      `## Design tokens`,
      ``,
      tokenBlock,
    ].join('\n')
  }

  // plain .md reference
  return [
    `# Design System Reference`,
    `*Auto-generated by Drift · ${date}*`,
    ``,
    `## Registered components (${components.length})`,
    ``,
    componentList,
    ``,
    `## Coding rules`,
    ``,
    ...rules.map(r => `- ${r}`),
    ``,
    `## Live design tokens`,
    ``,
    tokenBlock,
  ].join('\n')
}

// ─── AI suggestion types + fetcher ────────────────────────────────────────────

type SuggestionStatus = 'idle' | 'loading' | 'done' | 'error'
interface Suggestion { status: SuggestionStatus; text?: string }

async function fetchAISuggestion(
  name: string,
  count: number,
  props: Record<string, unknown>,
  pages: string[],
): Promise<string> {
  if (!AI_PROXY_URL) throw new Error('AI features require VITE_AI_PROXY_URL to be configured.')
  const res = await fetch(`${AI_PROXY_URL}/api/ai/suggest`, {
    method: 'POST',
    headers: proxyHeaders(),
    body: JSON.stringify({
      name, count, pages,
      props: Object.fromEntries(
        Object.entries(props)
          .filter(([k]) => k !== 'children' && typeof props[k] !== 'function')
          .slice(0, 8)
          .map(([k, v]) => [k, fmtProp(k, v)])
      ),
      dsComponents: [...DS_COMPONENTS],
    }),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? `Proxy error ${res.status}`) }
  const data = await res.json()
  return data.text ?? 'No suggestion available.'
}

// ─── Drift fix fetcher ────────────────────────────────────────────────────────

async function fetchDriftFix(
  name: string,
  violations: DriftViolation[],
): Promise<string> {
  if (!AI_PROXY_URL) throw new Error('AI features require VITE_AI_PROXY_URL to be configured.')
  const res = await fetch(`${AI_PROXY_URL}/api/ai/drift-fix`, {
    method: 'POST',
    headers: proxyHeaders(),
    body: JSON.stringify({ name, violations }),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? `Proxy error ${res.status}`) }
  const data = await res.json()
  return data.text ?? '{}'
}

// ─── Page shell generator ─────────────────────────────────────────────────────

async function fetchPageShell(
  description: string,
  selectedComponents: string[],
): Promise<string> {
  if (!AI_PROXY_URL) throw new Error('AI features require VITE_AI_PROXY_URL to be configured.')
  const tokenList = readLiveTokens() || '(no CSS custom properties found)'
  const compList  = selectedComponents.map(c => `  - ${c} (import from './stories/${c}')`).join('\n')

  const prompt =
`You are a React/TypeScript developer building with a custom design system. Generate a complete page shell.

PAGE DESCRIPTION:
${description}

DESIGN SYSTEM COMPONENTS (use only these — never invent new ones):
${compList}

For any UI element the DS doesn't cover, use this Placeholder inline:
  const Placeholder = ({ name }: { name: string }) => (
    <div style={{ padding: '20px 24px', border: '2px dashed var(--ds-color-border)',
      borderRadius: 'var(--ds-border-radius-lg)', fontSize: 13, fontFamily: 'Inter, sans-serif',
      color: 'var(--ds-color-text-muted)' }}>⚠️ Missing component: {name}</div>
  )

ACTIVE DESIGN TOKENS (use these — never hardcode hex/rgb values):
${tokenList}

STRICT RULES:
1. Inline styles only — no className, no CSS modules, no Tailwind
2. All colors: var(--ds-color-*) tokens only
3. All spacing/radius: var(--ds-spacing-*) or var(--ds-border-radius-*) tokens only
4. Export a single default functional component named after the page (e.g. export default function TenantOverviewPage)
5. Include realistic static sample data — no live fetching
6. TypeScript (.tsx), React 18

Output the complete .tsx file only — no markdown fences, no explanation.`

  const res = await fetch(`${AI_PROXY_URL}/api/ai/page-shell`, {
    method: 'POST',
    headers: proxyHeaders(),
    body: JSON.stringify({ description, selectedComponents, prompt }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error ?? `Proxy error ${res.status}`)
  }
  const data = await res.json()
  // Strip any accidental markdown fences the model may still add
  const raw = (data.text ?? '') as string
  return raw.replace(/^```(?:tsx?|jsx?)?\n?/m, '').replace(/\n?```\s*$/m, '').trim()
}

// ─── Badge placement ──────────────────────────────────────────────────────────

const estimateBadgeW = (name: string) => name.length * 7 + 20

function badgeCorner(c: ScannedComponent, yOff: number, color: string) {
  const flipX = c.rect.left + estimateBadgeW(c.name) > window.innerWidth - 4
  // Place badge ABOVE the box by default; flip BELOW if not enough space above
  const spaceAbove = c.rect.top - yOff
  const flipY = spaceAbove < BADGE_H + 4
  return {
    h:      flipX ? { right: 0 } : { left: 0 },
    // Outside the box: negative top = above, positive beyond height = below
    v:      flipY
      ? { top: c.rect.height + yOff }   // below
      : { top: -(BADGE_H + yOff) },     // above
    // Radius: the corner touching the box edge is square, rest rounded
    // CSS: top-left top-right bottom-right bottom-left
    radius: !flipX && !flipY ? '4px 4px 4px 0'   // above-left  → bl=0
          :  flipX && !flipY ? '4px 4px 0 4px'   // above-right → br=0
          : !flipX &&  flipY ? '0 4px 4px 4px'   // below-left  → tl=0
          :                    '4px 0 4px 4px',   // below-right → tr=0
    bg:     color,
  }
}

function computeOffsets(items: ScannedComponent[]): number[] {
  const offsets = new Array(items.length).fill(0)
  const slots   = new Map<string, number>()
  items.forEach((c, i) => {
    const flipX = c.rect.left + estimateBadgeW(c.name) > window.innerWidth - 4
    const ancX  = flipX ? Math.round((window.innerWidth - c.rect.right) / 80) : Math.round(c.rect.left / 80)
    const key   = `${ancX},${Math.round(c.rect.top / BADGE_H)}`
    const used  = slots.get(key) ?? 0
    offsets[i]  = used * BADGE_H
    slots.set(key, used + 1)
  })
  return offsets
}

// ─── Prop formatter ───────────────────────────────────────────────────────────

function fmtProp(key: string, val: unknown): string {
  if (key === 'children') return '…'
  if (typeof val === 'function') return `ƒ ${(val as any).name || 'fn'}()`
  if (React.isValidElement(val)) {
    const t = (val as any).type
    return `<${typeof t === 'string' ? t : (t?.displayName ?? t?.name ?? '?')}>`
  }
  if (val === null || val === undefined) return String(val)
  if (typeof val === 'boolean' || typeof val === 'number') return String(val)
  if (typeof val === 'string') return val.length > 55 ? `"${val.slice(0, 52)}…"` : `"${val}"`
  if (Array.isArray(val)) return `[${val.length}]`
  if (typeof val === 'object') {
    const ks = Object.keys(val as object)
    return `{${ks.slice(0, 4).join(', ')}${ks.length > 4 ? ', …' : ''}}`
  }
  return String(val)
}

// ─── Wave icon (brand mark for Drift) ──────────────────────────────

const WaveIcon = ({ size = 16, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <path d="M1 9 Q4 5, 7 9 Q10 13, 13 9 Q16 5, 19 9"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M1 14 Q4 10, 7 14 Q10 18, 13 14 Q16 10, 19 14"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45" />
  </svg>
)

// Lucide-style Palette icon
const PaletteIcon = ({ size = 16, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M12 22C6.49 22 2 17.51 2 12S6.49 2 12 2s10 4.04 10 9c0 3.31-2.69 6-6 6h-1.77c-.28 0-.5.22-.5.5 0 .12.05.23.13.33.41.47.64 1.06.64 1.67A2.5 2.5 0 0112 22z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="6.5" cy="11.5" r="1.5" fill={color}/>
    <circle cx="8.5" cy="7.5" r="1.5" fill={color}/>
    <circle cx="12" cy="5.5" r="1.5" fill={color}/>
    <circle cx="15.5" cy="7.5" r="1.5" fill={color}/>
    <circle cx="17.5" cy="11.5" r="1.5" fill={color}/>
  </svg>
)

// ─── Individual overlay box ───────────────────────────────────────────────────

const OverlayBox = React.memo(({ c, yOffset, inspectMode, isInspected, isHighlighted, onInspect, isIgnored }: {
  c: ScannedComponent
  yOffset: number
  inspectMode: boolean
  isInspected: boolean
  isHighlighted: boolean
  onInspect: (c: ScannedComponent) => void
  isIgnored?: boolean
}) => {
  const C = useC()
  const storyPath = c.inDS ? DS_STORY_PATHS[c.name] : undefined
  const storyUrl  = storyPath ? `${SB_BASE}/?path=/story/${storyPath}` : undefined
  const figmaUrl  = c.inDS ? (DS_FIGMA_LINKS[c.name] || undefined) : undefined

  const baseColor   = isIgnored ? C.muted : c.drifted ? C.orange : c.inDS ? C.green : C.red
  const outlineColor = (isInspected || isHighlighted) ? C.blue : baseColor
  const bp = badgeCorner(c, yOffset, outlineColor)

  const badgeBase: React.CSSProperties = {
    position: 'absolute', ...bp.h, ...bp.v,
    background: bp.bg, color: '#fff',
    fontSize: 10, fontWeight: 700, fontFamily: 'Inter, sans-serif',
    letterSpacing: 0.2, padding: '2px 6px',
    borderRadius: bp.radius, lineHeight: `${BADGE_H}px`,
    whiteSpace: 'nowrap', zIndex: 99991,
  }

  return (
    // Box itself is always pointer-events:none — inspect capture layer handles clicks
    <div style={{
      position: 'fixed', top: c.rect.top, left: c.rect.left,
      width: c.rect.width, height: c.rect.height,
      outline: `2px solid ${outlineColor}`,
      outlineOffset: '-1px',
      background: isInspected ? 'rgba(59,130,246,0.06)' : isHighlighted ? 'rgba(59,130,246,0.06)' : undefined,
      boxSizing: 'border-box',
      pointerEvents: 'none',
      zIndex: isHighlighted ? 99993 : 99990,
    }}>

      {/* DS badge — Storybook link when not in inspect mode */}
      {c.inDS && (
        <div style={{ ...badgeBase, display: 'flex', alignItems: 'center', gap: 3,
          pointerEvents: inspectMode ? 'none' : 'auto' }}>
          {c.drifted && <span title="Token drift: hardcoded colors override DS tokens">⚠</span>}
          <span style={{ whiteSpace: 'nowrap' }}>{c.name}</span>
          {storyUrl && !inspectMode && !SB_IS_LOCAL && (
            <a href={storyUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              title="Open in Storybook" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, textDecoration: 'none' }}>
              SB↗
            </a>
          )}
          {figmaUrl && !inspectMode && (
            <a href={figmaUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              title="Open in Figma" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, textDecoration: 'none' }}>
              FIG↗
            </a>
          )}
        </div>
      )}

      {/* Gap badge — click to inspect props (outside inspect mode) */}
      {!c.inDS && (
        <div
          data-dd-gap-badge
          onClick={inspectMode ? undefined : e => { e.stopPropagation(); onInspect(c) }}
          title={inspectMode ? c.name : 'Click to inspect props'}
          style={{ ...badgeBase, fontFamily: 'monospace',
            pointerEvents: inspectMode ? 'none' : 'auto',
            cursor: inspectMode ? 'default' : 'pointer' }}
        >
          {c.name}
        </div>
      )}
    </div>
  )
})

// ─── Props inspector panel + chat ────────────────────────────────────────────
// Parses ```lang\n...\n``` blocks out of a response and renders them with a
// one-click copy button. Plain paragraphs are rendered as normal text.

interface ChatMsg { role: 'user' | 'assistant' | 'error'; content: string }

function ChatBubble({ msg, C }: { msg: ChatMsg; C: Colors }) {
  const isUser = msg.role === 'user'
  const isErr  = msg.role === 'error'

  // Split on fenced code blocks
  const parts = msg.content.split(/(```[\s\S]*?```)/g)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      {parts.map((part, i) => {
        const codeMatch = part.match(/^```(\w*)\n?([\s\S]*?)```$/)
        if (codeMatch) {
          const code = codeMatch[2].trimEnd()
          return (
            <CodeBlock key={i} code={code} C={C} />
          )
        }
        const text = part.trim()
        if (!text) return null
        return (
          <div key={i} style={{
            maxWidth: '92%',
            padding: isUser ? '7px 11px' : '0',
            background: isUser ? C.blue : 'transparent',
            borderRadius: isUser ? '12px 12px 4px 12px' : 0,
            fontSize: 12, lineHeight: 1.55,
            color: isUser ? '#fff' : isErr ? C.red : C.text,
          }}>
            {text}
          </div>
        )
      })}
    </div>
  )
}

function CodeBlock({ code, C }: { code: string; C: Colors }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(code) } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div style={{
      position: 'relative', width: '100%', marginTop: 4, marginBottom: 4,
      background: C.kbdBg, borderRadius: 8,
      border: `1px solid ${C.panelBorder}`,
    }}>
      <pre style={{
        margin: 0, padding: '10px 36px 10px 10px',
        fontSize: 10, lineHeight: 1.6, fontFamily: 'monospace',
        color: C.text, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        overflowX: 'auto',
      }}>{code}</pre>
      <button onClick={copy} title="Copy code" style={{
        position: 'absolute', top: 6, right: 6,
        background: copied ? `${C.green}20` : C.btnBg,
        border: `1px solid ${copied ? C.green : C.panelBorder}`,
        borderRadius: 4, padding: '4px 6px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {copied
          ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          : <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="4" y="1" width="7" height="8" rx="1" stroke={C.muted} strokeWidth="1.2"/><rect x="1" y="3" width="7" height="8" rx="1" stroke={C.muted} strokeWidth="1.2" fill={C.kbdBg}/></svg>
        }
      </button>
    </div>
  )
}

// ─── Brand icons ──────────────────────────────────────────────────────────────

const FigmaIcon = ({ size = 18 }: { size?: number }) => (
  <img src={figmaLogoUrl} alt="Figma" width={size * (2/3)} height={size} style={{ display: 'block', objectFit: 'contain' }} />
)

const JiraIcon = ({ size = 18 }: { size?: number }) => (
  <img src={jiraLogoUrl} alt="Jira" width={size} height={size} style={{ display: 'block', objectFit: 'contain' }} />
)

// ─── Gap action panel (replaces "No props" for non-DS components) ─────────────

interface CapturedStyles {
  width: number; height: number
  backgroundColor: string; color: string
  padding: string; borderRadius: string
  fontSize: string; fontWeight: string
  display: string; flexDirection: string; gap: string
  border: string; boxShadow: string
}

function extractStyles(el: Element): CapturedStyles {
  const s = window.getComputedStyle(el)
  const rect = el.getBoundingClientRect()
  return {
    width:           Math.round(rect.width),
    height:          Math.round(rect.height),
    backgroundColor: s.backgroundColor,
    color:           s.color,
    padding:         s.padding,
    borderRadius:    s.borderRadius,
    fontSize:        s.fontSize,
    fontWeight:      s.fontWeight,
    display:         s.display,
    flexDirection:   s.flexDirection,
    gap:             s.gap,
    border:          s.border,
    boxShadow:       s.boxShadow,
  }
}

function buildFigmaMcpPrompt(name: string, styles: CapturedStyles | null, screenshotDataUrl: string | null): string {
  const styleBlock = styles ? `
Measured from the live rendered component:
  - Size:             ${styles.width}px × ${styles.height}px
  - Background:       ${styles.backgroundColor}
  - Text color:       ${styles.color}
  - Padding:          ${styles.padding}
  - Border radius:    ${styles.borderRadius}
  - Font:             ${styles.fontSize} / weight ${styles.fontWeight}
  - Layout:           display: ${styles.display}${styles.display === 'flex' ? `, flex-direction: ${styles.flexDirection}, gap: ${styles.gap}` : ''}
  - Border:           ${styles.border !== 'none' ? styles.border : 'none'}
  - Shadow:           ${styles.boxShadow !== 'none' ? styles.boxShadow : 'none'}` : ''

  const screenshotNote = screenshotDataUrl
    ? `\nA screenshot of the rendered component is attached — use it as the visual reference.\n`
    : ''

  return `Using the Figma MCP, create a new component called "${name}" in our design file.
${screenshotNote}${styleBlock}

Instructions:
1. Navigate to the component library page in the Figma file
2. Create a new component frame named "${name}" with the exact dimensions above
3. Recreate the visual layout using the measured styles as a starting point
4. Replace raw CSS values with the nearest design tokens:
   - Map background/text colors → ds-color-* variables
   - Map padding/gap values → ds-spacing-* tokens (8px grid)
   - Map border-radius → ds-border-radius-* tokens
5. Add component description: "Promoted from Drift — was a custom gap component"
6. Publish to the component library

After Figma is done:
- Implement the component in your design system component directory
- Add a Storybook story so it appears in the catalog
- Register it in your Drift config.ts so it gets tracked`
}

function buildJiraTicket(component: ScannedComponent, styles: CapturedStyles | null): string {
  const name = component.name
  const sizeNote = styles ? ` (${styles.width}×${styles.height}px, detected live)` : ''

  if (!component.inDS) {
    // Gap component — design request
    return `Summary: [Design System] Promote ${name} to DS component

Type: Design Task
Priority: Medium
Labels: design-system, drift, needs-design

Description:
Drift detected \`${name}\`${sizeNote} as a custom component not in the design system.
It is rendering as a one-off and should be promoted to a proper DS component.

Measured styles (from live render):
${styles ? `  background: ${styles.backgroundColor}
  color: ${styles.color}
  size: ${styles.width}×${styles.height}px
  padding: ${styles.padding}
  border-radius: ${styles.borderRadius}` : '  (attach screenshot)'}

Steps:
1. Design \`${name}\` in Figma using DS tokens and the measured values above
2. Implement in your component library
3. Add a Storybook story
4. Register in your Drift config.ts
5. Verify Drift coverage improves on next PR scan

Acceptance Criteria:
- [ ] Designed in Figma with proper DS tokens
- [ ] Storybook story added and published
- [ ] Registered in Drift — coverage delta confirmed in PR comment
- [ ] drift-check CI passes`
  }

  if (component.drifted) {
    // DS component with token violations — tech debt ticket
    const violations = component.driftViolations ?? []
    const violationList = violations.slice(0, 8).map(v => `  - \`${v.prop}: ${v.value}\``).join('\n')
    return `Summary: [Token Fix] Replace hardcoded styles in ${name}

Type: Tech Debt
Priority: Medium
Labels: design-system, drift, token-violation

Description:
Drift detected \`${name}\` is a DS component but has ${violations.length} hardcoded style value${violations.length !== 1 ? 's' : ''} that should use design tokens.

Hardcoded values to fix:
${violationList || '  (run Drift scan for full list)'}

Steps:
1. Open the \`${name}\` component file
2. Replace each hardcoded value with the nearest DS token (var(--ds-color-*), var(--ds-spacing-*))
3. Verify visually and re-run Drift scan
4. PR should show token violations count drop to 0

Acceptance Criteria:
- [ ] All listed hardcoded values replaced with CSS variables
- [ ] Drift scan shows 0 token violations for ${name}
- [ ] PR passes drift-check CI`
  }

  // DS component in good standing — general tracking ticket
  return `Summary: [Design Review] Track changes to ${name}

Type: Design Task
Priority: Low
Labels: design-system, drift

Description:
\`${name}\` is a design system component${sizeNote}. This ticket is for tracking any proposed changes, reviews, or documentation updates.

Component details:
${styles ? `  size: ${styles.width}×${styles.height}px
  background: ${styles.backgroundColor}` : '  (attach screenshot)'}

Notes:
- Any visual changes should go through the design review process
- Update Storybook story after changes
- Re-run Drift scan to confirm coverage is maintained`
}

const GapActionPanel = ({ component }: { component: ScannedComponent }) => {
  const C = useC()
  const [captureState, setCaptureState] = useState<'idle' | 'capturing' | 'ready'>('idle')
  const [screenshot, setScreenshot]     = useState<string | null>(null)
  const [styles, setStyles]             = useState<CapturedStyles | null>(null)
  const [copied, setCopied]             = useState<'figma' | 'jira' | null>(null)
  const [showPreview, setShowPreview]   = useState(false)

  const capture = useCallback(async () => {
    const el = component.element as HTMLElement | null
    if (!el) return
    setCaptureState('capturing')
    capturingCount++
    try {
      const extracted = extractStyles(el)
      setStyles(extracted)
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      })
      setScreenshot(canvas.toDataURL('image/png'))
      setCaptureState('ready')
      setShowPreview(true)
    } catch {
      setCaptureState('ready') // still show prompt with styles even if screenshot fails
    } finally {
      capturingCount--
    }
  }, [component.element])

  // Auto-capture on mount
  useEffect(() => {
    capture()
  }, [capture])

  const copy = (text: string, type: 'figma' | 'jira') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 2200)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 16px 12px', borderTop: `1px solid ${C.panelBorder}` }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>
        Not in the design system — choose how to track it:
      </div>

      {/* Screenshot preview */}
      {captureState === 'capturing' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', fontSize: 11, color: C.muted }}>
          <span style={{ animation: 'dd-spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
          Capturing component…
        </div>
      )}
      {screenshot && showPreview && (
        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.panelBorder}` }}>
          <img src={screenshot} alt={component.name} style={{ width: '100%', display: 'block', maxHeight: 140, objectFit: 'cover', objectPosition: 'top' }} />
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.55)', borderRadius: 4, padding: '2px 6px',
            fontSize: 10, color: '#fff', fontFamily: 'Inter, sans-serif',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ opacity: 0.7 }}>live capture</span>
            <button
              onClick={() => { const a = document.createElement('a'); a.href = screenshot!; a.download = `${component.name}.png`; a.click() }}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontSize: 10, opacity: 0.8 }}
              title="Download screenshot"
            >⬇</button>
          </div>
          {styles && (
            <div style={{
              padding: '6px 10px',
              background: C.panel,
              fontSize: 10, color: C.muted, fontFamily: 'monospace',
              display: 'flex', gap: 12, flexWrap: 'wrap',
            }}>
              <span>{styles.width}×{styles.height}px</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: styles.backgroundColor, border: `1px solid ${C.panelBorder}`, display: 'inline-block' }} />
                bg
              </span>
              <span>r:{styles.borderRadius}</span>
              <span>p:{styles.padding}</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {([
        {
          key: 'figma' as const,
          Icon: () => <FigmaIcon size={16} />,
          label: 'Create in Figma',
          sub: captureState === 'ready' ? 'Prompt includes live dimensions + colors' : 'Copy MCP prompt → paste into Cursor or Claude',
          color: '#7c3aed',
          bg: 'rgba(124,58,237,0.08)',
          border: 'rgba(124,58,237,0.25)',
          text: () => buildFigmaMcpPrompt(component.name, styles, screenshot),
        },
        {
          key: 'jira' as const,
          Icon: () => <JiraIcon size={16} />,
          label: 'Create Jira ticket',
          sub: captureState === 'ready' ? 'Includes measured size + colors for the UX brief' : 'Copy pre-filled design request for your UX team',
          color: '#2684FF',
          bg: 'rgba(38,132,255,0.08)',
          border: 'rgba(38,132,255,0.25)',
          text: () => buildJiraTicket(component, styles),
        },
      ] as const).map(a => (
        <button
          key={a.key}
          onClick={() => copy(a.text(), a.key)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
            background: copied === a.key ? a.bg : 'transparent',
            border: `1px solid ${copied === a.key ? a.border : C.panelBorder}`,
            textAlign: 'left', width: '100%',
            transition: 'all 0.15s',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
          onMouseEnter={e => { if (copied !== a.key) { (e.currentTarget as HTMLButtonElement).style.background = a.bg; (e.currentTarget as HTMLButtonElement).style.borderColor = a.border } }}
          onMouseLeave={e => { if (copied !== a.key) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = C.panelBorder } }}
        >
          <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><a.Icon /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: copied === a.key ? a.color : C.text }}>
              {copied === a.key ? '✓ Copied to clipboard' : a.label}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{a.sub}</div>
          </div>
          <span style={{ fontSize: 10, color: a.color, flexShrink: 0, opacity: 0.7 }}>copy</span>
        </button>
      ))}
    </div>
  )
}

const ComponentActionsBar = ({ component }: { component: ScannedComponent }) => {
  const C = useC()
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [styles, setStyles]         = useState<CapturedStyles | null>(null)
  const [capturing, setCapturing]   = useState(true)
  const [jiraCopied, setJiraCopied] = useState(false)
  const [expanded, setExpanded]     = useState(false)

  useEffect(() => {
    const el = component.element as HTMLElement | null
    if (!el) { setCapturing(false); return }
    const extracted = extractStyles(el)
    setStyles(extracted)
    capturingCount++
    html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null, logging: false })
      .then(canvas => { setScreenshot(canvas.toDataURL('image/png')); setCapturing(false) })
      .catch(() => setCapturing(false))
      .finally(() => { capturingCount-- })
  }, [component.element])

  const copyJira = () => {
    const text = buildJiraTicket(component, styles)
    navigator.clipboard.writeText(text).then(() => {
      setJiraCopied(true)
      setTimeout(() => setJiraCopied(false), 2200)
    })
  }

  return (
    <div style={{ borderTop: `1px solid ${C.panelBorder}`, paddingTop: 10, marginTop: 8, padding: '10px 16px 0' }}>
      {/* Screenshot thumbnail */}
      {capturing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.muted, marginBottom: 8 }}>
          <span style={{ animation: 'dd-spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
          Capturing…
        </div>
      )}
      {screenshot && (
        <div style={{ position: 'relative', borderRadius: 7, overflow: 'hidden', border: `1px solid ${C.panelBorder}`, marginBottom: 8 }}>
          <img
            src={screenshot}
            alt={component.name}
            style={{ width: '100%', display: 'block', maxHeight: expanded ? 300 : 90, objectFit: 'cover', objectPosition: 'top', cursor: 'pointer' }}
            onClick={() => setExpanded(v => !v)}
            title={expanded ? 'Click to collapse' : 'Click to expand'}
          />
          <div style={{
            position: 'absolute', top: 5, right: 5,
            background: 'rgba(0,0,0,0.55)', borderRadius: 4, padding: '2px 6px',
            fontSize: 10, color: '#fff', fontFamily: 'Inter, sans-serif',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ opacity: 0.7 }}>live</span>
            <button
              onClick={e => { e.stopPropagation(); const a = document.createElement('a'); a.href = screenshot!; a.download = `${component.name}.png`; a.click() }}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontSize: 10, opacity: 0.8 }}
              title="Download"
            >⬇</button>
          </div>
          {styles && (
            <div style={{ padding: '4px 8px', background: C.panel, fontSize: 10, color: C.muted, fontFamily: 'monospace', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span>{styles.width}×{styles.height}px</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: styles.backgroundColor, border: `1px solid ${C.panelBorder}`, display: 'inline-block' }} />bg
              </span>
              <span>r:{styles.borderRadius}</span>
            </div>
          )}
        </div>
      )}

      {/* Jira button — always shown */}
      <button
        onClick={copyJira}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
          background: jiraCopied ? 'rgba(38,132,255,0.10)' : 'transparent',
          border: `1px solid ${jiraCopied ? 'rgba(38,132,255,0.35)' : C.panelBorder}`,
          textAlign: 'left', fontFamily: 'Inter, system-ui, sans-serif',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!jiraCopied) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(38,132,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(38,132,255,0.30)' } }}
        onMouseLeave={e => { if (!jiraCopied) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = C.panelBorder } }}
      >
        <img src={jiraLogoUrl} alt="Jira" width={15} height={15} style={{ display: 'block', objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: jiraCopied ? '#2684FF' : C.text }}>
            {jiraCopied ? '✓ Copied to clipboard' : 'Create Jira ticket'}
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
            {component.inDS && !component.drifted ? 'General design review ticket' : component.drifted ? 'Token fix ticket' : 'Design request ticket'}
          </div>
        </div>
        <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>copy</span>
      </button>
    </div>
  )
}

const PropsPanel = ({ component, onClose }: { component: ScannedComponent; onClose: () => void }) => {
  const C       = useC()
  const props   = component.fiber?.memoizedProps ?? {}
  const entries = Object.entries(props).filter(([k]) => k !== 'children')

  const hasAction = component.drifted || !component.inDS

  // ── Structured fix state ──────────────────────────────────────────────────
  const [fixResponse,  setFixResponse]  = useState<string | null>(null)
  const [fixError,     setFixError]     = useState<string | null>(null)
  const [sending,      setSending]      = useState(false)
  const [copiedToast,  setCopiedToast]  = useState(false)
  const [fixTitle,     setFixTitle]     = useState('')

  useEffect(() => {
    setFixResponse(null)
    setFixError(null)
    setSending(false)
    setCopiedToast(false)
  }, [component.name])

  const firePrompt = async (userText: string, title: string) => {
    if (sending) return
    setSending(true)
    setFixTitle(title)
    setFixResponse(null)
    setFixError(null)

    // In demo mode (or when server isn't running), copy prompt to clipboard
    if (IS_DEMO) {
      try { await navigator.clipboard.writeText(userText) } catch {}
      setCopiedToast(true)
      setTimeout(() => setCopiedToast(false), 2500)
      setSending(false)
      return
    }

    const payload = {
      type: title.startsWith('Fix all') ? 'fix-all' : 'fix-one',
      component: component.name,
      prompt: userText,
      violations: component.driftViolations ?? [],
      route: window.location.pathname,
    }

    try {
      const res = await fetch(`${DRIFT_FIX_SERVER}/drift-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setFixResponse('✓ Fix queued! In Claude Code, say: **"apply drift fixes"**\n\nDrift will rescan automatically after the file saves.')
      } else {
        throw new Error(`Server responded ${res.status}`)
      }
    } catch {
      // Server not running — fall back to clipboard
      try { await navigator.clipboard.writeText(userText) } catch {}
      setCopiedToast(true)
      setTimeout(() => setCopiedToast(false), 2500)
    } finally {
      setSending(false)
    }
  }

  const clearFix = () => { setFixResponse(null); setFixError(null); setSending(false) }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden',
      fontFamily: 'Inter, sans-serif', color: C.text,
    }}>
      {/* ── Breadcrumb header ──────────────────────────────────────────── */}
      <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, color: C.muted, fontFamily: 'Inter, sans-serif',
          marginBottom: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Overview
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{component.name}</div>
            <div style={{ fontSize: 10, marginTop: 3,
              color: component.drifted ? C.orange : component.inDS ? C.green : C.red }}>
              {component.drifted
                ? '● In design system — style overrides'
                : component.inDS ? '● In design system' : '● Not in design system'}
            </div>
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: C.panelBorder, margin: '10px 0 0', flexShrink: 0 }} />

      {/* Clipboard toast — transient, no persistent area */}
      {copiedToast && (
        <div style={{
          flexShrink: 0, padding: '8px 16px',
          background: `${C.green}14`, borderTop: `1px solid ${C.green}30`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>Fix prompt copied — paste into Claude Code or Cursor</span>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>

        {/* ── Fix response view — replaces violations while open ────── */}
        {(sending || fixResponse !== null || fixError !== null) && (
          <div style={{ marginBottom: 12 }}>
            {/* Response header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button
                onClick={clearFix}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: C.muted, fontFamily: 'Inter, sans-serif',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to issues
              </button>
              {!sending && (
                <button
                  onClick={clearFix}
                  title="Dismiss"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: C.muted, display: 'flex', alignItems: 'center',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 8 }}>
              {fixTitle}
            </div>
            {/* Loading state */}
            {sending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
                <div style={{
                  width: 14, height: 14, flexShrink: 0,
                  border: `2px solid ${C.blue}30`, borderTopColor: C.blue,
                  borderRadius: '50%', animation: 'dd-spin 0.7s linear infinite',
                }} />
                <span style={{ fontSize: 11, color: C.muted }}>Claude is thinking…</span>
              </div>
            )}
            {/* Error */}
            {fixError && (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: `${C.red}10`, border: `1px solid ${C.red}20`,
                fontSize: 11, color: C.red,
              }}>{fixError}</div>
            )}
            {/* Response — render inline, full height, no scroll cap */}
            {fixResponse !== null && (
              <>
                <ChatBubble msg={{ role: 'assistant', content: fixResponse }} C={C} />
              </>
            )}
          </div>
        )}

        {/* Style overrides — grouped by value, plain-English descriptions */}
        {component.drifted && component.driftViolations.length > 0 && (() => {
          // Group violations by type + value so e.g. all four border-radius props
          // with the same value collapse into one row instead of four.
          type GroupedV = { type: DriftViolationType; value: string; props: string[] }
          const grouped = Object.values(
            component.driftViolations.reduce<Record<string, GroupedV>>((acc, v) => {
              const key = `${v.type}||${v.value}`
              if (!acc[key]) acc[key] = { type: v.type, value: v.value, props: [] }
              acc[key].props.push(v.prop)
              return acc
            }, {})
          )

          const describe = (type: DriftViolationType, value: string, props: string[]) => {
            if (type === 'radius') {
              const n = props.length
              if (n >= 4) return `All corners set to ${value}`
              if (n === 3) return `3 corners set to ${value}`
              if (n === 2) return `2 corners set to ${value}`
              const corner = props[0].replace('border-', '').replace('-radius', '').replace(/-/g, ' ')
              return `${corner} corner set to ${value}`
            }
            if (type === 'spacing') {
              const prop = props[0].replace(/([A-Z])/g, '-$1').toLowerCase()
              return `Hardcoded ${prop}: ${value}`
            }
            if (type === 'font-size')   return `Hardcoded font-size: ${value}`
            if (type === 'font-weight') return `Hardcoded font-weight: ${value}`
            // color
            if (props.some(p => p === 'color' || p === 'fill' || p === 'stroke')) return `Text / icon color`
            if (props.some(p => p === 'background-color' || p === 'background')) return `Background color`
            if (props.some(p => p.includes('border'))) return `Border color`
            return `Color`
          }

          const fixAllPrompt = `Fix all ${grouped.length} style override${grouped.length !== 1 ? 's' : ''} in \`${component.name}\` by replacing each hardcoded value with the correct design token:\n` +
            grouped.map(g => `• ${describe(g.type, g.value, g.props)}: ${g.value}${suggestToken(g.type, g.value) ? ` → ${suggestToken(g.type, g.value)}` : ''}`).join('\n')

          return (
            <div style={{ marginBottom: 14 }}>
              {/* Section header + Fix all */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.orange }}>
                  Style overrides — {grouped.length} issue{grouped.length !== 1 ? 's' : ''}
                </div>
                {hasAction && (
                  <button
                    onClick={() => firePrompt(fixAllPrompt, `Fix all ${grouped.length} issues`)}
                    disabled={sending}
                    title={IS_DEMO ? 'Copies fix prompt to clipboard — paste into Claude Code or Cursor' : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 700, padding: '4px 11px',
                      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      color: '#fff', border: 'none', borderRadius: 7,
                      cursor: sending ? 'default' : 'pointer',
                      fontFamily: 'Inter, sans-serif', opacity: sending ? 0.55 : 1,
                      boxShadow: sending ? 'none' : '0 2px 8px rgba(124,58,237,0.35)',
                      transition: 'opacity 0.15s, box-shadow 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 11 }}>✦</span> Fix all
                  </button>
                )}
              </div>
              {grouped.map((g, i) => {
                const label      = describe(g.type, g.value, g.props)
                const suggestion = suggestToken(g.type, g.value)
                const fixOnePrompt = `Fix \`${component.name}\`: replace the hardcoded ${g.type} value \`${g.value}\` (${label.toLowerCase()}) with the correct design token.${suggestion ? ` Use \`${suggestion}\`.` : ''}`
                return (
                  <div
                    key={i}
                    style={{
                      marginBottom: 6,
                      background: C.panel,
                      border: `1px solid ${C.panelBorder}`,
                      borderRadius: 8,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Card body */}
                    <div style={{ padding: '10px 12px' }}>
                      {/* Title row: label + value pill */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          {g.type === 'color' && (
                            <div style={{
                              width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                              background: g.value, border: '1px solid rgba(0,0,0,0.12)',
                            }} />
                          )}
                          {g.type === 'spacing' && (
                            <span style={{ fontSize: 11, color: C.orange }}>↔</span>
                          )}
                          {g.type === 'font-size' && (
                            <span style={{ fontSize: 11, color: C.orange }}>T</span>
                          )}
                          {g.type === 'font-weight' && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.orange }}>W</span>
                          )}
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</span>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
                          color: C.orange, background: `${C.orange}14`,
                          padding: '2px 8px', borderRadius: 4, flexShrink: 0,
                        }}>{g.value}</span>
                      </div>
                      {/* Suggestion or fallback */}
                      <div style={{ marginTop: 6 }}>
                        {suggestion ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, color: C.green }}>→ Replace with</span>
                            <span style={{
                              fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
                              color: C.green, background: `${C.green}14`,
                              padding: '1px 6px', borderRadius: 4,
                            }}>{suggestion}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 10, color: C.muted }}>Not in your design tokens</div>
                        )}
                      </div>
                    </div>
                    {/* Card footer — Fix button */}
                    {hasAction && (
                      <div style={{
                        borderTop: `1px solid ${C.panelBorder}`,
                        padding: '7px 12px',
                        background: 'rgba(124,58,237,0.04)',
                      }}>
                        <button
                          onClick={() => firePrompt(fixOnePrompt, label)}
                          disabled={sending}
                          title={IS_DEMO ? 'Copies fix prompt to clipboard — paste into Claude Code or Cursor' : undefined}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 10, fontWeight: 700,
                            background: 'none', border: 'none', padding: 0,
                            color: '#7c3aed',
                            cursor: sending ? 'default' : 'pointer',
                            fontFamily: 'Inter, sans-serif', opacity: sending ? 0.5 : 1,
                          }}
                        >
                          <span style={{ fontSize: 11 }}>✦</span> Fix this
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Component props */}
        {entries.length > 0 && (
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 8 }}>
            Props
          </div>
        )}
        {entries.length === 0 && !component.drifted && component.inDS && (
          <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '12px 0 4px' }}>No props</div>
        )}
        {entries.map(([key, val]) => (
          <div key={key} style={{
            display: 'flex', gap: 8, padding: '6px 0',
            borderBottom: `1px solid ${C.divider}`, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 11, color: C.blue, fontFamily: 'monospace', fontWeight: 600, flexShrink: 0, minWidth: 90 }}>{key}</span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', color: C.text, opacity: 0.85 }}>{fmtProp(key, val)}</span>
          </div>
        ))}
        {props.children !== undefined && (
          <div style={{ marginTop: 8, fontSize: 10, color: C.muted, fontStyle: 'italic' }}>children omitted</div>
        )}
      </div>

      {component.inDS ? <ComponentActionsBar component={component} /> : <GapActionPanel component={component} />}

      <div style={{ padding: '8px 16px', borderTop: `1px solid ${C.panelBorder}`, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: C.muted }}>Hover · click to inspect · Esc to close</div>
      </div>
    </div>
  )
}

// ─── Shared bars ──────────────────────────────────────────────────────────────

const MiniBar = ({ pct, width = 36 }: { pct: number; width?: number }) => {
  const C = useC()
  return (
    <div style={{ width, height: 4, borderRadius: 2, background: C.track, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: coverageColor(pct, C), borderRadius: 2, transition: 'width 0.3s' }} />
    </div>
  )
}

const CoverageBar = ({ pct, barColor }: { pct: number; barColor?: string }) => {
  const C = useC()
  return (
    <div style={{ height: 6, borderRadius: 3, background: C.track, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: barColor ?? coverageColor(pct, C), borderRadius: 3, transition: 'width 0.3s ease' }} />
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'drift' | 'tokens' | 'history'

const TabBar = ({ active, onChange, tokenCount, promoteCount, driftCount }: {
  active: Tab; onChange: (t: Tab) => void; tokenCount: number; promoteCount: number; driftCount: number
}) => {
  const C = useC()
  const tab = (id: Tab, label: string, badge?: number, badgeColor?: string) => (
    <button key={id} onClick={() => onChange(id)} style={{
      flex: 1, height: 34, background: 'none', border: 'none',
      borderBottom: `2px solid ${active === id ? C.blue : 'transparent'}`,
      color: active === id ? C.text : C.muted,
      fontSize: 10, fontWeight: active === id ? 700 : 500, fontFamily: 'Inter, sans-serif',
      cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      letterSpacing: 0.2, whiteSpace: 'nowrap',
    }}>
      {label}
      {!!badge && badge > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 10,
          background: badgeColor ?? C.btnBg, color: badgeColor ? '#fff' : C.muted, lineHeight: '15px',
        }}>{badge}</span>
      )}
    </button>
  )

  return (
    <div style={{ display: 'flex', marginBottom: 0 }}>
      {tab('overview', 'Overview',      promoteCount, promoteCount > 0 ? '#a855f7' : undefined)}
      {tab('drift',    'Modifications', driftCount,   driftCount > 0 ? '#f97316' : undefined)}
      {tab('tokens',   'Style issues',  tokenCount,   tokenCount > 0 ? '#ef4444' : undefined)}
      {tab('history',  'History')}
    </div>
  )
}

// ─── Summary panel ────────────────────────────────────────────────────────────

interface PanelProps {
  components: ScannedComponent[]
  tokenViolations: TokenViolation[]
  history: HistoryEntry[]
  scanned: boolean; scanning: boolean; isCached: boolean
  filter: 'all' | 'gaps'
  gapFilter: string
  surfaceMode: boolean; inspectMode: boolean
  theme: Theme
  hoveredGap: string | null
  suggestions: Record<string, Suggestion>
  driftFixes: Record<string, Suggestion>
  onFilterChange: (f: 'all' | 'gaps') => void
  onGapFilterChange: (s: string) => void
  onRescan: () => void
  onToggleSurface: () => void
  onToggleInspect: () => void
  onToggleTheme: () => void
  hoveredViolation: TokenViolation | null
  onHoverGap: (name: string | null) => void
  onHoverViolation: (v: TokenViolation | null) => void
  onInspect: (c: ScannedComponent) => void
  onSuggest: (name: string, count: number, props: Record<string, unknown>) => void
  onDriftFix: (name: string, violations: DriftViolation[]) => void
  onClose: () => void
  promotedComponents: Set<string>
  onPromote: (name: string, count: number) => void
  onOpenWaitlist?: () => void
  ignored: Set<string>
  onApproveGap: (name: string) => void
  onUnapproveGap: (name: string) => void
  registryValidated: boolean | null
}

const SummaryPanel = (p: PanelProps) => {
  const C                    = useC()
  const { promotedComponents, onPromote, registryValidated } = p
  const [tab,        setTab]       = useState<Tab>('overview')
  const [exported,   setExported]  = useState(false)
  const [mdCopied,   setMdCopied]  = useState(false)
  const [pngBusy,    setPngBusy]   = useState(false)
  const [settingsPage, setSettingsPage] = useState(false)
  const [hoveredRow,       setHoveredRow]       = useState<string | null>(null)
  // Palette generator
  const [palette,       setPalette]      = useState<PaletteEntry[] | null>(null)
  const [paletteCopied, setPaletteCopied]= useState(false)
  // Bootstrap / register page
  const [bootstrapPage,    setBootstrapPage]    = useState(false)
  const [bootstrapSelected,setBootstrapSelected]= useState<Set<string>>(new Set())
  const [bootstrapCopied,  setBootstrapCopied]  = useState(false)
  // AI context file export
  const [exportPage,     setExportPage]     = useState(false)
  const [exportFormat,   setExportFormat]   = useState<ExportFormat>('cursorrules')
  const [exportCopied,   setExportCopied]   = useState(false)
  // Page shell generator
  const [generatePage,   setGeneratePage]   = useState(false)
  const [genDesc,        setGenDesc]        = useState('')
  const [genLoading,     setGenLoading]     = useState(false)
  const [genOutput,      setGenOutput]      = useState<string | null>(null)
  const [genError,       setGenError]       = useState<string | null>(null)
  const [genCopied,      setGenCopied]      = useState(false)

  // Ignored (approved) gaps count as DS for coverage purposes — they're known, intentional
  const dsCount      = p.components.filter(c => c.inDS || p.ignored.has(c.name)).length
  const driftedCount = p.components.filter(c => c.drifted).length
  const gapCount     = p.components.filter(c => !c.inDS && !p.ignored.has(c.name)).length
  const ignoredCount = p.components.filter(c => !c.inDS && p.ignored.has(c.name)).length
  const total        = p.components.length
  const pct          = total ? Math.round((dsCount / total) * 100) : 0
  // A 100% adoption score is misleading when most DS components have been
  // modified — shift the bar/headline to orange when >50% of DS components
  // have custom styles applied on top.
  const modifiedRatio = dsCount > 0 ? driftedCount / dsCount : 0
  const color         = pct < 50 ? C.red
    : pct < 75     ? C.yellow
    : modifiedRatio > 0.5 ? C.orange
    : C.green

  const gapMap = new Map<string, number>()
  p.components.filter(c => !c.inDS).forEach(c => gapMap.set(c.name, (gapMap.get(c.name) ?? 0) + 1))
  const gaps         = [...gapMap.entries()].sort((a, b) => {
    const aIgnored = p.ignored.has(a[0]) ? 1 : 0
    const bIgnored = p.ignored.has(b[0]) ? 1 : 0
    return aIgnored !== bIgnored ? aIgnored - bIgnored : b[1] - a[1]
  })
  const promoteCount = gaps.filter(([, n]) => n >= PROMOTE_MIN).length

  const dsMap = new Map<string, number>()
  p.components.filter(c => c.inDS).forEach(c => dsMap.set(c.name, (dsMap.get(c.name) ?? 0) + 1))
  const dsComps = [...dsMap.entries()].sort((a, b) => b[1] - a[1])

  const pill = (active: boolean, label: string, onClick: () => void, ac: string = color) => (
    <button onClick={onClick} style={{
      padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
      fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif',
      background: active ? ac : C.pillBg,
      color: active ? '#fff' : C.muted, transition: 'background 0.15s',
    }}>{label}</button>
  )

  const handleExport = async () => {
    const text = buildReport(p.components, p.tokenViolations)
    try { await navigator.clipboard.writeText(text); setExported(true); setTimeout(() => setExported(false), 2000) }
    catch { prompt('Copy this coverage report:', text) }
  }

  const handleCopyMarkdown = async () => {
    const md = buildMarkdownReport(p.components, p.tokenViolations)
    try { await navigator.clipboard.writeText(md); setMdCopied(true); setTimeout(() => setMdCopied(false), 2000) }
    catch { prompt('Copy this markdown report:', md) }
  }

  const handleDownloadPNG = async () => {
    if (pngBusy) return
    setPngBusy(true)
    try {
      await downloadDriftMapPNG(p.components, pct, C as typeof THEMES['dark'])
    } finally {
      setPngBusy(false)
    }
  }

  const handleGeneratePalette = () => {
    const p2 = buildColorPalette(p.tokenViolations)
    setPalette(p2)
  }

  const handleCopyPalette = async () => {
    if (!palette) return
    const css = paletteToCSSVars(palette)
    try { await navigator.clipboard.writeText(css) }
    catch { prompt('Copy CSS palette:', css) }
    setPaletteCopied(true)
    setTimeout(() => setPaletteCopied(false), 2000)
  }

  const handleBootstrapToggle = (name: string) => {
    setBootstrapSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const handleBootstrapSelectAll = () => setBootstrapSelected(new Set(gaps.map(([n]) => n)))

  const handleCopyBootstrap = async () => {
    const selected = gaps.filter(([n]) => bootstrapSelected.has(n)).map(([n]) => n)
    const cfg = generateBootstrapConfig(selected)
    try { await navigator.clipboard.writeText(cfg) }
    catch { prompt('Copy config.ts:', cfg) }
    setBootstrapCopied(true)
    setTimeout(() => setBootstrapCopied(false), 2000)
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'Inter, sans-serif', color: C.text,
    }}>

      {/* ══ Register components page ═══════════════════════════════════ */}
      {bootstrapPage && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Breadcrumb header */}
          <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
            <button onClick={() => { setBootstrapPage(false); setBootstrapCopied(false) }} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: C.muted, fontFamily: 'Inter, sans-serif', marginBottom: 8,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Overview
            </button>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>Register components</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
              Tell Drift which components belong to your design system so it can track them for drift.
            </div>
          </div>
          <div style={{ height: 1, background: C.panelBorder, margin: '10px 0 0', flexShrink: 0 }} />

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {/* Select controls */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
              <button onClick={handleBootstrapSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.blue, padding: 0, fontFamily: 'Inter, sans-serif' }}>
                Select all
              </button>
              <span style={{ fontSize: 11, color: C.muted }}>·</span>
              <button onClick={() => setBootstrapSelected(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.muted, padding: 0, fontFamily: 'Inter, sans-serif' }}>
                Clear
              </button>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: C.muted }}>{bootstrapSelected.size} of {gaps.length} selected</span>
            </div>

            {/* Component list with custom checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {gaps.map(([name, count]) => {
                const checked = bootstrapSelected.has(name)
                return (
                  <div
                    key={name}
                    onClick={() => handleBootstrapToggle(name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                      background: checked ? `${C.blue}10` : C.btnBg,
                      border: `1px solid ${checked ? `${C.blue}30` : C.panelBorder}`,
                      transition: 'all 0.1s',
                    }}
                  >
                    {/* Custom checkbox */}
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${checked ? C.blue : C.muted}`,
                      background: checked ? C.blue : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.1s',
                    }}>
                      {checked && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5l2.5 2.5L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.text }}>{name}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>used {count}×</span>
                    {count >= PROMOTE_MIN && (
                      <span style={{ fontSize: 10, color: C.purple, fontWeight: 600 }}>promote</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* How-to guide */}
            <div style={{
              padding: '12px', borderRadius: 8,
              background: C.btnBg, border: `1px solid ${C.panelBorder}`,
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 8 }}>How to add these</div>
              {[
                { n: 1, text: 'Select the components above that belong to your design system' },
                { n: 2, text: 'Click Copy below' },
                { n: 3, text: 'Ask Claude Code or Cursor: "Add this snippet to my design system config"' },
              ].map(({ n, text }) => (
                <div key={n} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: `${C.blue}15`, color: C.blue,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                  }}>{n}</div>
                  <span style={{ fontSize: 11, color: C.textSub, lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky copy footer */}
          <div style={{ flexShrink: 0, padding: '10px 16px 12px', borderTop: `1px solid ${C.panelBorder}`, background: C.panel }}>
            <button
              onClick={handleCopyBootstrap}
              disabled={bootstrapSelected.size === 0}
              style={{
                width: '100%',
                background: bootstrapSelected.size === 0 ? C.pillBg : (bootstrapCopied ? C.green : C.blue),
                border: 'none', borderRadius: 8, padding: '9px 0',
                color: bootstrapSelected.size === 0 ? C.muted : '#fff',
                fontSize: 12, fontWeight: 700, cursor: bootstrapSelected.size === 0 ? 'default' : 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
              }}
            >
              {bootstrapCopied
                ? '✓ Copied — paste into Claude Code or Cursor'
                : bootstrapSelected.size === 0
                  ? 'Select components above'
                  : `Copy ${bootstrapSelected.size} component${bootstrapSelected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Settings page ─────────────────────────────────────────── */}
      {!bootstrapPage && settingsPage && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Settings header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderBottom: `1px solid ${C.panelBorder}`, flexShrink: 0,
          }}>
            <button onClick={() => setSettingsPage(false)} title="Back" style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: C.btnBg, border: `1px solid ${C.panelBorder}`, borderRadius: 8,
              cursor: 'pointer', color: C.textSub,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Settings</span>
          </div>

          {/* Settings content */}
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Appearance card */}
            <div style={{ background: C.btnBg, border: `1px solid ${C.panelBorder}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 0.6, marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>APPEARANCE</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: C.text, fontFamily: 'Inter, sans-serif' }}>Dark mode</span>
                <button
                  onClick={p.onToggleTheme}
                  style={{
                    width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: p.theme === 'dark' ? C.blue : C.track,
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, left: p.theme === 'dark' ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>
            </div>

            {/* AI Tools card */}
            <div style={{ background: C.btnBg, border: `1px solid ${C.panelBorder}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 0.6, marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>AI TOOLS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <button
                  onClick={() => { setSettingsPage(false); setGenOutput(null); setGenError(null); setGeneratePage(true) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '9px 11px', borderRadius: 8, border: `1px solid ${C.panelBorder}`,
                    background: C.panel, cursor: 'pointer', textAlign: 'left',
                  }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: C.blue }}>
                    <rect x="1" y="1" width="14" height="3.5" rx="1.2" fill="currentColor" opacity="0.75"/>
                    <rect x="1" y="6.5" width="6" height="8.5" rx="1.2" fill="currentColor"/>
                    <rect x="9" y="6.5" width="6" height="8.5" rx="1.2" fill="currentColor" opacity="0.45"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif' }}>Generate page shell</div>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: 'Inter, sans-serif', marginTop: 1 }}>Scaffold a page using only your DS components</div>
                  </div>
                </button>
                <button
                  onClick={() => { setSettingsPage(false); setExportCopied(false); setExportPage(true) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '9px 11px', borderRadius: 8, border: `1px solid ${C.panelBorder}`,
                    background: C.panel, cursor: 'pointer', textAlign: 'left',
                  }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: C.blue }}>
                    <path d="M8 1v3M8 12v3M1 8h3M12 8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M3.5 3.5l2 2M10.5 10.5l2 2M10.5 5.5l2-2M3.5 12.5l2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.6"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif' }}>Export AI context file</div>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: 'Inter, sans-serif', marginTop: 1 }}>.cursorrules · CLAUDE.md · .md</div>
                  </div>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══ Generate page shell ═══════════════════════════════════════ */}
      {/* ══ AI context file export page ════════════════════════════════ */}
      {exportPage && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Breadcrumb header */}
          <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
            <button
              onClick={() => setExportPage(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: C.muted, fontFamily: 'Inter, sans-serif', marginBottom: 8,
              }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Overview
            </button>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>Export AI context file</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
              Generate a file that encodes your design system for AI tools — so they never produce hardcoded tokens or invent custom components.
            </div>
          </div>
          <div style={{ height: 1, background: C.panelBorder, margin: '10px 0 0', flexShrink: 0 }} />

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>

            {/* Format toggle */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 8 }}>Format</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {([
                  { value: 'cursorrules' as ExportFormat, label: '.cursorrules', hint: 'Cursor IDE' },
                  { value: 'claude' as ExportFormat,      label: 'CLAUDE.md',    hint: 'Claude Code' },
                  { value: 'md' as ExportFormat,          label: '.md',          hint: 'Generic' },
                ] as const).map(({ value, label, hint }) => (
                  <button
                    key={value}
                    onClick={() => { setExportFormat(value); setExportCopied(false) }}
                    title={hint}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                      background: exportFormat === value ? C.blue : C.pillBg,
                      color: exportFormat === value ? '#fff' : C.muted,
                      transition: 'background 0.15s',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>
                {exportFormat === 'cursorrules' && 'Paste as .cursorrules in your project root. Cursor picks it up automatically.'}
                {exportFormat === 'claude'      && 'Paste into your CLAUDE.md. Claude Code uses it as project context.'}
                {exportFormat === 'md'          && 'Generic markdown reference — works with any AI tool that accepts context files.'}
              </div>
            </div>

            {/* Content preview */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.textSub }}>Preview</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(buildAIContextFile(exportFormat))
                      setExportCopied(true)
                      setTimeout(() => setExportCopied(false), 2000)
                    }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      fontSize: 11, fontWeight: 600, color: exportCopied ? C.green : C.blue,
                      fontFamily: 'Inter, sans-serif',
                    }}>
                    {exportCopied ? '✓ Copied' : '⎘ Copy'}
                  </button>
                  <button
                    onClick={() => {
                      const content  = buildAIContextFile(exportFormat)
                      const filename = exportFormat === 'cursorrules' ? '.cursorrules'
                                     : exportFormat === 'claude'      ? 'CLAUDE.md'
                                     :                                  'design-system.md'
                      const blob = new Blob([content], { type: 'text/plain' })
                      const url  = URL.createObjectURL(blob)
                      const a    = document.createElement('a')
                      a.href = url; a.download = filename; a.click()
                      setTimeout(() => URL.revokeObjectURL(url), 5000)
                    }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      fontSize: 11, fontWeight: 600, color: C.textSub,
                      fontFamily: 'Inter, sans-serif',
                    }}>
                    ↓ Download
                  </button>
                </div>
              </div>
              <pre style={{
                margin: 0, padding: '10px 12px', borderRadius: 8,
                background: C.kbdBg, border: `1px solid ${C.panelBorder}`,
                fontSize: 10, lineHeight: 1.65, color: C.text,
                fontFamily: 'ui-monospace, Consolas, monospace',
                maxHeight: 340, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {buildAIContextFile(exportFormat)}
              </pre>
            </div>

            {/* What's included note */}
            <div style={{
              padding: '8px 10px', borderRadius: 7,
              background: C.pillBg, border: `1px solid ${C.panelBorder}`,
              fontSize: 10, color: C.muted, lineHeight: 1.6,
            }}>
              <strong style={{ color: C.textSub }}>Includes:</strong>{' '}
              {DS_COMPONENTS.size} components · live design tokens from {':root'} · coding rules
              {registryValidated === false && (
                <span title="Could not reach Storybook index — using config.ts as fallback. Components without published stories may appear as DS."
                  style={{ marginLeft: 6, color: C.orange }}>
                  ⚠ registry unvalidated
                </span>
              )}
            </div>

          </div>
        </div>
      )}

      {generatePage && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Breadcrumb header */}
          <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
            <button
              onClick={() => setGeneratePage(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: C.muted, fontFamily: 'Inter, sans-serif', marginBottom: 8,
              }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Overview
            </button>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>Generate page shell</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
              Describe a page and get a scaffolded React file using only your design system components.
            </div>
          </div>
          <div style={{ height: 1, background: C.panelBorder, margin: '10px 0 0', flexShrink: 0 }} />

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>

            {/* Description + generate — kept together so the action is right there */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSub, display: 'block', marginBottom: 6 }}>
                Describe the page
              </label>
              <textarea
                value={genDesc}
                onChange={e => setGenDesc(e.target.value)}
                placeholder='e.g. "Tenant detail — header with name and unit, overdue balance banner, three stat cards, a communications feed, and an access log"'
                rows={4}
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'vertical',
                  background: C.pillBg, border: `1px solid ${C.panelBorder}`,
                  borderRadius: 8, padding: '8px 10px', fontSize: 11,
                  color: C.text, fontFamily: 'Inter, sans-serif',
                  outline: 'none', lineHeight: 1.65,
                }}
              />
              <div style={{ fontSize: 10, color: C.muted, marginTop: 5, marginBottom: 10 }}>
                Be specific — sections, key data, actions. Drift picks only what fits from your {DS_COMPONENTS.size} components.
              </div>

              {/* Generate button — directly below the textarea */}
              {!genOutput && (
                <button
                  disabled={genLoading || !genDesc.trim()}
                  onClick={async () => {
                    if (!AI_PROXY_URL) { setGenError('VITE_AI_PROXY_URL is required to generate page shells.'); return }
                    setGenLoading(true); setGenError(null); setGenOutput(null)
                    try {
                      const code = await fetchPageShell(genDesc, Array.from(DS_COMPONENTS))
                      setGenOutput(code)
                    } catch (e: any) {
                      setGenError(e.message ?? 'Generation failed')
                    } finally {
                      setGenLoading(false)
                    }
                  }}
                  style={{
                    width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                    background: genLoading || !genDesc.trim() ? C.pillBg : C.blue,
                    color: genLoading || !genDesc.trim() ? C.muted : '#fff',
                    fontSize: 12, fontWeight: 700,
                    cursor: genLoading || !genDesc.trim() ? 'default' : 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'background 0.15s',
                  }}>
                  {genLoading ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ animation: 'dd-spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/>
                      </svg>
                      Generating…
                    </>
                  ) : '✦ Generate page shell'}
                </button>
              )}
            </div>

            {/* Available components — collapsed disclosure */}
            <details style={{ marginBottom: 14 }}>
              <summary style={{
                fontSize: 11, fontWeight: 600, color: C.muted,
                cursor: 'pointer', userSelect: 'none', listStyle: 'none',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transition: 'transform 0.15s', flexShrink: 0 }}>
                  <path d="M2.5 3.5L5 6.5l2.5-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {DS_COMPONENTS.size} components available
              </summary>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {Array.from(DS_COMPONENTS).sort().map(name => (
                  <span key={name} style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 20,
                    background: C.pillBg, border: `1px solid ${C.panelBorder}`,
                    color: C.textSub,
                  }}>{name}</span>
                ))}
              </div>
            </details>

            {genError && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: `${C.red}12`, border: `1px solid ${C.red}30`, borderRadius: 7, fontSize: 11, color: C.red, lineHeight: 1.5 }}>
                {genError}
              </div>
            )}

            {/* Output code block */}
            {genOutput && (
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.green }}>✓ Page shell generated</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(genOutput)
                        setGenCopied(true)
                        setTimeout(() => setGenCopied(false), 2000)
                      }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontSize: 11, fontWeight: 600, color: genCopied ? C.green : C.blue,
                        fontFamily: 'Inter, sans-serif',
                      }}>
                      {genCopied ? '✓ Copied' : '⎘ Copy'}
                    </button>
                    <button
                      onClick={() => { setGenOutput(null); setGenError(null) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: C.muted, fontFamily: 'Inter, sans-serif' }}>
                      Regenerate
                    </button>
                  </div>
                </div>
                <pre style={{
                  margin: 0, padding: '10px 12px', borderRadius: 8, overflowX: 'auto',
                  background: C.kbdBg, border: `1px solid ${C.panelBorder}`,
                  fontSize: 10, lineHeight: 1.65, color: C.text,
                  fontFamily: 'ui-monospace, Consolas, monospace',
                  maxHeight: 320, overflowY: 'auto', whiteSpace: 'pre',
                }}>
                  {genOutput}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Normal panel (hidden while sub-pages are open) ── */}
      {!bootstrapPage && !settingsPage && !generatePage && !exportPage && <>

      {/* ── Header row: title + scan toggle + settings + close ──────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 10px 8px 14px',
        borderBottom: `1px solid ${C.panelBorder}`,
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginRight: 4 }}>
          <WaveIcon size={15} color={C.blue} />
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2, color: C.text }}>Drift</span>
        </div>
        {/* Quick / Full toggle */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: C.pillBg, borderRadius: 20, padding: '2px',
          border: `1px solid ${C.panelBorder}`,
        }}>
          <button
            onClick={p.onToggleSurface}
            title="Quick scan — top-level components only"
            style={{
              padding: '2px 9px', borderRadius: 18, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 600, fontFamily: 'Inter, sans-serif',
              background: p.surfaceMode ? C.muted : 'transparent',
              color: p.surfaceMode ? '#fff' : C.muted, transition: 'background 0.15s',
            }}>Quick</button>
          <button
            onClick={p.onToggleSurface}
            title="Full scan — descends inside DS components"
            style={{
              padding: '2px 9px', borderRadius: 18, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 600, fontFamily: 'Inter, sans-serif',
              background: !p.surfaceMode ? C.muted : 'transparent',
              color: !p.surfaceMode ? '#fff' : C.muted, transition: 'background 0.15s',
            }}>Full</button>
        </div>
        {p.isCached && !p.scanning && (
          <span title="Results from cache" style={{
            fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 6,
            background: C.pillBg, color: C.muted, letterSpacing: 0.3,
          }}>CACHED</span>
        )}
        <div style={{ flex: 1 }} />
        {/* Settings */}
        <button onClick={() => setSettingsPage(true)} title="Settings" style={{
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: settingsPage ? C.inspectBg : C.btnBg,
          border: `1px solid ${settingsPage ? C.blue : C.panelBorder}`, borderRadius: 8,
          cursor: 'pointer', color: settingsPage ? C.blue : C.textSub,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* Close */}
        <button onClick={p.onClose} title="Close panel" style={{
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: C.btnBg, border: `1px solid ${C.panelBorder}`,
          borderRadius: 8, cursor: 'pointer', color: C.muted, fontSize: 15, lineHeight: 1,
        }}>×</button>
      </div>

      {/* ── Not yet scanned ─────────────────────────────────────────── */}
      {!p.scanned && !p.scanning && (
        <div style={{ textAlign: 'center', padding: '32px 16px', lineHeight: 1.7 }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>Check this screen</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            See which elements were built from<br />your design system and which weren't.
          </div>
          <button onClick={p.onRescan} style={{
            background: C.blue, border: 'none', borderRadius: 8, padding: '8px 20px',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>Analyse this screen</button>
        </div>
      )}

      {p.scanning && (
        <div style={{ padding: '12px 16px' }}>
          {/* Coverage card skeleton */}
          <div style={{
            height: 72, borderRadius: 12, marginBottom: 10,
            background: C.track, animation: 'dd-pulse 1.4s ease-in-out infinite',
          }} />
          {/* Row skeletons */}
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 44, borderRadius: 9, marginBottom: 6,
              background: C.track, animation: `dd-pulse 1.4s ease-in-out ${i * 0.1}s infinite`,
            }} />
          ))}
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: C.muted }}>
            Waiting for page to settle…
          </div>
        </div>
      )}

      {/* ── Coverage card (always visible when scanned) ──────────────── */}
      {p.scanned && !p.scanning && (
        <div style={{
          margin: '12px 16px 0',
          padding: '14px',
          background: C.panel,
          border: `1px solid ${C.panelBorder}`,
          borderRadius: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          flexShrink: 0,
        }}>
          {/* % + label + Storybook link */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
              <span style={{ fontSize: 10, color: C.muted }}>from your designs</span>
            </div>
            {SB_IS_LOCAL ? (
              <span title="Set a deployed storybookUrl in drift.config.ts to enable this link"
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.muted, flexShrink: 0, cursor: 'default', userSelect: 'none' }}>
                Storybook
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </span>
            ) : (
              <a href={SB_BASE} target="_blank" rel="noreferrer" title="Open component library in Storybook"
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.blue, textDecoration: 'none', flexShrink: 0, opacity: 0.8 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
              >
                Storybook
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )}
          </div>
          {/* Bar */}
          <CoverageBar pct={pct} barColor={color} />
          {/* Inline stat row — no pills */}
          <div style={{ display: 'flex', gap: 14, marginTop: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontWeight: 700, color: C.green }}>{dsCount}</span>
              <span style={{ color: C.muted }}> designed</span>
            </span>
            {driftedCount > 0 && (
              <span style={{ fontSize: 11, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontWeight: 700, color: C.orange }}>{driftedCount}</span>
                <span style={{ color: C.muted }}> modified</span>
              </span>
            )}
            <span style={{ fontSize: 11, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontWeight: 700, color: C.red }}>{gapCount}</span>
              <span style={{ color: C.muted }}> custom</span>
            </span>
            {ignoredCount > 0 && (
              <span style={{ fontSize: 11, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontWeight: 700, color: '#34d399' }}>{ignoredCount}</span>
                <span style={{ color: C.muted }}> approved</span>
              </span>
            )}
          </div>
          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.panelBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: C.muted }}>{total} elements</span>
              <button onClick={p.onRescan} disabled={p.scanning} style={{
                background: 'none', border: 'none', cursor: p.scanning ? 'default' : 'pointer', padding: 0,
                fontSize: 10, fontWeight: 600, color: p.scanning ? C.muted : C.blue,
                fontFamily: 'Inter, sans-serif',
              }}>
                {p.scanning ? 'Scanning…' : p.isCached ? '↺ Force rescan' : '↺ Rescan'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Plain text share */}
              <button onClick={handleExport} title="Copy plain-text coverage report to clipboard" style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 10, color: exported ? C.green : C.muted, fontFamily: 'Inter, sans-serif',
              }}>
                <span>{exported ? '✓' : '⎘'}</span>
                <span>{exported ? 'Copied' : 'Text'}</span>
              </button>
              {/* Markdown copy */}
              <button onClick={handleCopyMarkdown} title="Copy Markdown report (for GitHub / Slack)" style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 10, color: mdCopied ? C.green : C.muted, fontFamily: 'Inter, sans-serif',
              }}>
                <span>{mdCopied ? '✓' : '⬡'}</span>
                <span>{mdCopied ? 'Copied' : 'MD'}</span>
              </button>
              {/* PNG drift-map download */}
              <button onClick={handleDownloadPNG} disabled={pngBusy} title="Download drift-map as PNG" style={{
                background: 'none', border: 'none', cursor: pngBusy ? 'default' : 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 10, color: pngBusy ? C.green : C.muted, fontFamily: 'Inter, sans-serif',
              }}>
                <span>⤓</span>
                <span>{pngBusy ? 'Saving…' : 'PNG'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab bar — top level, full width ──────────────────────────── */}
      {p.scanned && !p.scanning && (
        <div data-dd-tabs style={{ borderBottom: `1px solid ${C.panelBorder}`, flexShrink: 0 }}>
          <TabBar active={tab} onChange={setTab} tokenCount={p.tokenViolations.length} promoteCount={promoteCount} driftCount={driftedCount} />
        </div>
      )}

      {/* ── Scanned content ────────────────────────────────────────────── */}
      {p.scanned && !p.scanning && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px 16px 0' }}>

          {/* Overview */}
          {tab === 'overview' && (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {pill(p.filter === 'all',  'All',          () => p.onFilterChange('all'))}
                {pill(p.filter === 'gaps', 'Custom-built', () => p.onFilterChange('gaps'))}
              </div>

              {/* DS components — only shown in "All" view */}
              {p.filter === 'all' && dsComps.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>Design system components</span>
                    <span style={{ fontSize: 10, color: C.muted }}>{dsComps.length} unique</span>
                  </div>
                  {dsComps.map(([name, count]) => {
                    const storyPath = DS_STORY_PATHS[name]
                    const storyUrl  = storyPath ? `${SB_BASE}/?path=/story/${storyPath}` : undefined
                    const isDrifted = p.components.some(c => c.name === name && c.drifted)
                    const accentColor = isDrifted ? C.orange : C.green
                    const isHovered = p.hoveredGap === name
                    const firstMatch = p.components.find(c => c.name === name && c.inDS)
                    return (
                      <div key={name}
                        onClick={() => { if (firstMatch) p.onInspect(firstMatch) }}
                        onMouseEnter={() => p.onHoverGap(name)}
                        onMouseLeave={() => p.onHoverGap(null)}
                        style={{
                          marginBottom: 6, padding: '10px 12px', borderRadius: 8,
                          background: C.panel,
                          border: `1px solid ${isHovered ? accentColor : C.panelBorder}`,
                          boxShadow: isHovered ? `0 0 0 1px ${accentColor}` : '0 1px 3px rgba(0,0,0,0.05)',
                          cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                            {isDrifted && (
                              <span style={{ fontSize: 9, color: C.orange, background: `${C.orange}14`, padding: '1px 5px', borderRadius: 3, flexShrink: 0 }}>modified</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
                              color: accentColor, background: `${accentColor}14`,
                              padding: '2px 8px', borderRadius: 4,
                            }}>×{count}</span>
                            {storyUrl && !SB_IS_LOCAL && (
                              <a href={storyUrl} target="_blank" rel="noreferrer" title="View in Storybook"
                                onClick={e => e.stopPropagation()}
                                style={{ display: 'flex', color: C.muted, textDecoration: 'none' }}
                                onMouseEnter={e => (e.currentTarget.style.color = C.blue)}
                                onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                                  <polyline points="15 3 21 3 21 9"/>
                                  <line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                              </a>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>
                          {isDrifted ? 'Custom styles applied on top — click to inspect' : 'From your design system'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Gap list */}
              {gaps.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>
                      Custom-built elements
                    </span>
                    <span style={{ fontSize: 10, color: C.muted }}>{gaps.length} unique</span>
                  </div>
                  {/* Filter input */}
                  <input
                    type="text"
                    placeholder="Search elements…"
                    value={p.gapFilter}
                    onChange={e => p.onGapFilterChange(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box', marginBottom: 8,
                      background: C.pillBg, border: `1px solid ${C.panelBorder}`,
                      borderRadius: 8, padding: '5px 9px', fontSize: 11,
                      color: C.text, fontFamily: 'Inter, sans-serif', outline: 'none',
                    }}
                  />
                  {gaps.filter(([name]) => !p.gapFilter || name.toLowerCase().includes(p.gapFilter.toLowerCase())).map(([name, count]) => {
                    const suggestion   = p.suggestions[name]
                    const gapProps     = p.components.find(c => c.name === name)?.fiber?.memoizedProps ?? {}
                    const isFrequent   = count >= PROMOTE_MIN
                    const isPromotable = count >= 3
                    const isPromoted   = promotedComponents.has(name)
                    const isIgnored    = p.ignored.has(name)
                    const isHovered    = p.hoveredGap === name
                    return (
                      <div key={name}
                        onMouseEnter={() => p.onHoverGap(name)}
                        onMouseLeave={() => p.onHoverGap(null)}
                        style={{
                          marginBottom: 6, background: C.panel,
                          border: `1px solid ${isHovered ? C.red : C.panelBorder}`, borderRadius: 8,
                          boxShadow: isHovered ? `0 0 0 1px ${C.red}` : '0 1px 3px rgba(0,0,0,0.05)',
                          overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s',
                        }}>
                        {/* Card body */}
                        <div style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                              {isFrequent && (
                                <span title="High frequency — strong DS candidate" style={{ fontSize: 10, color: '#f59e0b', flexShrink: 0 }}>⬆</span>
                              )}
                              <span style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                              {isFrequent && (
                                <span title={`Used ${count} times — worth adding to your design system`}
                                  style={{ fontSize: 10, color: C.purple, cursor: 'help', flexShrink: 0 }}>
                                  Worth designing
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              {isPromotable && !isPromoted && (
                                <button
                                  onClick={e => { e.stopPropagation(); onPromote(name, count) }}
                                  title="Promote to design system"
                                  style={{
                                    fontSize: 10, padding: '2px 7px', borderRadius: 4,
                                    background: 'transparent', border: `1px solid ${C.blue}`,
                                    color: C.blue, cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif', fontWeight: 600,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  ↑ Promote
                                </button>
                              )}
                              {!isPromoted && !isIgnored && (
                                <button
                                  onClick={e => { e.stopPropagation(); p.onApproveGap(name) }}
                                  title="Mark as approved — intentional, exclude from coverage gap count"
                                  style={{
                                    fontSize: 10, padding: '2px 7px', borderRadius: 4,
                                    background: 'transparent', border: `1px solid ${C.muted}`,
                                    color: C.muted, cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif', fontWeight: 600,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  ✓ Approve
                                </button>
                              )}
                              {isIgnored && (
                                <button
                                  onClick={e => { e.stopPropagation(); p.onUnapproveGap(name) }}
                                  title="Remove approval — count as gap again"
                                  style={{
                                    fontSize: 10, padding: '2px 7px', borderRadius: 4,
                                    background: 'transparent', border: `1px solid #34d399`,
                                    color: '#34d399', cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif', fontWeight: 600,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  ✓ Approved
                                </button>
                              )}
                              {isPromoted && (
                                <span style={{
                                  fontSize: 10, padding: '2px 7px', borderRadius: 4,
                                  color: '#34d399', fontWeight: 600,
                                  fontFamily: 'Inter, sans-serif',
                                }}>
                                  ✓ in DS
                                </span>
                              )}
                              <span title={`Renders ${count} time${count !== 1 ? 's' : ''} on this page`}
                                style={{
                                  fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
                                  color: C.red, background: `${C.red}14`,
                                  padding: '2px 8px', borderRadius: 4,
                                }}>
                                ×{count}
                              </span>
                            </div>
                          </div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>
                            Not in your design system
                          </div>
                          {/* AI suggestion result — inline when ready */}
                          {suggestion?.status === 'done' && suggestion.text && (
                            <div style={{ marginTop: 8, padding: '8px 10px', background: `${C.blue}0d`, border: `1px solid ${C.blue}25`, borderRadius: 6, fontSize: 11, color: C.text, lineHeight: 1.6 }}>
                              <span style={{ fontWeight: 700, color: C.blue, fontSize: 10, display: 'block', marginBottom: 4 }}>✦ Replacement suggestion</span>
                              {suggestion.text}
                            </div>
                          )}
                          {suggestion?.status === 'error' && (
                            <div style={{ marginTop: 6, padding: '6px 10px', background: C.redChipBg, borderRadius: 6, fontSize: 10, color: C.red }}>
                              {suggestion.text}
                            </div>
                          )}
                        </div>
                        {/* Card footer — AI suggest button */}
                        <div style={{ borderTop: `1px solid ${C.panelBorder}`, padding: '7px 12px', background: 'rgba(124,58,237,0.04)' }}>
                          <button
                            onClick={() => p.onSuggest(name, count, gapProps)}
                            disabled={suggestion?.status === 'loading' || suggestion?.status === 'done'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              fontSize: 10, fontWeight: 700, background: 'none', border: 'none', padding: 0,
                              color: suggestion?.status === 'done' ? C.muted : '#7c3aed',
                              cursor: suggestion?.status === 'loading' || suggestion?.status === 'done' ? 'default' : 'pointer',
                              fontFamily: 'Inter, sans-serif', opacity: suggestion?.status === 'loading' ? 0.5 : 1,
                            }}
                          >
                            <span style={{ fontSize: 11 }}>✦</span>
                            {suggestion?.status === 'loading' ? 'Thinking…' : suggestion?.status === 'done' ? 'Suggestion ready' : 'Suggest replacement'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Everything on this screen was designed</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>No custom-built elements found</div>
                </div>
              )}

              {/* Register components — navigates to dedicated page */}
              {gaps.length > 0 && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${C.panelBorder}`, paddingTop: 12 }}>
                  <button
                    onClick={() => {
                      if (bootstrapSelected.size === 0) handleBootstrapSelectAll()
                      setBootstrapPage(true)
                    }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: C.btnBg, border: `1px solid ${C.panelBorder}`,
                      borderRadius: 8, padding: '9px 12px', cursor: 'pointer',
                    }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Register components</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                        Add {gaps.length} untracked component{gaps.length !== 1 ? 's' : ''} to your design system
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5 3l4 4-4 4" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Drift */}
          {tab === 'drift' && (
            driftedCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>No modifications found</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.6 }}>
                  All design system components look<br />exactly as they were designed
                </div>
              </div>
            ) : (
              <>
                <div data-dd-drift-summary style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: C.orange, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{driftedCount}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>designed components modified</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>custom styles were applied on top of the design</div>
                  </div>
                </div>
                <div>
                  {p.components.filter(c => c.drifted).map((c, i) => {
                    // Group violations to get a unique issue count (same as PropsPanel)
                    const grouped = Object.values(
                      c.driftViolations.reduce((acc, v) => {
                        const key = `${v.type}||${v.value}`
                        if (!acc[key]) acc[key] = { type: v.type, value: v.value, props: [] as string[] }
                        acc[key].props.push(v.prop)
                        return acc
                      }, {} as Record<string, { type: string; value: string; props: string[] }>)
                    )
                    const isHovered = p.hoveredGap === c.name
                    return (
                      <div key={`${c.name}-${i}`}
                        onClick={() => p.onInspect(c)}
                        onMouseEnter={() => p.onHoverGap(c.name)}
                        onMouseLeave={() => p.onHoverGap(null)}
                        style={{
                          marginBottom: 6, padding: '10px 12px', borderRadius: 8,
                          background: C.panel,
                          border: `1px solid ${isHovered ? C.orange : C.panelBorder}`,
                          boxShadow: isHovered ? `0 0 0 1px ${C.orange}` : '0 1px 3px rgba(0,0,0,0.05)',
                          cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
                        }}>
                        {/* Title row: name + override count pill */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{c.name}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
                            color: C.orange, background: `${C.orange}14`,
                            padding: '2px 8px', borderRadius: 4, flexShrink: 0,
                          }}>{grouped.length} override{grouped.length !== 1 ? 's' : ''}</span>
                        </div>
                        {/* Subtitle */}
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>
                          Hardcoded styles applied on top of the design → click to inspect
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          )}

          {/* Tokens */}
          {tab === 'tokens' && (
            p.tokenViolations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>No style issues found</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>All colours, spacing, and shapes match your design tokens</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: C.red, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{p.tokenViolations.length}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>hardcoded style values</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>colors, spacing, radius, or typography set without using a design token</div>
                  </div>
                </div>
                <div>
                  {p.tokenViolations.map((v, i) => {
                    const isHov = p.hoveredViolation === v
                    const suggestion = suggestToken(v.type, v.value)
                    // Find DS component names that contain the violating elements
                    const affectedNames = v.elements.length > 0
                      ? [...new Set(v.elements.flatMap(el =>
                          p.components
                            .filter(c => c.element.contains(el) || c.element === el)
                            .map(c => c.name)
                        ))].slice(0, 3)
                      : []
                    return (
                      <div key={i}
                        onMouseEnter={() => p.onHoverViolation(v)}
                        onMouseLeave={() => p.onHoverViolation(null)}
                        style={{
                          marginBottom: 6, background: C.panel,
                          border: `1px solid ${isHov ? C.red : C.panelBorder}`, borderRadius: 8,
                          boxShadow: isHov ? `0 0 0 1px ${C.red}` : '0 1px 3px rgba(0,0,0,0.05)',
                          overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s',
                        }}>
                        {/* Card body */}
                        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          {v.type === 'color' && (
                            <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, background: v.value, border: `1px solid rgba(0,0,0,0.18)`, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {v.value}
                              {suggestion && (
                                <span style={{ color: C.green, fontWeight: 400, marginLeft: 6 }}>→ {suggestion}</span>
                              )}
                            </div>
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                              {v.prop}
                              {affectedNames.length > 0 && (
                                <span style={{ marginLeft: 6, color: C.textSub }}>in {affectedNames.join(', ')}</span>
                              )}
                            </div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.red, background: C.redChipBg, padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>×{v.count}</span>
                        </div>
                        {/* Card footer */}
                        <div style={{ borderTop: `1px solid ${C.panelBorder}`, padding: '6px 12px', background: isHov ? 'rgba(239,68,68,0.04)' : undefined }}>
                          <div style={{ fontSize: 10, color: C.muted }}>
                            {isHov && v.elements.length > 0
                              ? `Highlighting ${v.elements.length} element${v.elements.length !== 1 ? 's' : ''} on screen`
                              : `Hover to highlight · ${suggestion ? `replace with ${suggestion}` : 'replace with a design token'}`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 12, fontSize: 10, color: C.muted, lineHeight: 1.6, padding: '8px 10px', background: C.pillBg, borderRadius: 8 }}>
                  Ask your developer to replace these values with design tokens so the screen stays consistent with the system.
                </div>
              </>
            )
          )}

          {/* ── Palette generator ──────────────────────────────────────── */}
          {tab === 'tokens' && p.tokenViolations.length > 0 && (
            <div style={{ marginTop: 16, borderTop: `1px solid ${C.panelBorder}`, paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Generate DS palette</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    Cluster detected colors into semantic tokens ready for <code style={{ fontFamily: 'monospace', background: C.kbdBg, padding: '0 3px', borderRadius: 3 }}>variables.css</code>
                  </div>
                </div>
                <button
                  onClick={palette ? handleCopyPalette : handleGeneratePalette}
                  style={{
                    flexShrink: 0, background: palette ? (paletteCopied ? C.green : C.blue) : C.btnBg,
                    border: `1px solid ${palette ? 'transparent' : C.panelBorder}`,
                    borderRadius: 8, padding: '5px 12px',
                    fontSize: 10, fontWeight: 700, color: palette ? '#fff' : C.textSub,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}>
                  <PaletteIcon size={11} color={palette ? '#fff' : C.textSub} />
                  {' '}{palette ? (paletteCopied ? 'Copied!' : 'Copy CSS') : 'Generate'}
                </button>
              </div>

              {palette && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {palette.map((e, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 8px', borderRadius: 8,
                      background: C.pillBg,
                    }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, background: e.hex, flexShrink: 0, border: '1px solid rgba(0,0,0,0.15)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontFamily: 'monospace', color: C.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.tokenName}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{e.hex} · {e.role}</div>
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {e.wcagAA
                          ? <span title="Passes WCAG AA contrast (≥4.5:1 on white)" style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>AA✓</span>
                          : <span title="Low contrast on white background" style={{ fontSize: 10, color: C.muted }}>—</span>
                        }
                        <span style={{ fontSize: 10, color: C.muted }}>×{e.count}</span>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setPalette(null)}
                    style={{ marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: C.muted, textAlign: 'left', padding: 0 }}>
                    ✕ dismiss
                  </button>
                </div>
              )}
            </div>
          )}

          {/* History */}
          {tab === 'history' && (
            p.history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>No screens reviewed yet</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Navigate between screens and run<br />an analysis on each one to build a trail</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 10 }}>Screens reviewed</div>
                {p.history.map((h, i) => {
                  const rowKey = `hist-${i}`
                  const isHov = hoveredRow === rowKey
                  return (
                  <div key={i}
                    onMouseEnter={() => setHoveredRow(rowKey)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      padding: '7px 0',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      borderBottom: `1px solid ${C.divider}`,
                      boxShadow: isHov ? `inset 3px 0 0 ${C.blue}` : 'none',
                      paddingLeft: isHov ? 8 : 0,
                      transition: 'box-shadow 0.15s, padding-left 0.15s',
                    }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.path}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                        <span style={{ color: C.green }}>{h.ds} designed</span>
                        {' · '}
                        <span style={{ color: C.red }}>{h.gaps} custom</span>
                        {' · '}{timeAgo(h.ts)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <MiniBar pct={h.pct} width={28} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: coverageColor(h.pct, C), minWidth: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{h.pct}%</span>
                    </div>
                  </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${C.panelBorder}`, padding: '10px 16px 12px' }}>
        {/* Demo-only waitlist CTA */}
        {IS_DEMO && (
          <button
            onClick={() => p.onOpenWaitlist ? p.onOpenWaitlist() : (window.location.href = '/')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', marginBottom: 10, padding: '9px 12px',
              background: 'linear-gradient(135deg, #4f8ef7, #a78bfa)',
              border: 'none', borderRadius: 8, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}>Like what you see? Join the waitlist →</span>
          </button>
        )}
        {/* Keyboard shortcuts */}
        <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', lineHeight: 1.7 }}>
          <kbd style={{ background: C.kbdBg, color: C.kbdText, padding: '1px 7px', borderRadius: 4, fontFamily: 'monospace', border: `1px solid ${C.panelBorder}`, fontSize: 11 }}>D</kbd>
          {' show/hide · '}
          <kbd style={{ background: C.kbdBg, color: C.kbdText, padding: '1px 7px', borderRadius: 4, fontFamily: 'monospace', border: `1px solid ${C.panelBorder}`, fontSize: 11 }}>Esc</kbd>
          {' close'}
        </div>
      </div>

      </> /* end !bootstrapPage && !settingsPage && !generatePage */ }
    </div>
  )
}

// ─── Toggle button ────────────────────────────────────────────────────────────

const ToggleButton = ({ visible, pct, pctColor, scanned, scanning, inspectMode, driftedCount, gapCount, onClick }: {
  visible: boolean; pct: number; pctColor: string
  scanned: boolean; scanning: boolean; inspectMode: boolean
  driftedCount: number; gapCount: number
  onClick: () => void
}) => {
  const C = useC()

  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px',
      background: visible ? C.toggleBgOn : '#ffffff',
      border: 'none',
      borderRadius: 28, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
      backdropFilter: visible ? 'blur(14px)' : 'none',
      boxShadow: visible ? C.toggleShadowOn : 'none',
      transition: 'all 0.2s', userSelect: 'none',
    }}>
      <WaveIcon size={20} color={C.blue} />

      {scanning && (
        <span style={{ fontSize: 10, color: C.yellow }}>scanning…</span>
      )}

      {inspectMode && !scanning && (
        <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: 0.3 }}>Identifying…</span>
      )}

      {!inspectMode && !scanning && scanned && (
        <>
          {/* DS coverage — always shown */}
          <span title={`${pct}% of elements on this screen are from your design system`} style={{
            fontSize: 11, fontWeight: 700, color: pctColor,
            background: `${pctColor}18`, padding: '2px 7px', borderRadius: 20,
            fontVariantNumeric: 'tabular-nums',
          }}>{pct}%</span>
          {/* Drift — only if any */}
          {driftedCount > 0 && (
            <span title={`${driftedCount} designed components have custom styles applied on top`} style={{
              fontSize: 11, fontWeight: 700, color: C.orange,
              background: `${C.orange}18`, padding: '2px 7px', borderRadius: 20,
              fontVariantNumeric: 'tabular-nums',
            }}>{driftedCount}</span>
          )}
          {/* Custom-built — only if any */}
          {gapCount > 0 && (
            <span title={`${gapCount} elements were built from scratch, not from your design system`} style={{
              fontSize: 11, fontWeight: 700, color: C.red,
              background: `${C.red}18`, padding: '2px 7px', borderRadius: 20,
              fontVariantNumeric: 'tabular-nums',
            }}>{gapCount}</span>
          )}
        </>
      )}
    </button>
  )
}

// ─── Gradient border animation ────────────────────────────────────────────────

const GRADIENT_STYLE = `
@keyframes dd-gradient-spin {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes dd-spin {
  to { transform: rotate(360deg); }
}
@keyframes dd-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.dd-gradient-wrap {
  background: linear-gradient(-45deg, #a855f7, #3b82f6, #22c55e, #f97316, #a855f7);
  background-size: 400% 400%;
  animation: dd-gradient-spin 4s ease infinite;
  border-radius: 30px;
  padding: 2px;
  display: inline-flex;
}
`

function injectGradientStyle() {
  if (document.getElementById('dd-gradient-style')) return
  const el = document.createElement('style')
  el.id = 'dd-gradient-style'
  el.textContent = GRADIENT_STYLE
  document.head.appendChild(el)
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export function DSCoverageOverlay({ autoOpen, onOpenWaitlist }: { autoOpen?: boolean; onOpenWaitlist?: () => void } = {}) {
  const [theme,          setTheme]          = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) ?? 'dark')
  const [visible,        setVisible]        = useState(false)
  const [isClosing,      setIsClosing]      = useState(false)
  const [showSetup,      setShowSetup]      = useState(() => !IS_DEMO && Object.keys(config.components).length === 0)
  const [components,     setComponents]     = useState<ScannedComponent[]>([])
  const [tokenViolations,setTokenViolations]= useState<TokenViolation[]>([])
  const [history,        setHistory]        = useState<HistoryEntry[]>([])
  const [scanned,        setScanned]        = useState(false)
  const [scanning,       setScanning]       = useState(false)
  const [filter,         setFilter]         = useState<'all' | 'gaps'>('all')
  const [gapFilter,      setGapFilter]      = useState('')
  const [surfaceMode,    setSurfaceMode]    = useState(true)
  const [inspectMode,    setInspectMode]    = useState(false)
  const [inspected,      setInspected]      = useState<ScannedComponent | null>(null)
  const [hoveredGap,     setHoveredGap]     = useState<string | null>(null)
  const [suggestions,    setSuggestions]    = useState<Record<string, Suggestion>>({})
  const [driftFixes,     setDriftFixes]     = useState<Record<string, Suggestion>>({})
  const [isCached,       setIsCached]       = useState(false)
  const [ignored,        setIgnored]        = useState<Set<string>>(() => loadIgnored())
  // null = pending, true = validated against live Storybook index, false = fallback (config only)
  const [registryValidated, setRegistryValidated] = useState<boolean | null>(null)

  const approveGap = useCallback((name: string) => {
    setIgnored(prev => {
      const next = new Set(prev)
      next.add(name)
      saveIgnored(next)
      return next
    })
  }, [])

  const unapproveGap = useCallback((name: string) => {
    setIgnored(prev => {
      const next = new Set(prev)
      next.delete(name)
      saveIgnored(next)
      return next
    })
  }, [])

  // ─── Promote-to-DS state ─────────────────────────────────────────────────
  const [promotingComponent, setPromotingComponent] = useState<{ name: string; count: number } | null>(null)
  const [promotedComponents, setPromotedComponents] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('drift-promoted-components')
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
    } catch { return new Set() }
  })

  const handlePromoted = useCallback((name: string) => {
    setPromotedComponents(prev => {
      const next = new Set(prev)
      next.add(name)
      localStorage.setItem('drift-promoted-components', JSON.stringify([...next]))
      return next
    })
    setPromotingComponent(null)
  }, [])

  const [hoverComp,       setHoverComp]       = useState<ScannedComponent | null>(null)
  const [hoverPos,        setHoverPos]        = useState<{ x: number; y: number } | null>(null)
  const [hoveredViolation, setHoveredViolation] = useState<TokenViolation | null>(null)

  const rafRef          = useRef<number>(0)
  const scanningRef     = useRef(false)
  const scanGenRef      = useRef(0)
  const surfaceRef      = useRef(surfaceMode)
  const modeInitRef     = useRef(false)   // skip the initial mount firing of the surfaceMode effect
  const hoverClearRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scannedRouteRef = useRef<string | null>(null)  // pathname of last completed scan
  surfaceRef.current = surfaceMode

  // Debounced hover: entering a card cancels a pending clear so rapidly moving
  // between cards never flashes the full unfiltered canvas.
  const handleHoverGap = useCallback((name: string | null) => {
    if (name !== null) {
      if (hoverClearRef.current) { clearTimeout(hoverClearRef.current); hoverClearRef.current = null }
      setHoveredGap(name)
    } else {
      hoverClearRef.current = setTimeout(() => { setHoveredGap(null); hoverClearRef.current = null }, 120)
    }
  }, [])
  // Keep a ref so the capture-layer handlers can access latest rendered list
  // without needing to be re-registered on every render.
  const renderedRef    = useRef<ScannedComponent[]>([])
  const inspectModeRef = useRef(false)
  const captureRef     = useRef<HTMLDivElement>(null)

  // Forward wheel events from the capture div to the actual scrollable container
  // underneath. Briefly set pointer-events:none to hit-test through the div,
  // walk up the DOM to find the first scrollable ancestor, and scroll it.
  useEffect(() => {
    const el = captureRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const multiplier = e.deltaMode === 1 ? 20 : e.deltaMode === 2 ? window.innerHeight : 1
      const dx = e.deltaX * multiplier
      const dy = e.deltaY * multiplier
      // Peek through the capture layer to find the real element under the cursor
      el.style.pointerEvents = 'none'
      const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      el.style.pointerEvents = 'all'
      // Walk up to find a scrollable container
      let node: HTMLElement | null = under
      while (node && node !== document.documentElement) {
        const cs = window.getComputedStyle(node)
        const canY = /auto|scroll/.test(cs.overflowY) && node.scrollHeight > node.clientHeight
        const canX = /auto|scroll/.test(cs.overflowX) && node.scrollWidth  > node.clientWidth
        if ((canY && dy !== 0) || (canX && dx !== 0)) { node.scrollBy(dx, dy); return }
        node = node.parentElement
      }
      window.scrollBy(dx, dy)
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => el.removeEventListener('wheel', onWheel)
  }, [inspectMode, visible])

  const C = THEMES[theme]

  // Coverage = any DS component (drifted or not) / total — "are you using the DS?"
  // Drift rate is tracked separately — "are you using it correctly?"
  const dsCount      = components.filter(c => c.inDS).length
  const driftedTotal = components.filter(c => c.drifted).length
  const total        = components.length
  const pct          = total ? Math.round((dsCount / total) * 100) : 0
  const pctColor     = pct < 50 ? C.red
    : pct < 75                             ? C.yellow
    : dsCount > 0 && driftedTotal / dsCount > 0.5 ? C.orange
    : C.green


  const scan = useCallback((forceRefresh = false) => {
    if (scanningRef.current) return
    scanningRef.current = true
    const gen = ++scanGenRef.current
    setScanning(true)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      // Bail if a newer scan was started (e.g. surfaceMode changed mid-scan)
      if (gen !== scanGenRef.current) { scanningRef.current = false; return }
      const route   = window.location.pathname
      const surface = surfaceRef.current
      const raw     = scanFiberTree(surface)
      const hash    = hashComponents(raw)
      const cached  = !forceRefresh ? loadScanCache(route, surface) : null

      let results: ScannedComponent[]
      let violations: ReturnType<typeof scanTokenViolations>
      let fromCache = false

      if (cached && cached.hash === hash) {
        // Cache hit — reuse violations, skip expensive DOM subtree scan
        results = raw.map(c => {
          const cachedViolations = cached.driftMap[c.name] ?? []
          return { ...c, drifted: cachedViolations.length > 0, driftViolations: cachedViolations }
        })
        violations = cached.tokenViolations.map(v => ({ ...v, type: v.type ?? 'color' as DriftViolationType, elements: [] }))
        fromCache = true
      } else {
        // Cache miss — full drift analysis
        results = raw.map(c => {
          if (!c.inDS) return c
          const driftViolations = getColorViolationsInSubtree(c.element)
          return { ...c, drifted: driftViolations.length > 0, driftViolations }
        })
        violations = scanTokenViolations()
        // Persist to cache
        const driftMap: Record<string, Array<{ prop: string; value: string; type: DriftViolationType }>> = {}
        results.filter(r => r.inDS && r.drifted).forEach(r => { driftMap[r.name] = r.driftViolations })
        saveScanCache(route, surface, { hash, driftMap, tokenViolations: violations })
      }

      const ds   = results.filter(r => r.inDS).length
      const gaps = results.filter(r => !r.inDS).length
      saveHistory({ path: route, pct: results.length ? Math.round((ds / results.length) * 100) : 0, ds, gaps, total: results.length })
      setHistory(loadHistory())
      setComponents(results)
      setTokenViolations(violations)
      setIsCached(fromCache)
      setScanned(true)
      setScanning(false)
      scanningRef.current = false
      scannedRouteRef.current = route
    }))
  }, [])

  const updateRects = useCallback(() => {
    setComponents(prev => prev.map(c => ({
      ...c,
      // If the element was unmounted mid-render, keep the last known rect instead
      // of overwriting with the zeros that detached nodes return.
      rect: c.element.isConnected ? c.element.getBoundingClientRect() : c.rect,
    })))
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem(THEME_KEY, next)
      return next
    })
  }, [])

  const handleSuggest = useCallback(async (
    name: string,
    count: number,
    props: Record<string, unknown>,
  ) => {
    if (suggestions[name]?.status === 'loading' || suggestions[name]?.status === 'done') return
    setSuggestions(prev => ({ ...prev, [name]: { status: 'loading' } }))
    try {
      const pages = [window.location.pathname]
      const text  = await fetchAISuggestion(name, count, props, pages)
      setSuggestions(prev => ({ ...prev, [name]: { status: 'done', text } }))
    } catch (err) {
      setSuggestions(prev => ({ ...prev, [name]: { status: 'error', text: String(err) } }))
    }
  }, [suggestions])

  const handleDriftFix = useCallback(async (name: string, violations: DriftViolation[]) => {
    if (driftFixes[name]?.status === 'loading' || driftFixes[name]?.status === 'done') return
    setDriftFixes(prev => ({ ...prev, [name]: { status: 'loading' } }))
    try {
      const text = await fetchDriftFix(name, violations)
      setDriftFixes(prev => ({ ...prev, [name]: { status: 'done', text } }))
    } catch (err) {
      setDriftFixes(prev => ({ ...prev, [name]: { status: 'error', text: String(err) } }))
    }
  }, [driftFixes])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable
      if (e.key === 'Escape') { if (inspected) { setInspected(null) } else { handleClosePanel() } return }
      if (inInput || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setVisible(v => !v) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // Inject gradient animation on mount — scan is deferred to first panel open
  useEffect(() => {
    injectGradientStyle()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open when parent signals (e.g. after StoryModal completes)
  useEffect(() => {
    if (autoOpen) {
      const t = setTimeout(() => setVisible(true), 400)
      return () => clearTimeout(t)
    }
  }, [autoOpen])

  // Click-outside to close — uses a document listener so the backdrop
  // div doesn't block page scrolling
  useEffect(() => {
    if (!visible) return
    const handler = (e: MouseEvent) => {
      // In inspect mode the capture layer owns all canvas clicks — never close
      if (inspectModeRef.current) return
      const panel   = document.querySelector('[data-dd-panel]')
      const toggle  = document.querySelector('[data-dd-toggle]')
      if (panel?.contains(e.target as Node))  return
      if (toggle?.contains(e.target as Node)) return
      setVisible(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [visible])

  // Validate DS registry on mount — both Storybook and Figma sources.
  // Storybook: drops storyPaths that no longer exist in the published index.
  // Figma: adds published Figma components to DS_COMPONENTS automatically.
  useEffect(() => {
    Promise.all([
      refreshDSFromStorybook(),
      refreshDSFromFigma(),
    ]).then(([sb]) => setRegistryValidated(sb.validated))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible) {
      // Keep components/scanned so collapsed button keeps showing metrics
      setInspectMode(false); setInspected(null); setHoverComp(null); setHoverPos(null)
      inspectModeRef.current = false
      return
    }
    setHistory(loadHistory())
    // Always rescan on open — SPAs never change pathname so the route check is
    // unreliable. The scan uses a component-hash cache, so same-page reopens
    // are instant; different-page reopens get a fresh scan with no stale overlays.
    setComponents([])
    setScanned(false)
    scannedRouteRef.current = null
    setInspectMode(true)
    inspectModeRef.current = true
    scan()
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Skip the initial mount — only fire when the user actually toggles the mode
    if (!modeInitRef.current) { modeInitRef.current = true; return }
    if (!visible) return
    // Abort any in-flight scan (bump gen + clear lock) so our fresh scan isn't blocked
    scanGenRef.current++
    scanningRef.current = false
    setScanning(false)
    setComponents([])
    setScanned(false)
    scan(true) // force fresh — bypass cache for the new surface mode
  }, [surfaceMode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible) return
    const target = document.querySelector('main') ?? document.body
    const onScroll = () => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(updateRects) }
    target.addEventListener('scroll', onScroll, { passive: true })
    return () => { target.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafRef.current) }
  }, [visible, updateRects])

  useEffect(() => {
    if (!visible || !scanned) return
    let timer: ReturnType<typeof setTimeout>
    const onResize = () => { clearTimeout(timer); timer = setTimeout(scan, 250) }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer) }
  }, [visible, scanned, scan])

  useEffect(() => {
    if (!visible || !scanned) return
    let mutTimer: ReturnType<typeof setTimeout>
    let lastPath = window.location.pathname
    const obs = new MutationObserver((mutations) => {
      // Ignore mutations that originate inside our own overlay — otherwise
      // re-rendering the overlay boxes triggers another scan → infinite loop.
      // Must check instanceof Element first: text nodes don't have .closest(),
      // and optional chaining returns undefined → !undefined = true (false positive).
      // Ignore mutations triggered by html2canvas DOM cloning
      if (capturingCount > 0) return
      const appMutation = mutations.some(m => {
        const el = m.target instanceof Element ? m.target : (m.target as Node).parentElement
        return !el?.closest('[data-ds-overlay]')
      })
      if (!appMutation) return
      clearTimeout(mutTimer)
      mutTimer = setTimeout(() => {
        const newPath = window.location.pathname
        if (newPath !== lastPath) {
          // Route changed — clear stale boxes, require user to re-scan
          lastPath = newPath
          clearScanCache(newPath)
          setInspected(null)
          setComponents([])
          setScanned(false)
        } else {
          // Same route — use hash comparison so only real component-tree
          // changes cause a re-render (transient mutations won't flicker)
          scan()
        }
      }, 400)
    })
    obs.observe(document.body, { childList: true, subtree: true })
    return () => { obs.disconnect(); clearTimeout(mutTimer) }
  }, [visible, scanned, scan])

  const handleClosePanel = () => {
    setIsClosing(true)
    setTimeout(() => { setIsClosing(false); setVisible(false) }, 220)
  }

  const displayed = filter === 'gaps' ? components.filter(c => !c.inDS) : components
  // Filter out zero-size elements: these are either detached DOM nodes whose
  // getBoundingClientRect() returned {0,0,0,0}, or components that are
  // genuinely hidden.  Rendering them causes all their badges to pile at the
  // top-left corner of the screen.
  const hovered  = hoveredGap ? displayed.filter(c => c.name === hoveredGap) : displayed
  const rendered = hovered.filter(c => c.rect.width > 0 && c.rect.height > 0)
  const offsets  = computeOffsets(rendered)
  // Keep ref current so event-handler callbacks don't close over stale data
  renderedRef.current = rendered

  // Single capture layer click handler — finds the smallest component at (x,y)
  // Fixes the "only DashboardView clickable" problem caused by large boxes
  // intercepting clicks before smaller nested ones can receive them.
  const handleCaptureClick = useCallback((e: React.MouseEvent) => {
    const { clientX: x, clientY: y } = e
    // Don't intercept clicks on our own panel / toggle button
    const panel  = document.querySelector('[data-dd-panel]')
    const toggle = document.querySelector('[data-dd-toggle]')
    if (panel?.contains(e.target as Node) || toggle?.contains(e.target as Node)) return
    const candidates = renderedRef.current.filter(c =>
      x >= c.rect.left && x <= c.rect.right &&
      y >= c.rect.top  && y <= c.rect.bottom
    )
    if (!candidates.length) return
    const target = candidates.reduce((a, b) =>
      a.rect.width * a.rect.height <= b.rect.width * b.rect.height ? a : b
    )
    setInspected(target)
    setHoverComp(null)
  }, [])

  const handleCaptureMove = useCallback((e: React.MouseEvent) => {
    const { clientX: x, clientY: y } = e
    setHoverPos({ x, y })
    const candidates = renderedRef.current.filter(c =>
      x >= c.rect.left && x <= c.rect.right &&
      y >= c.rect.top  && y <= c.rect.bottom
    )
    if (!candidates.length) { setHoverComp(null); return }
    const target = candidates.reduce((a, b) =>
      a.rect.width * a.rect.height <= b.rect.width * b.rect.height ? a : b
    )
    setHoverComp(prev => prev === target ? prev : target)
  }, [])

  return (
    <ThemeCtx.Provider value={C}>
      <div data-ds-overlay="true">
        {visible && rendered.map((c, i) => (
          <OverlayBox
            key={`${c.name}-${i}`}
            c={c}
            yOffset={offsets[i]}
            inspectMode={inspectMode}
            isInspected={inspected === c}
            isHighlighted={!!hoveredGap || hoverComp === c}
            onInspect={setInspected}
            isIgnored={ignored.has(c.name)}
          />
        ))}

        {/* Token violation hover — desaturate page, highlight matched elements in their actual color */}
        {visible && hoveredViolation && (() => {
          const pad   = 3
          const color = hoveredViolation.type === 'color' ? hoveredViolation.value : '#f97316'
          const rects = hoveredViolation.elements
            .map(el => el.getBoundingClientRect())
            .filter(r => r.width > 0 || r.height > 0)
          return (
            <>
              {/* Desaturate layer: white div with mix-blend-mode:saturation drains color
                  from everything below (z<99991). Our rings at 99993 are above it → full color. */}
              <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99991,
                background: 'white',
                mixBlendMode: 'saturation',
                opacity: 0.92,
              }} />
              {/* Colored ring overlays — above the desaturate layer, render in the violation color */}
              {rects.map((r, i) => (
                <div key={i} style={{
                  position: 'fixed',
                  top: r.top - pad, left: r.left - pad,
                  width: r.width + pad * 2, height: r.height + pad * 2,
                  outline: `2px solid ${color}`,
                  outlineOffset: '-1px',
                  background: `${color}18`,
                  boxShadow: `0 0 0 4px ${color}30`,
                  borderRadius: 4,
                  pointerEvents: 'none',
                  zIndex: 99993,
                  boxSizing: 'border-box',
                }} />
              ))}
            </>
          )
        })()}

        {/* Capture layer — always present when overlay is open so the user can
            hover to highlight any component and click to inspect it without
            having to toggle inspect mode manually. The panel/toggle are excluded
            from interception so the UI stays clickable. */}
        {visible && inspectMode && (
          <div
            ref={captureRef}
            data-dd-capture
            onMouseMove={handleCaptureMove}
            onMouseLeave={() => { setHoverComp(null); setHoverPos(null) }}
            onClick={handleCaptureClick}
            style={{
              position: 'fixed', inset: 0,
              zIndex: 99992,
              cursor: hoverComp ? 'pointer' : 'default',
              background: 'transparent',
            }}
          />
        )}

        {/* Hover tooltip — shows component name + DS status near the cursor.
            Hidden when the user toggles inspect mode off via the crosshair button. */}
        {visible && inspectMode && hoverComp && hoverPos && !inspected && (
          <div style={{
            position: 'fixed',
            left: Math.min(hoverPos.x + 14, window.innerWidth - 180),
            top: hoverPos.y - 32,
            pointerEvents: 'none',
            zIndex: 99995,
            background: C.panel,
            border: `1.5px solid ${hoverComp.inDS ? (hoverComp.drifted ? C.orange : C.green) : C.red}`,
            borderRadius: 8,
            padding: '4px 10px',
            boxShadow: C.shadow,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif',
              color: hoverComp.inDS ? (hoverComp.drifted ? C.orange : C.green) : C.red }}>
              {hoverComp.name}
            </span>
            <span style={{ fontSize: 10, color: C.muted, fontFamily: 'Inter, sans-serif' }}>
              {hoverComp.inDS ? (hoverComp.drifted ? 'drift' : 'DS') : 'custom'}
            </span>
            <span style={{ fontSize: 10, color: C.muted }}>· click to inspect</span>
          </div>
        )}

        {/* Floating panel — anchored bottom-right, capped height, above toggle button */}
        <style>{`
          @keyframes drift-slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes drift-slide-down { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(16px); } }
        `}</style>
        {visible && (
          <div data-dd-panel style={{
            position: 'fixed', bottom: 80, right: 16,
            width: 360, height: 'min(75vh, 660px)',
            background: C.panel, border: `1px solid ${C.panelBorder}`,
            borderRadius: 14,
            boxShadow: C.shadow,
            zIndex: 99998, display: 'flex', flexDirection: 'column',
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden',
            colorScheme: theme === 'light' ? 'light' : 'dark',
            animation: isClosing
              ? 'drift-slide-down 0.22s ease-in forwards'
              : 'drift-slide-up 0.22s ease-out',
          }}>
            {showSetup ? (
              <SetupWizard onDone={() => setShowSetup(false)} onClose={() => setShowSetup(false)} theme={theme} />
            ) : promotingComponent ? (
              <PromotePanel
                componentName={promotingComponent.name}
                count={promotingComponent.count}
                figmaFileKey={config.figmaFileKey ?? ''}
                storybookUrl={config.storybookUrl ?? 'http://localhost:6006'}
                onClose={() => setPromotingComponent(null)}
                onPromoted={handlePromoted}
              />
            ) : inspected ? (
              <PropsPanel component={inspected} onClose={() => setInspected(null)} />
            ) : (
              <SummaryPanel
                components={components} tokenViolations={tokenViolations} history={history}
                scanned={scanned} scanning={scanning} isCached={isCached} filter={filter} gapFilter={gapFilter}
                surfaceMode={surfaceMode} inspectMode={inspectMode}
                theme={theme} hoveredGap={hoveredGap}
                suggestions={suggestions} driftFixes={driftFixes}
                onFilterChange={setFilter} onGapFilterChange={setGapFilter} onRescan={() => scan(true)}
                onToggleSurface={() => setSurfaceMode(v => !v)}
                onToggleInspect={() => setInspectMode(v => !v)}
                onToggleTheme={toggleTheme}
                onHoverGap={handleHoverGap}
                hoveredViolation={hoveredViolation}
                onHoverViolation={setHoveredViolation}
                onInspect={setInspected}
                onSuggest={handleSuggest}
                onDriftFix={handleDriftFix}
                onClose={handleClosePanel}
                promotedComponents={promotedComponents}
                onPromote={(name, count) => setPromotingComponent({ name, count })}
                onOpenWaitlist={onOpenWaitlist}
                ignored={ignored}
                onApproveGap={approveGap}
                onUnapproveGap={unapproveGap}
                registryValidated={registryValidated}
              />
            )}
          </div>
        )}

        <div data-dd-toggle style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 99999 }}>
          <div className={visible ? undefined : 'dd-gradient-wrap'}>
            <ToggleButton
              visible={visible} pct={pct} pctColor={pctColor}
              scanned={scanned} scanning={scanning} inspectMode={inspectMode}
              driftedCount={driftedTotal}
              gapCount={components.filter(c => !c.inDS && !ignored.has(c.name)).length}
              onClick={() => setVisible(v => !v)}
            />
          </div>
        </div>
      </div>
    </ThemeCtx.Provider>
  )
}

// Named alias used by the @catchdrift/overlay npm package wrapper
export const DSCoverageOverlayWithConfig = DSCoverageOverlay
