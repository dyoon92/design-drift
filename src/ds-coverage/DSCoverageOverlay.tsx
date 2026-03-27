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
import { scanFiberTree, hashComponents, type ScannedComponent } from './fiberScanner'
import { DS_STORY_PATHS, DS_FIGMA_LINKS, DS_COMPONENTS, STORYBOOK_URL } from './manifest'
import { scanTokenViolations, getColorViolationsInSubtree, type TokenViolation, type DriftViolation, type DriftViolationType } from './tokenChecker'

const SB_BASE         = STORYBOOK_URL
const BADGE_H         = 19
const PROMOTE_MIN     = 5
const HISTORY_KEY     = 'ds-coverage-history'
const HISTORY_MAX     = 15
const THEME_KEY       = 'ds-coverage-theme'
const API_KEY_KEY     = 'ds-coverage-anthropic-key'
const SCAN_CACHE_PFX  = 'ds-coverage-scan-'

// ─── Scan result cache ─────────────────────────────────────────────────────────

interface ScanCacheEntry {
  hash: string
  /** componentName → drift violations (serialisable subset) */
  driftMap: Record<string, Array<{ prop: string; value: string; type: DriftViolationType }>>
  tokenViolations: Array<{ prop: string; value: string; count: number }>
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
    green: '#22c55e', red: '#ef4444', yellow: '#f59e0b', blue: '#3b82f6', purple: '#a855f7', orange: '#f97316',
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
    green: '#16a34a', red: '#dc2626', yellow: '#b45309', blue: '#2563eb', purple: '#7c3aed', orange: '#ea580c',
    panel:          'rgba(255,255,255,0.98)',
    panelBorder:    'rgba(0,0,0,0.09)',
    text:           '#0f172a',
    textSub:        '#334155',
    muted:          '#536070',
    track:          'rgba(0,0,0,0.08)',
    btnBg:          'rgba(0,0,0,0.05)',
    kbdBg:          'rgba(0,0,0,0.06)',
    kbdText:        '#1e293b',
    divider:        'rgba(0,0,0,0.07)',
    toggleBg:       'rgba(255,255,255,0.88)',
    toggleBgOn:     'rgba(255,255,255,0.98)',
    toggleBorder:   'rgba(0,0,0,0.12)',
    toggleBorderOn: 'rgba(0,0,0,0.18)',
    shadow:         '0 8px 32px rgba(0,0,0,0.18)',
    toggleShadow:   '0 2px 8px rgba(0,0,0,0.12)',
    toggleShadowOn: '0 4px 16px rgba(0,0,0,0.18)',
    pillBg:         'rgba(0,0,0,0.06)',
    promoChipBg:    'rgba(124,58,237,0.10)',
    redChipBg:      'rgba(220,38,38,0.10)',
    inspectBg:      'rgba(37,99,235,0.12)',
    inspectBorder:  '#2563eb',
  },
} as const

const ThemeCtx = createContext<Colors>(THEMES.dark)
const useC = () => useContext(ThemeCtx)

const coverageColor = (pct: number, C: Colors) =>
  pct >= 75 ? C.green : pct >= 50 ? C.yellow : C.red

// ─── Page history ─────────────────────────────────────────────────────────────

interface HistoryEntry { path: string; pct: number; ds: number; gaps: number; total: number; ts: number }

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
    `## ${icon} DesignDrift Report — \`${window.location.pathname}\``,
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
  lines.push(`*Generated by DesignDrift · ${new Date().toLocaleString()}*`)
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
  ctx.fillText('DesignDrift (schematic)', 16, 26)
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
  '4px':    '--ds-border-radius-sm',
  '6px':    '--ds-border-radius-md',
  '8px':    '--ds-border-radius-lg',
  '999px':  '--ds-border-radius-full',
  '9999px': '--ds-border-radius-full',
  '50%':    '--ds-border-radius-full',
  '100%':   '--ds-border-radius-full',
}

function suggestToken(type: 'color' | 'radius', value: string): string | null {
  const norm = value.trim().toLowerCase()
  if (type === 'color')  return COLOR_TOKEN_MAP[norm]  ? `var(${COLOR_TOKEN_MAP[norm]})`  : null
  if (type === 'radius') return RADIUS_TOKEN_MAP[norm] ? `var(${RADIUS_TOKEN_MAP[norm]})` : null
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

type SuggestionStatus = 'idle' | 'loading' | 'done' | 'error'
interface Suggestion { status: SuggestionStatus; text?: string }

async function fetchAISuggestion(
  name: string,
  count: number,
  props: Record<string, unknown>,
  pages: string[],
  apiKey: string,
): Promise<string> {
  // ── Proxy mode: key lives server-side ────────────────────────────────────
  if (AI_PROXY_URL) {
    const res = await fetch(`${AI_PROXY_URL}/api/ai/suggest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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

  // ── Direct browser mode: key from localStorage (dev only) ────────────────
  const propsStr = Object.entries(props)
    .filter(([k]) => k !== 'children' && typeof props[k] !== 'function')
    .slice(0, 8)
    .map(([k, v]) => `${k}: ${fmtProp(k, v)}`)
    .join(', ') || '(none)'

  const dsList = [...DS_COMPONENTS].join(', ')

  const prompt =
`You're a design system consultant reviewing a React component in a property management app (StorageOS).

UNKNOWN COMPONENT: "${name}"
- Renders ${count} times across ${pages.length} page(s): ${pages.join(', ')}
- Current props: ${propsStr}

DESIGN SYSTEM AVAILABLE: ${dsList}

Respond in exactly 3 short sentences:
1. Can an existing DS component replace "${name}"? If yes, which one and how would you adapt it?
2. If no direct replacement: what is this component's pattern, and should it be promoted to the DS?
3. If promoting to DS: name 2-3 other places in a property management app where this pattern would be reused.
Be specific, concise, and actionable.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 280,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message ?? `API error ${res.status}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text ?? 'No suggestion available.'
}

// ─── Drift fix fetcher ────────────────────────────────────────────────────────

async function fetchDriftFix(
  name: string,
  violations: DriftViolation[],
  apiKey: string,
): Promise<string> {
  // ── Proxy mode ────────────────────────────────────────────────────────────
  if (AI_PROXY_URL) {
    const res = await fetch(`${AI_PROXY_URL}/api/ai/drift-fix`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, violations }),
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? `Proxy error ${res.status}`) }
    const data = await res.json()
    return data.text ?? '{}'
  }

  // ── Direct browser mode ───────────────────────────────────────────────────
  const tokenList = readLiveTokens() || '(no CSS custom properties found)'

  const violationLines = violations
    .map(v => `  ${v.prop}: "${v.value}"  (type: ${v.type})`)
    .join('\n')

  const prompt =
`You are a design system engineer. A DS React component has hardcoded inline style overrides that must be replaced with design tokens.

COMPONENT: ${name}
HARDCODED OVERRIDES:
${violationLines}

AVAILABLE DS TOKENS:
  ${tokenList}

Return ONLY a JSON object mapping each CSS property (camelCase) to its correct token replacement.
If no exact token exists, pick the closest one and note it.
Example: {"borderRadius": "var(--ds-border-radius-lg)", "color": "var(--ds-color-text-primary)"}
JSON only, no explanation outside the object.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey, 'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error?.message ?? `API ${res.status}`) }
  const data = await res.json()
  return data.content?.[0]?.text ?? '{}'
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

// ─── Scanner icon ─────────────────────────────────────────────────────────────

const ScanIcon = ({ size = 13, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <rect x="1" y="1" width="5" height="5" rx="1.5" fill={color} />
    <rect x="8" y="1" width="5" height="5" rx="1.5" fill={color} opacity="0.5" />
    <rect x="1" y="8" width="5" height="5" rx="1.5" fill={color} opacity="0.5" />
    <rect x="8" y="8" width="5" height="5" rx="1.5" fill={color} />
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

const OverlayBox = React.memo(({ c, yOffset, inspectMode, isInspected, isHighlighted, onInspect }: {
  c: ScannedComponent
  yOffset: number
  inspectMode: boolean
  isInspected: boolean
  isHighlighted: boolean
  onInspect: (c: ScannedComponent) => void
}) => {
  const C = useC()
  const storyPath = c.inDS ? DS_STORY_PATHS[c.name] : undefined
  const storyUrl  = storyPath ? `${SB_BASE}/?path=/story/${storyPath}` : undefined
  const figmaUrl  = c.inDS ? (DS_FIGMA_LINKS[c.name] || undefined) : undefined

  const baseColor   = c.drifted ? C.orange : c.inDS ? C.green : C.red
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
          {storyUrl && !inspectMode && (
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

// ─── AI fix-prompt builder ────────────────────────────────────────────────────

function buildFixPrompt(component: ScannedComponent): string {
  const violations = component.driftViolations ?? []

  if (violations.length === 0) {
    // Gap component — ask AI to find a DS replacement or tokenise it
    const mProps = component.fiber?.memoizedProps ?? {}
    const propLines = Object.entries(mProps)
      .filter(([k]) => k !== 'children' && typeof mProps[k] !== 'function')
      .slice(0, 6)
      .map(([k, v]) => `  ${k}: ${fmtProp(k, v)}`)
      .join('\n')
    return [
      `\`${component.name}\` is a custom-built component that is not in the design system.`,
      ``,
      `Find \`${component.name}\` in the codebase and either:`,
      `1. Replace it with the closest equivalent design system component, OR`,
      `2. If it's genuinely new, refactor it to use design tokens:`,
      `   • colours  → var(--ds-color-*)`,
      `   • spacing  → var(--ds-spacing-*)`,
      `   • corners  → var(--ds-border-radius-*)`,
      propLines ? `\nCurrent props detected at runtime:\n${propLines}` : '',
    ].filter(Boolean).join('\n')
  }

  // Drifted DS component — group violations and emit precise fix instructions
  type GV = { type: 'color' | 'radius'; value: string; props: string[] }
  const grouped = Object.values(
    violations.reduce<Record<string, GV>>((acc, v) => {
      const key = `${v.type}||${v.value}`
      if (!acc[key]) acc[key] = { type: v.type as 'color' | 'radius', value: v.value, props: [] }
      acc[key].props.push(v.prop)
      return acc
    }, {})
  )

  const lines = grouped.map(g => {
    const token = suggestToken(g.type, g.value)
    const where = g.type === 'radius' && g.props.length >= 4
      ? 'borderRadius (all corners)'
      : g.props.join(', ')
    return token
      ? `• \`${where}: ${g.value}\`  →  \`${token}\``
      : `• \`${where}: ${g.value}\`  →  closest token in src/tokens/variables.css (no exact match)`
  }).join('\n')

  return [
    `Fix \`${component.name}\` to use design system tokens instead of hardcoded values.`,
    ``,
    `Hardcoded overrides to replace:`,
    lines,
    ``,
    `Find the \`${component.name}\` component file and make exactly those substitutions.`,
    `Design tokens are defined in \`src/tokens/variables.css\`.`,
  ].join('\n')
}

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

const PropsPanel = ({ component, onClose, apiKey }: { component: ScannedComponent; onClose: () => void; apiKey: string }) => {
  const C       = useC()
  const props   = component.fiber?.memoizedProps ?? {}
  const entries = Object.entries(props).filter(([k]) => k !== 'children')

  const hasAction = component.drifted || !component.inDS
  const hasKey    = !!(apiKey || AI_PROXY_URL)

  // ── Structured fix state ──────────────────────────────────────────────────
  const [fixResponse,  setFixResponse]  = useState<string | null>(null)
  const [fixError,     setFixError]     = useState<string | null>(null)
  const [sending,      setSending]      = useState(false)
  const [hoveredCard,  setHoveredCard]  = useState<number | null>(null)
  const [copiedToast,  setCopiedToast]  = useState(false)
  const [fixTitle,     setFixTitle]     = useState('')

  useEffect(() => {
    setFixResponse(null)
    setFixError(null)
    setSending(false)
    setHoveredCard(null)
    setCopiedToast(false)
  }, [component.name])

  const buildSystemPrompt = () => {
    const violations = component.driftViolations ?? []
    const tokenList  = readLiveTokens() || '(no CSS custom properties found)'
    if (component.drifted && violations.length > 0) {
      const lines = violations.map(v => `  • ${v.prop}: "${v.value}" (type: ${v.type})`).join('\n')
      return `You are a design system engineer. Fix the React component \`${component.name}\` by replacing hardcoded overrides with design tokens. Reply with exact code snippets only — no explanations, no new styles, no invented values.\n\nHardcoded overrides:\n${lines}\n\nAvailable design tokens:\n  ${tokenList}`
    }
    return `You are a design system engineer. The component \`${component.name}\` is not in the design system. Suggest which existing DS component or token to use. Be concise, use code blocks.\n\nAvailable tokens:\n  ${readLiveTokens()}`
  }

  const firePrompt = async (userText: string, title: string) => {
    if (sending) return

    // No API key — silent clipboard copy + transient toast, no persistent area
    if (!hasKey) {
      try { await navigator.clipboard.writeText(buildFixPrompt(component)) } catch {}
      setCopiedToast(true)
      setTimeout(() => setCopiedToast(false), 2500)
      return
    }

    setFixTitle(title)
    setFixResponse(null)
    setFixError(null)
    setSending(true)

    try {
      const msgs = [{ role: 'user', content: userText }]
      let responseText: string
      if (AI_PROXY_URL) {
        const res = await fetch(`${AI_PROXY_URL}/api/ai/chat`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ system: buildSystemPrompt(), messages: msgs }),
        })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? `Proxy ${res.status}`) }
        responseText = (await res.json()).text ?? ''
      } else {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey, 'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001', max_tokens: 1024,
            system: buildSystemPrompt(),
            messages: msgs,
          }),
        })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error?.message ?? `API ${res.status}`) }
        const data = await res.json()
        responseText = data.content?.[0]?.text ?? ''
      }
      setFixResponse(responseText)
    } catch (err) {
      setFixError(String(err))
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
          <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>Fix prompt copied — paste into Claude Code</span>
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
              <ChatBubble msg={{ role: 'assistant', content: fixResponse }} C={C} />
            )}
          </div>
        )}

        {/* Style overrides — grouped by value, plain-English descriptions */}
        {component.drifted && component.driftViolations.length > 0 && (() => {
          // Group violations by type + value so e.g. all four border-radius props
          // with the same value collapse into one row instead of four.
          type GroupedV = { type: 'color' | 'radius'; value: string; props: string[] }
          const grouped = Object.values(
            component.driftViolations.reduce<Record<string, GroupedV>>((acc, v) => {
              const key = `${v.type}||${v.value}`
              if (!acc[key]) acc[key] = { type: v.type as 'color' | 'radius', value: v.value, props: [] }
              acc[key].props.push(v.prop)
              return acc
            }, {})
          )

          const describe = (type: 'color' | 'radius', value: string, props: string[]) => {
            if (type === 'radius') {
              const n = props.length
              if (n >= 4) return `All corners set to ${value}`
              if (n === 3) return `3 corners set to ${value}`
              if (n === 2) return `2 corners set to ${value}`
              // single corner — humanise the prop name
              const corner = props[0].replace('border-', '').replace('-radius', '').replace(/-/g, ' ')
              return `${corner} corner set to ${value}`
            }
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
                const fixOnePrompt = `Fix \`${component.name}\`: replace the hardcoded ${g.type === 'radius' ? 'border-radius' : 'color'} \`${g.value}\` (${label.toLowerCase()}) with the correct design token.${suggestion ? ` Use \`${suggestion}\`.` : ''}`
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
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 10, fontWeight: 700,
                            background: 'none', border: 'none', padding: 0,
                            color: '#7c3aed', cursor: sending ? 'default' : 'pointer',
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
        {entries.length === 0 && !component.drifted && (
          <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '24px 0' }}>No props</div>
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

      <div style={{ padding: '8px 16px', borderTop: `1px solid ${C.panelBorder}`, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: C.muted }}>Hover any element · click to switch · Esc to close</div>
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

const CoverageBar = ({ pct }: { pct: number }) => {
  const C = useC()
  return (
    <div style={{ height: 6, borderRadius: 3, background: C.track, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: coverageColor(pct, C), borderRadius: 3, transition: 'width 0.3s ease' }} />
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
  apiKey: string
  suggestions: Record<string, Suggestion>
  driftFixes: Record<string, Suggestion>
  onFilterChange: (f: 'all' | 'gaps') => void
  onGapFilterChange: (s: string) => void
  onRescan: () => void
  onToggleSurface: () => void
  onToggleInspect: () => void
  onToggleTheme: () => void
  onHoverGap: (name: string | null) => void
  onSaveApiKey: (key: string) => void
  onInspect: (c: ScannedComponent) => void
  onSuggest: (name: string, count: number, props: Record<string, unknown>) => void
  onDriftFix: (name: string, violations: DriftViolation[]) => void
  onClose: () => void
}

const SummaryPanel = (p: PanelProps) => {
  const C            = useC()
  const [tab,        setTab]       = useState<Tab>('overview')
  const [exported,   setExported]  = useState(false)
  const [mdCopied,   setMdCopied]  = useState(false)
  const [pngBusy,    setPngBusy]   = useState(false)
  const [keyDraft,   setKeyDraft]  = useState('')
  const [settingsPage, setSettingsPage] = useState(false)
  const [hoveredRow,       setHoveredRow]       = useState<string | null>(null)
  // Palette generator
  const [palette,       setPalette]      = useState<PaletteEntry[] | null>(null)
  const [paletteCopied, setPaletteCopied]= useState(false)
  // Bootstrap / register page
  const [bootstrapPage,    setBootstrapPage]    = useState(false)
  const [bootstrapSelected,setBootstrapSelected]= useState<Set<string>>(new Set())
  const [bootstrapCopied,  setBootstrapCopied]  = useState(false)

  const dsCount      = p.components.filter(c => c.inDS).length
  const driftedCount = p.components.filter(c => c.drifted).length
  const gapCount     = p.components.filter(c => !c.inDS).length
  const total        = p.components.length
  const pct          = total ? Math.round((dsCount / total) * 100) : 0
  const color        = coverageColor(pct, C)

  const gapMap = new Map<string, number>()
  p.components.filter(c => !c.inDS).forEach(c => gapMap.set(c.name, (gapMap.get(c.name) ?? 0) + 1))
  const gaps         = [...gapMap.entries()].sort((a, b) => b[1] - a[1])
  const promoteCount = gaps.filter(([, n]) => n >= PROMOTE_MIN).length

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
              Tell DesignDrift which components belong to your design system so it can track them for drift.
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

            {/* AI suggestions card */}
            <div style={{ background: C.btnBg, border: `1px solid ${C.panelBorder}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 0.6, marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>AI SUGGESTIONS</div>
              <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.55, marginBottom: 12, fontFamily: 'Inter, sans-serif' }}>
                Connect an Anthropic API key to get one-click fixes for drift and custom components.
              </div>
              {p.apiKey ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: `${C.blue}15`, borderRadius: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: C.blue, fontSize: 12 }}>✦</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.blue, fontFamily: 'Inter, sans-serif' }}>AI suggestions active</span>
                    </div>
                    <button onClick={() => p.onSaveApiKey('')} style={{
                      background: 'none', border: 'none', fontSize: 10, color: C.muted,
                      cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'Inter, sans-serif',
                    }}>Remove</button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="password"
                    placeholder="sk-ant-api03-..."
                    value={keyDraft}
                    onChange={e => setKeyDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && keyDraft) { p.onSaveApiKey(keyDraft); setKeyDraft('') } }}
                    style={{
                      width: '100%', boxSizing: 'border-box', marginBottom: 8,
                      background: C.panel, border: `1px solid ${C.panelBorder}`,
                      borderRadius: 8, padding: '8px 10px', fontSize: 11,
                      color: C.text, fontFamily: 'monospace', outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => { if (keyDraft) { p.onSaveApiKey(keyDraft); setKeyDraft('') } }}
                    disabled={!keyDraft}
                    style={{
                      width: '100%', background: keyDraft ? C.blue : C.pillBg, border: 'none',
                      borderRadius: 8, padding: '8px 0', color: keyDraft ? '#fff' : C.muted,
                      fontSize: 12, fontWeight: 600, cursor: keyDraft ? 'pointer' : 'default',
                      fontFamily: 'Inter, sans-serif', marginBottom: 10, transition: 'background 0.15s',
                    }}
                  >Save key</button>
                </div>
              )}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 10, color: C.blue, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}
              >
                Get an Anthropic API key →
              </a>
            </div>

          </div>
        </div>
      )}

      {/* ── Normal panel (hidden while bootstrap page or settings is open) ── */}
      {!bootstrapPage && !settingsPage && <>

      {/* ── Header row: title + icon buttons ────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: `1px solid ${C.panelBorder}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScanIcon size={13} color={C.blue} />
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2, color: C.text }}>DesignDrift</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
          {/* Identify — crosshair icon button.  Hover + click is always on when
              the panel is open; this button just toggles the name tooltip. */}
          <button
            onClick={p.onToggleInspect}
            title={p.inspectMode
              ? 'Inspect mode ON — hover any element to see what it is, click to inspect props. Click to hide tooltip. (press I)'
              : 'Inspect mode OFF — hover tooltips hidden. Click to re-enable. (press I)'}

            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: p.inspectMode ? C.inspectBg : C.btnBg,
              border: `1px solid ${p.inspectMode ? C.blue : C.panelBorder}`,
              borderRadius: 8, cursor: 'pointer', color: p.inspectMode ? C.blue : C.textSub,
            }}>
            {/* Crosshair icon */}
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
              <line x1="8" y1="1" x2="8" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <line x1="1" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
          {/* Close */}
          <button onClick={p.onClose} title="Close panel" style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: C.btnBg, border: `1px solid ${C.panelBorder}`,
            borderRadius: 8, cursor: 'pointer', color: C.muted, fontSize: 15, lineHeight: 1,
          }}>×</button>
        </div>
      </div>

      {/* ── Scan controls row: Quick/Full scan pills + Rescan ────────── */}
      <div style={{
        display: 'flex', gap: 6, alignItems: 'center',
        padding: '7px 14px',
        borderBottom: `1px solid ${C.panelBorder}`,
        flexShrink: 0,
      }}>
        {pill(p.surfaceMode,  'Quick scan', p.onToggleSurface, C.muted)}
        {pill(!p.surfaceMode, 'Full scan',  p.onToggleSurface, C.muted)}
        {p.isCached && !p.scanning && (
          <span title="Results are from cache — DOM unchanged since last scan" style={{
            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
            background: C.pillBg, color: C.muted, letterSpacing: 0.3,
          }}>CACHED</span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={p.onRescan} disabled={p.scanning} style={{
          background: p.scanning ? C.pillBg : C.blue,
          border: 'none', borderRadius: 8, padding: '4px 12px',
          cursor: p.scanning ? 'default' : 'pointer',
          color: p.scanning ? C.muted : '#fff', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          {p.scanning ? 'Scanning…' : p.isCached ? 'Force rescan' : 'Rescan'}
        </button>
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
            Analysing screen…
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
          {/* % + label */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
            <span style={{ fontSize: 10, color: C.muted }}>from your designs</span>
          </div>
          {/* Bar */}
          <CoverageBar pct={pct} />
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
          </div>
          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.panelBorder}` }}>
            <span style={{ fontSize: 10, color: C.muted }}>{total} elements</span>
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
                    const suggestion = p.suggestions[name]
                    const gapProps   = p.components.find(c => c.name === name)?.fiber?.memoizedProps ?? {}
                    const isHovered  = p.hoveredGap === name
                    const isFrequent = count >= PROMOTE_MIN
                    return (
                      <div key={name}>
                        <div
                          onMouseEnter={() => p.onHoverGap(name)}
                          onMouseLeave={() => p.onHoverGap(null)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '7px 0', cursor: 'default',
                            borderBottom: suggestion?.status === 'done' ? 'none' : `1px solid ${C.divider}`,
                            boxShadow: isHovered ? `inset 3px 0 0 ${C.red}` : 'none',
                            paddingLeft: isHovered ? 8 : 0,
                            transition: 'box-shadow 0.15s, padding-left 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                            {isFrequent && (
                              <span
                                title={`Used ${count} times — appears frequently enough to be worth designing and adding to your system`}
                                style={{ fontSize: 10, color: C.purple, cursor: 'help', flexShrink: 0 }}>
                                Worth designing
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                            {/* AI button — icon only, tooltip explains; only visible on hover */}
                            {p.apiKey ? (
                              <button
                                onClick={() => p.onSuggest(name, count, gapProps)}
                                disabled={suggestion?.status === 'loading' || suggestion?.status === 'done'}
                                title={suggestion?.status === 'done' ? 'Suggestion ready — see below' : 'Ask AI whether a designed component could replace this'}
                                style={{
                                  background: 'none', border: 'none', padding: '2px 4px',
                                  cursor: suggestion?.status === 'loading' || suggestion?.status === 'done' ? 'default' : 'pointer',
                                  fontSize: 12, color: suggestion?.status === 'done' ? C.blue : C.muted,
                                  opacity: isHovered ? (suggestion?.status === 'loading' ? 0.5 : 1) : 0,
                                  pointerEvents: isHovered ? 'auto' : 'none',
                                  transition: 'opacity 0.15s',
                                }}
                              >✦</button>
                            ) : (
                              <button onClick={() => setSettingsPage(true)} title="Add API key to enable AI suggestions"
                                style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', fontSize: 12, color: C.muted, opacity: isHovered ? 0.4 : 0, pointerEvents: isHovered ? 'auto' : 'none', transition: 'opacity 0.15s' }}>
                                ✦
                              </button>
                            )}
                            <span
                              title={`Renders ${count} time${count !== 1 ? 's' : ''} on this page`}
                              style={{ fontSize: 11, fontWeight: 600, color: C.muted, minWidth: 20, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {count}
                            </span>
                          </div>
                        </div>

                        {/* AI suggestion result */}
                        {suggestion?.status === 'done' && suggestion.text && (
                          <div style={{
                            margin: '0 0 8px 0', padding: '10px 12px',
                            background: C.pillBg, border: `1px solid ${C.panelBorder}`,
                            borderRadius: 8, fontSize: 11, color: C.text, lineHeight: 1.6,
                          }}>
                            <span style={{ fontWeight: 700, color: C.blue, fontSize: 10, display: 'block', marginBottom: 5 }}>✦ Replacement suggestion</span>
                            {suggestion.text}
                          </div>
                        )}
                        {suggestion?.status === 'error' && (
                          <div style={{ margin: '0 0 6px', padding: '6px 10px', background: C.redChipBg, borderRadius: 6, fontSize: 10, color: C.red }}>
                            {suggestion.text}
                          </div>
                        )}
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
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>All colours and shapes match your design palette</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: C.red, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{p.tokenViolations.length}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>colours not from your palette</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>these were set manually by the developer, not from your design tokens</div>
                  </div>
                </div>
                <div>
                  {p.tokenViolations.map((v, i) => {
                    const rowKey = `tok-${i}`
                    const isHov = hoveredRow === rowKey
                    return (
                      <div key={i}
                        onMouseEnter={() => setHoveredRow(rowKey)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '6px 0', gap: 6,
                          borderBottom: `1px solid ${C.divider}`,
                          boxShadow: isHov ? `inset 3px 0 0 ${C.red}` : 'none',
                          paddingLeft: isHov ? 8 : 0,
                          transition: 'box-shadow 0.15s, padding-left 0.15s',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <div style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, background: v.value, border: `1px solid rgba(0,0,0,0.18)`, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, fontFamily: 'monospace', letterSpacing: 0.2 }}>{v.prop}</div>
                            <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.value}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.red, background: C.redChipBg, padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>×{v.count}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 12, fontSize: 10, color: C.muted, lineHeight: 1.6, padding: '8px 10px', background: C.pillBg, borderRadius: 8 }}>
                  Ask your developer to replace these with colours from your design palette so the screen stays visually consistent.
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
        {/* AI suggestions prompt — only when no key set */}
        {!p.apiKey && (
          <button onClick={() => setSettingsPage(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
            padding: '8px 12px', background: `${C.blue}12`,
            border: `1px solid ${C.blue}30`, borderRadius: 8,
            cursor: 'pointer', textAlign: 'left', width: '100%',
          }}>
            <span style={{ fontSize: 14, color: C.blue }}>✦</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif' }}>Enable AI suggestions</div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: 'Inter, sans-serif' }}>One-click fixes for drift and custom components</div>
            </div>
          </button>
        )}
        {/* Keyboard shortcuts */}
        <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', lineHeight: 1.7 }}>
          <kbd style={{ background: C.kbdBg, color: C.kbdText, padding: '1px 7px', borderRadius: 4, fontFamily: 'monospace', border: `1px solid ${C.panelBorder}`, fontSize: 11 }}>D</kbd>
          {' show/hide · '}
          <kbd style={{ background: C.kbdBg, color: C.kbdText, padding: '1px 7px', borderRadius: 4, fontFamily: 'monospace', border: `1px solid ${C.panelBorder}`, fontSize: 11 }}>I</kbd>
          {' inspect · '}
          <kbd style={{ background: C.kbdBg, color: C.kbdText, padding: '1px 7px', borderRadius: 4, fontFamily: 'monospace', border: `1px solid ${C.panelBorder}`, fontSize: 11 }}>Esc</kbd>
          {' close'}
        </div>
      </div>

      </> /* end !bootstrapPage && !settingsPage */ }
    </div>
  )
}

// ─── Toggle button ────────────────────────────────────────────────────────────

const ToggleButton = ({ visible, pct, scanned, scanning, inspectMode, driftedCount, gapCount, onClick }: {
  visible: boolean; pct: number
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
      <PaletteIcon size={20} color={'#a855f7'} />

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
            fontSize: 11, fontWeight: 700, color: C.green,
            background: `${C.green}18`, padding: '2px 7px', borderRadius: 20,
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

export function DSCoverageOverlay() {
  const [theme,          setTheme]          = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) ?? 'dark')
  const [visible,        setVisible]        = useState(false)
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
  const [apiKey,         setApiKey]         = useState<string>(() => localStorage.getItem(API_KEY_KEY) ?? '')
  const [suggestions,    setSuggestions]    = useState<Record<string, Suggestion>>({})
  const [driftFixes,     setDriftFixes]     = useState<Record<string, Suggestion>>({})
  const [isCached,       setIsCached]       = useState(false)

  const [hoverComp,  setHoverComp]  = useState<ScannedComponent | null>(null)
  const [hoverPos,   setHoverPos]   = useState<{ x: number; y: number } | null>(null)

  const rafRef      = useRef<number>(0)
  const scanningRef = useRef(false)
  const surfaceRef  = useRef(surfaceMode)
  surfaceRef.current = surfaceMode
  // Keep a ref so the capture-layer handlers can access latest rendered list
  // without needing to be re-registered on every render.
  const renderedRef = useRef<ScannedComponent[]>([])

  const C = THEMES[theme]

  // Coverage = any DS component (drifted or not) / total — "are you using the DS?"
  // Drift rate is tracked separately — "are you using it correctly?"
  const dsCount = components.filter(c => c.inDS).length
  const total   = components.length
  const pct     = total ? Math.round((dsCount / total) * 100) : 0


  const scan = useCallback((forceRefresh = false) => {
    if (scanningRef.current) return
    scanningRef.current = true
    setScanning(true)
    requestAnimationFrame(() => requestAnimationFrame(() => {
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
        violations = cached.tokenViolations
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

  const saveApiKey = useCallback((key: string) => {
    const trimmed = key.trim()
    localStorage.setItem(API_KEY_KEY, trimmed)
    setApiKey(trimmed)
  }, [])

  const handleSuggest = useCallback(async (
    name: string,
    count: number,
    props: Record<string, unknown>,
  ) => {
    if (!apiKey) return
    if (suggestions[name]?.status === 'loading' || suggestions[name]?.status === 'done') return
    setSuggestions(prev => ({ ...prev, [name]: { status: 'loading' } }))
    try {
      const pages = [window.location.pathname]
      const text  = await fetchAISuggestion(name, count, props, pages, apiKey)
      setSuggestions(prev => ({ ...prev, [name]: { status: 'done', text } }))
    } catch (err) {
      setSuggestions(prev => ({ ...prev, [name]: { status: 'error', text: String(err) } }))
    }
  }, [apiKey, suggestions])

  const handleDriftFix = useCallback(async (name: string, violations: DriftViolation[]) => {
    if (!apiKey) return
    if (driftFixes[name]?.status === 'loading' || driftFixes[name]?.status === 'done') return
    setDriftFixes(prev => ({ ...prev, [name]: { status: 'loading' } }))
    try {
      const text = await fetchDriftFix(name, violations, apiKey)
      setDriftFixes(prev => ({ ...prev, [name]: { status: 'done', text } }))
    } catch (err) {
      setDriftFixes(prev => ({ ...prev, [name]: { status: 'error', text: String(err) } }))
    }
  }, [apiKey, driftFixes])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable
      if (e.key === 'Escape') { setInspectMode(false); setInspected(null); return }
      if (inInput || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setVisible(v => !v) }
      if (e.key === 'i' || e.key === 'I') { e.preventDefault(); setInspectMode(v => !v) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // Inject gradient animation + auto-scan on mount
  useEffect(() => {
    injectGradientStyle()
    scan()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Click-outside to close — uses a document listener so the backdrop
  // div doesn't block page scrolling
  useEffect(() => {
    if (!visible) return
    const handler = (e: MouseEvent) => {
      const panel   = document.querySelector('[data-dd-panel]')
      const toggle  = document.querySelector('[data-dd-toggle]')
      const capture = document.querySelector('[data-dd-capture]')
      // Don't close when clicking the panel, toggle, or the capture layer
      // (the capture layer handles its own click → inspect logic)
      if (panel?.contains(e.target as Node))   return
      if (toggle?.contains(e.target as Node))  return
      if (capture?.contains(e.target as Node)) return
      setVisible(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [visible])

  useEffect(() => {
    if (!visible) {
      // Keep components/scanned so collapsed button keeps showing metrics
      setInspectMode(false); setInspected(null); setHoverComp(null); setHoverPos(null)
      return
    }
    setHistory(loadHistory())
    if (!scanned) scan()
    // Auto-enter inspect mode so the user can immediately hover + click to explore
    setInspectMode(true)
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (visible && scanned) scan() }, [surfaceMode]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!visible) return
    const main = document.querySelector('main')
    if (!main) return
    // DOM changed — invalidate cache and re-scan, but debounce so rapid React
    // reconciliation passes (which fire many childList mutations in quick
    // succession) don't trigger a storm of expensive re-scans.  The 400 ms
    // window covers a full React render cycle comfortably.
    let mutTimer: ReturnType<typeof setTimeout>
    const obs = new MutationObserver(() => {
      clearTimeout(mutTimer)
      mutTimer = setTimeout(() => {
        clearScanCache(window.location.pathname)
        setInspected(null)
        scan(true)
      }, 400)
    })
    obs.observe(main, { childList: true })
    return () => { obs.disconnect(); clearTimeout(mutTimer) }
  }, [visible, scan])

  const handleClosePanel = () => { setVisible(false) }

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
          />
        ))}

        {/* Capture layer — always present when overlay is open so the user can
            hover to highlight any component and click to inspect it without
            having to toggle inspect mode manually. The panel/toggle are excluded
            from interception so the UI stays clickable. */}
        {visible && (
          <div
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
          }}>
            {inspected ? (
              <PropsPanel component={inspected} onClose={() => setInspected(null)} apiKey={apiKey} />
            ) : (
              <SummaryPanel
                components={components} tokenViolations={tokenViolations} history={history}
                scanned={scanned} scanning={scanning} isCached={isCached} filter={filter} gapFilter={gapFilter}
                surfaceMode={surfaceMode} inspectMode={inspectMode}
                theme={theme} hoveredGap={hoveredGap}
                apiKey={apiKey} suggestions={suggestions} driftFixes={driftFixes}
                onFilterChange={setFilter} onGapFilterChange={setGapFilter} onRescan={() => scan(true)}
                onToggleSurface={() => setSurfaceMode(v => !v)}
                onToggleInspect={() => setInspectMode(v => !v)}
                onToggleTheme={toggleTheme}
                onHoverGap={setHoveredGap}
                onSaveApiKey={saveApiKey}
                onInspect={setInspected}
                onSuggest={handleSuggest}
                onDriftFix={handleDriftFix}
                onClose={handleClosePanel}
              />
            )}
          </div>
        )}

        <div data-dd-toggle style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 99999 }}>
          <div className="dd-gradient-wrap">
            <ToggleButton
              visible={visible} pct={pct}
              scanned={scanned} scanning={scanning} inspectMode={inspectMode}
              driftedCount={components.filter(c => c.drifted).length}
              gapCount={components.filter(c => !c.inDS).length}
              onClick={() => setVisible(v => !v)}
            />
          </div>
        </div>
      </div>
    </ThemeCtx.Provider>
  )
}
