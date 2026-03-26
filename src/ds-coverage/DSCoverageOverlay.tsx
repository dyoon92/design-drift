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
 * Toggle:  Ctrl+Shift+D  or  click the floating badge
 * Inspect: click any red badge, or Ctrl+Shift+I for inspect-everything mode
 */

import React, { useState, useEffect, useRef, useCallback, useContext, createContext } from 'react'
import { scanFiberTree, type ScannedComponent } from './fiberScanner'
import { DS_STORY_PATHS, DS_FIGMA_LINKS, DS_COMPONENTS } from './manifest'
import { scanTokenViolations, getColorViolationsInSubtree, type TokenViolation, type DriftViolation } from './tokenChecker'

const SB_BASE         = 'http://localhost:6006'
const BADGE_H         = 19
const PROMOTE_MIN     = 5
const HISTORY_KEY     = 'ds-coverage-history'
const HISTORY_MAX     = 15
const THEME_KEY       = 'ds-coverage-theme'
const API_KEY_KEY     = 'ds-coverage-anthropic-key'

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

// ─── AI suggestion types + fetcher ───────────────────────────────────────────

type SuggestionStatus = 'idle' | 'loading' | 'done' | 'error'
interface Suggestion { status: SuggestionStatus; text?: string }

async function fetchAISuggestion(
  name: string,
  count: number,
  props: Record<string, unknown>,
  pages: string[],
  apiKey: string,
): Promise<string> {
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
  const tokenList = [
    '--ds-border-radius-sm: 4px', '--ds-border-radius-md: 6px',
    '--ds-border-radius-lg: 8px', '--ds-border-radius-full: 999px',
    '--ds-color-primary: #7d52f7', '--ds-color-text-primary: #161616',
    '--ds-color-text-muted: #94a0b8', '--ds-color-border: #e1e5ef',
    '--ds-color-surface: #ffffff', '--ds-color-surface-subtle: #f7f9fb',
    '--ds-color-error: #e02c3b', '--ds-color-success: #08875c',
    '--ds-color-page-bg: #f1f3f9',
  ].join('\n  ')

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
    fontSize: 9, fontWeight: 700, fontFamily: 'Inter, sans-serif',
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

// ─── Props inspector panel ────────────────────────────────────────────────────

const PropsPanel = ({ component, onClose }: { component: ScannedComponent; onClose: () => void }) => {
  const C       = useC()
  const props   = component.fiber?.memoizedProps ?? {}
  const entries = Object.entries(props).filter(([k]) => k !== 'children')

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden',
      fontFamily: 'Inter, sans-serif', color: C.text,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: `1px solid ${C.panelBorder}`, flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{component.name}</div>
          <div style={{ fontSize: 10, marginTop: 2, color: component.inDS ? C.green : C.red }}>
            {component.inDS ? '● In design system' : '● Not in design system'}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: C.btnBg, border: 'none', borderRadius: 6,
          color: C.muted, cursor: 'pointer', fontSize: 14, padding: '4px 8px',
        }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>

        {/* Drift violations — shown first if present */}
        {component.drifted && component.driftViolations.length > 0 && (
          <div style={{ marginBottom: 14, padding: '10px', background: `${C.orange}18`, borderRadius: 8, border: `1px solid ${C.orange}40` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.orange, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
              ⚠ Token Drift — {component.driftViolations.length} hardcoded override{component.driftViolations.length > 1 ? 's' : ''}
            </div>
            {component.driftViolations.map((v, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: `1px solid ${C.orange}20` }}>
                {v.type === 'color' ? (
                  <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, background: v.value, border: `1px solid rgba(0,0,0,0.2)` }} />
                ) : null}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{v.prop}: </span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.orange, fontWeight: 600 }}>{v.value}</span>
                </div>
                <span style={{ fontSize: 8, fontWeight: 700, color: C.orange, background: `${C.orange}25`, padding: '1px 5px', borderRadius: 4, flexShrink: 0, textTransform: 'uppercase' }}>
                  {v.type}
                </span>
              </div>
            ))}
            <div style={{ fontSize: 9, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>
              Replace with <code style={{ background: C.kbdBg, padding: '0 3px', borderRadius: 3 }}>var(--ds-color-*)</code>
              {' '}or <code style={{ background: C.kbdBg, padding: '0 3px', borderRadius: 3 }}>var(--ds-border-radius-*)</code>
            </div>
          </div>
        )}

        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
          memoizedProps
        </div>
        {entries.length === 0
          ? <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '24px 0' }}>No props</div>
          : entries.map(([key, val]) => (
            <div key={key} style={{
              display: 'flex', gap: 8, padding: '6px 0',
              borderBottom: `1px solid ${C.divider}`, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 11, color: C.blue, fontFamily: 'monospace', fontWeight: 600, flexShrink: 0, minWidth: 90 }}>{key}</span>
              <span style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', color: C.text, opacity: 0.85 }}>{fmtProp(key, val)}</span>
            </div>
          ))
        }
        {props.children !== undefined && (
          <div style={{ marginTop: 8, fontSize: 10, color: C.muted, fontStyle: 'italic' }}>children omitted</div>
        )}
      </div>

      <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.panelBorder}`, flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: C.muted }}>Click any red badge to switch · Esc to close</div>
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
          fontSize: 9, fontWeight: 700, padding: '0 5px', borderRadius: 10,
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
  scanned: boolean; scanning: boolean
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
  onSuggest: (name: string, count: number, props: Record<string, unknown>) => void
  onDriftFix: (name: string, violations: DriftViolation[]) => void
  onClose: () => void
}

const SummaryPanel = (p: PanelProps) => {
  const C            = useC()
  const [tab,        setTab]       = useState<Tab>('overview')
  const [exported,   setExported]  = useState(false)
  const [keyDraft,   setKeyDraft]  = useState('')
  const [showKeyBox, setShowKeyBox]= useState(false)
  const [hoveredRow,       setHoveredRow]       = useState<string | null>(null)
  const [copiedFix,        setCopiedFix]        = useState<string | null>(null)
  const [hoveredViolation, setHoveredViolation] = useState<string | null>(null)

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

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'Inter, sans-serif', color: C.text,
    }}>

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
          {/* Theme toggle */}
          <button onClick={p.onToggleTheme} title="Toggle light/dark mode" style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: C.btnBg, border: `1px solid ${C.panelBorder}`, borderRadius: 7,
            cursor: 'pointer', color: C.textSub,
          }}>
            {p.theme === 'dark' ? (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M14 8.53A6 6 0 117.47 2 4.5 4.5 0 0014 8.53z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          {/* Identify — crosshair icon button */}
          <button
            onClick={p.onToggleInspect}
            title="Click any element on screen to inspect its props and see which DS component it maps to (Ctrl+Shift+I)"
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: p.inspectMode ? C.inspectBg : C.btnBg,
              border: `1px solid ${p.inspectMode ? C.blue : C.panelBorder}`,
              borderRadius: 7, cursor: 'pointer', color: p.inspectMode ? C.blue : C.textSub,
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
            borderRadius: 7, cursor: 'pointer', color: C.muted, fontSize: 15, lineHeight: 1,
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
        <div style={{ flex: 1 }} />
        <button onClick={p.onRescan} disabled={p.scanning} style={{
          background: p.scanning ? C.pillBg : C.blue,
          border: 'none', borderRadius: 7, padding: '4px 12px',
          cursor: p.scanning ? 'default' : 'pointer',
          color: p.scanning ? C.muted : '#fff', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          {p.scanning ? 'Scanning…' : 'Rescan'}
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
        <div style={{ textAlign: 'center', padding: '32px 16px', fontSize: 12, color: C.muted }}>
          Analysing screen…
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
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1.5, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
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
            <button onClick={handleExport} title="Copy a markdown coverage report to clipboard" style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 10, color: exported ? C.green : C.muted, fontFamily: 'Inter, sans-serif',
            }}>
              <span>{exported ? '✓' : '⎘'}</span>
              <span>{exported ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Tab bar — top level, full width ──────────────────────────── */}
      {p.scanned && !p.scanning && (
        <div style={{ borderBottom: `1px solid ${C.panelBorder}`, flexShrink: 0 }}>
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

              {/* Compact AI hint when no key set */}
              {!p.apiKey && gaps.length > 0 && !showKeyBox && (
                <button onClick={() => setShowKeyBox(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginBottom: 8,
                  padding: '6px 10px', background: 'none',
                  border: `1px solid ${C.panelBorder}`, borderRadius: 7,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: 11, color: C.muted }}>✦</span>
                  <span style={{ fontSize: 11, color: C.muted, fontFamily: 'Inter, sans-serif' }}>Add API key for AI replacement suggestions</span>
                </button>
              )}

              {/* Gap list */}
              {gaps.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
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
                      borderRadius: 7, padding: '5px 9px', fontSize: 11,
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
                                style={{ fontSize: 9, color: C.purple, cursor: 'help', flexShrink: 0 }}>
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
                              <button onClick={() => setShowKeyBox(true)} title="Add API key to enable AI suggestions"
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

              {/* API key setup box */}
              {showKeyBox && (
                <div style={{ marginTop: 10, padding: '10px', background: C.pillBg, borderRadius: 8, border: `1px solid ${C.panelBorder}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 2 }}>Enable AI suggestions</div>
                  <div style={{ fontSize: 9, color: C.muted, marginBottom: 8 }}>Add an Anthropic API key to get suggestions for replacing custom-built elements with designed components. Stored in your browser only.</div>
                  <input
                    type="password"
                    placeholder="sk-ant-..."
                    value={keyDraft}
                    onChange={e => setKeyDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { p.onSaveApiKey(keyDraft); setShowKeyBox(false) } }}
                    autoFocus
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: C.panel, border: `1px solid ${C.panelBorder}`,
                      borderRadius: 5, padding: '6px 8px', fontSize: 11,
                      color: C.text, fontFamily: 'monospace', outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                    <button onClick={() => { p.onSaveApiKey(keyDraft); setShowKeyBox(false) }} style={{
                      flex: 1, background: C.blue, border: 'none', borderRadius: 5,
                      padding: '5px 0', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>Save key</button>
                    <button onClick={() => setShowKeyBox(false)} style={{
                      background: C.pillBg, border: `1px solid ${C.panelBorder}`, borderRadius: 5,
                      padding: '5px 8px', color: C.muted, fontSize: 11, cursor: 'pointer',
                    }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* API key status */}
              {p.apiKey && !showKeyBox && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: `${C.blue}10`, borderRadius: 6 }}>
                  <span style={{ fontSize: 9, color: C.blue, fontWeight: 600 }}>✦ AI suggestions active</span>
                  <button onClick={() => { p.onSaveApiKey(''); setShowKeyBox(false) }} style={{
                    background: 'none', border: 'none', fontSize: 9, color: C.muted,
                    cursor: 'pointer', padding: 0, textDecoration: 'underline',
                  }}>Clear key</button>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: C.orange, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{driftedCount}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>designed components modified</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>custom styles were applied on top of the design</div>
                  </div>
                </div>
                <div>
                  {p.components.filter(c => c.drifted).map((c, i) => {
                    const fix = p.driftFixes[c.name]
                    // Build a fix snippet from AI JSON response
                    let fixSnippet = ''
                    if (fix?.status === 'done' && fix.text) {
                      try {
                        const jsonMatch = fix.text.match(/\{[\s\S]*\}/)
                        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
                        if (parsed) {
                          fixSnippet = Object.entries(parsed)
                            .map(([k, v]) => `  ${k}: '${v}',`)
                            .join('\n')
                        }
                      } catch { fixSnippet = fix.text }
                    }
                    const copyKey = `fix-${c.name}`
                    return (
                      <div key={`${c.name}-${i}`}
                        onMouseEnter={() => p.onHoverGap(c.name)}
                        onMouseLeave={() => p.onHoverGap(null)}
                        style={{
                          marginBottom: 10, padding: '12px', borderRadius: 10,
                          background: C.panel, border: `1px solid ${C.panelBorder}`,
                          boxShadow: p.hoveredGap === c.name ? `inset 3px 0 0 ${C.orange}` : '0 1px 4px rgba(0,0,0,0.08)',
                          transition: 'box-shadow 0.15s',
                        }}>
                        {/* Component header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.orange, fontFamily: 'Inter, sans-serif' }}>{c.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {p.apiKey && (
                              <button
                                onClick={() => p.onDriftFix(c.name, c.driftViolations)}
                                disabled={fix?.status === 'loading' || fix?.status === 'done'}
                                title="Ask AI to suggest how to restore this to its designed state"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 3,
                                  background: fix?.status === 'done' ? `${C.blue}20` : `${C.blue}10`,
                                  border: `1px solid ${fix?.status === 'done' ? C.blue : `${C.blue}40`}`,
                                  borderRadius: 7, padding: '3px 8px', cursor: fix?.status === 'loading' || fix?.status === 'done' ? 'default' : 'pointer',
                                  fontSize: 10, fontWeight: 600, color: fix?.status === 'done' ? C.blue : C.textSub,
                                  fontFamily: 'Inter, sans-serif',
                                }}>
                                <span>✦</span>
                                <span>{fix?.status === 'loading' ? 'Thinking…' : fix?.status === 'done' ? 'Suggestion ready' : 'Suggest fix'}</span>
                              </button>
                            )}
                            <span style={{ fontSize: 10, color: C.muted, background: `${C.orange}20`, padding: '2px 7px', borderRadius: 6 }}>
                              {c.driftViolations.length} change{c.driftViolations.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Violations list — grouped by type+value */}
                        {Object.values(
                          c.driftViolations.reduce((acc, v) => {
                            const key = `${v.type}||${v.value}`
                            if (!acc[key]) acc[key] = { type: v.type, value: v.value, props: [] }
                            acc[key].props.push(v.prop)
                            return acc
                          }, {} as Record<string, { type: 'color' | 'radius', value: string, props: string[] }>)
                        ).map((v, j) => {
                          const suggestion = suggestToken(v.type, v.value)
                          const propLabel = v.type === 'radius' ? 'border-radius' : v.props[0].replace(/([A-Z])/g, '-$1').toLowerCase()
                          const violKey = `${i}-${j}`
                          const isViolHovered = hoveredViolation === violKey
                          return (
                            <div key={j}
                              onMouseEnter={() => { p.onHoverGap(c.name); setHoveredViolation(violKey) }}
                              onMouseLeave={() => { p.onHoverGap(null); setHoveredViolation(null) }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: isViolHovered ? '5px 6px' : '5px 0',
                                margin: isViolHovered ? '0 -6px' : '0',
                                borderBottom: `1px solid ${C.orange}15`,
                                cursor: 'default',
                                borderRadius: isViolHovered ? 6 : 0,
                                background: isViolHovered
                                  ? (v.type === 'color' ? `${v.value}18` : `${C.orange}10`)
                                  : 'transparent',
                                transition: 'background 0.15s',
                              }}>
                              {v.type === 'color' && (
                                <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, background: v.value, border: '1px solid rgba(0,0,0,0.18)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, color: C.text, fontFamily: 'Inter, sans-serif' }}>
                                  <span style={{ color: C.muted }}>{propLabel}: </span>
                                  <span style={{ fontWeight: 600, color: C.orange }}>{v.value}</span>
                                  {v.props.length > 1 && (
                                    <span style={{ fontSize: 9, color: C.muted, marginLeft: 5 }}>×{v.props.length} props</span>
                                  )}
                                </div>
                                {suggestion && (
                                  <div style={{ fontSize: 10, color: C.green, marginTop: 2, fontFamily: 'monospace' }}>
                                    → {suggestion}
                                  </div>
                                )}
                              </div>
                              <span style={{ fontSize: 9, color: C.muted, background: C.pillBg, padding: '1px 5px', borderRadius: 4, flexShrink: 0, textTransform: 'capitalize' }}>{v.type}</span>
                            </div>
                          )
                        })}

                        {/* Fix snippet */}
                        {fix?.status === 'done' && fixSnippet && (
                          <div style={{ marginTop: 10, background: C.panel, border: `1px solid ${C.blue}30`, borderRadius: 7, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderBottom: `1px solid ${C.blue}20` }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: C.blue }}>✦ How to restore it</span>
                              <button
                                onClick={async () => {
                                  const code = `// ${c.name} — replace hardcoded styles with DS tokens:\n${fixSnippet}`
                                  try { await navigator.clipboard.writeText(code) } catch { prompt('Copy:', code) }
                                  setCopiedFix(copyKey); setTimeout(() => setCopiedFix(null), 2000)
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: copiedFix === copyKey ? C.green : C.muted, fontFamily: 'Inter, sans-serif' }}>
                                {copiedFix === copyKey ? '✓ Copied' : '⎘ Copy'}
                              </button>
                            </div>
                            <pre style={{ margin: 0, padding: '8px 10px', fontSize: 10, fontFamily: 'monospace', color: C.text, overflowX: 'auto', lineHeight: 1.6 }}>
                              {fixSnippet}
                            </pre>
                          </div>
                        )}
                        {fix?.status === 'error' && (
                          <div style={{ marginTop: 8, padding: '6px 10px', background: C.redChipBg, borderRadius: 6, fontSize: 10, color: C.red }}>{fix.text}</div>
                        )}
                        {!p.apiKey && (
                          <div style={{ marginTop: 8, fontSize: 10, color: C.muted, lineHeight: 1.5 }}>
                            Add an API key in <button onClick={() => setShowKeyBox(true)} style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 10, padding: 0, textDecoration: 'underline' }}>Overview</button> to get suggestions for restoring this component.
                          </div>
                        )}
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
                            <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, fontFamily: 'monospace', letterSpacing: 0.2 }}>{v.prop}</div>
                            <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.value}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.red, background: C.redChipBg, padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>×{v.count}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 12, fontSize: 10, color: C.muted, lineHeight: 1.6, padding: '8px 10px', background: C.pillBg, borderRadius: 7 }}>
                  Ask your developer to replace these with colours from your design palette so the screen stays visually consistent.
                </div>
              </>
            )
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
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>Screens reviewed</div>
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
      <div style={{ flexShrink: 0, marginTop: 12, fontSize: 10, color: C.textSub, textAlign: 'center', lineHeight: 1.7, borderTop: `1px solid ${C.panelBorder}`, paddingTop: 10 }}>
        <kbd style={{ background: C.kbdBg, color: C.kbdText, padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', border: `1px solid ${C.panelBorder}` }}>⌃⇧D</kbd>
        {' show/hide · '}
        <kbd style={{ background: C.kbdBg, color: C.kbdText, padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', border: `1px solid ${C.panelBorder}` }}>⌃⇧I</kbd>
        {' identify'}
      </div>
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

  const rafRef      = useRef<number>(0)
  const scanningRef = useRef(false)
  const surfaceRef  = useRef(surfaceMode)
  surfaceRef.current = surfaceMode

  const C = THEMES[theme]

  // Coverage = any DS component (drifted or not) / total — "are you using the DS?"
  // Drift rate is tracked separately — "are you using it correctly?"
  const dsCount = components.filter(c => c.inDS).length
  const total   = components.length
  const pct     = total ? Math.round((dsCount / total) * 100) : 0


  const scan = useCallback(() => {
    if (scanningRef.current) return
    scanningRef.current = true
    setScanning(true)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const raw     = scanFiberTree(surfaceRef.current)
      // Mark drift: DS components whose rendered subtree has hardcoded color values
      const results = raw.map(c => {
        if (!c.inDS) return c
        const driftViolations = getColorViolationsInSubtree(c.element)
        return { ...c, drifted: driftViolations.length > 0, driftViolations }
      })
      const violations = scanTokenViolations()
      const ds         = results.filter(r => r.inDS).length
      const gaps       = results.filter(r => !r.inDS).length
      saveHistory({ path: window.location.pathname, pct: results.length ? Math.round((ds / results.length) * 100) : 0, ds, gaps, total: results.length })
      setHistory(loadHistory())
      setComponents(results)
      setTokenViolations(violations)
      setScanned(true)
      setScanning(false)
      scanningRef.current = false
    }))
  }, [])

  const updateRects = useCallback(() => {
    setComponents(prev => prev.map(c => ({ ...c, rect: c.element.getBoundingClientRect() })))
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
      if (e.ctrlKey && e.shiftKey && e.key === 'D') { e.preventDefault(); setVisible(v => !v) }
      if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); setInspectMode(v => !v) }
      if (e.key === 'Escape') { setInspectMode(false); setInspected(null) }
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
      const panel  = document.querySelector('[data-dd-panel]')
      const toggle = document.querySelector('[data-dd-toggle]')
      if (
        panel  && !panel.contains(e.target as Node) &&
        toggle && !toggle.contains(e.target as Node)
      ) {
        setVisible(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [visible])

  useEffect(() => {
    if (!visible) {
      // Keep components/scanned so collapsed button keeps showing metrics
      setInspectMode(false); setInspected(null)
      return
    }
    setHistory(loadHistory())
    if (!scanned) scan()
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
    const obs = new MutationObserver(() => { setInspected(null); scan() })
    obs.observe(main, { childList: true })
    return () => obs.disconnect()
  }, [visible, scan])

  const handleClosePanel = () => { setVisible(false) }

  const displayed = filter === 'gaps' ? components.filter(c => !c.inDS) : components
  const offsets   = computeOffsets(displayed)

  // Single capture layer click handler — finds the smallest component at (x,y)
  // Fixes the "only DashboardView clickable" problem caused by large boxes
  // intercepting clicks before smaller nested ones can receive them.
  const handleCaptureClick = useCallback((e: React.MouseEvent) => {
    const { clientX: x, clientY: y } = e
    const candidates = displayed.filter(c =>
      x >= c.rect.left && x <= c.rect.right &&
      y >= c.rect.top  && y <= c.rect.bottom
    )
    if (!candidates.length) { setInspected(null); return }
    const target = candidates.reduce((a, b) =>
      a.rect.width * a.rect.height <= b.rect.width * b.rect.height ? a : b
    )
    setInspected(target)
  }, [displayed])

  return (
    <ThemeCtx.Provider value={C}>
      <div data-ds-overlay="true">
        {visible && (hoveredGap ? displayed.filter(c => c.name === hoveredGap) : displayed).map((c, i) => (
          <OverlayBox
            key={`${c.name}-${i}`}
            c={c}
            yOffset={offsets[i]}
            inspectMode={inspectMode}
            isInspected={inspected === c}
            isHighlighted={!!hoveredGap}
            onInspect={setInspected}
          />
        ))}

        {/* Transparent capture layer — in inspect mode this sits above all boxes
            and uses coordinate math to select the smallest component at click pos.
            This fixes large parent boxes (DashboardView) blocking clicks on children. */}
        {visible && inspectMode && (
          <div
            onClick={handleCaptureClick}
            title="Click any component to inspect its props"
            style={{
              position: 'fixed', inset: 0,
              zIndex: 99992,
              cursor: 'crosshair',
              background: 'transparent',
            }}
          />
        )}

        {/* Floating panel — anchored bottom-right, capped height, above toggle button */}
        {visible && (
          <div data-dd-panel style={{
            position: 'fixed', bottom: 80, right: 16,
            width: 360, maxHeight: 'min(75vh, 660px)',
            background: C.panel, border: `1px solid ${C.panelBorder}`,
            borderRadius: 14,
            boxShadow: C.shadow,
            zIndex: 99998, display: 'flex', flexDirection: 'column',
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden',
          }}>
            {inspected ? (
              <PropsPanel component={inspected} onClose={() => { setInspected(null); setInspectMode(false) }} />
            ) : (
              <SummaryPanel
                components={components} tokenViolations={tokenViolations} history={history}
                scanned={scanned} scanning={scanning} filter={filter} gapFilter={gapFilter}
                surfaceMode={surfaceMode} inspectMode={inspectMode}
                theme={theme} hoveredGap={hoveredGap}
                apiKey={apiKey} suggestions={suggestions} driftFixes={driftFixes}
                onFilterChange={setFilter} onGapFilterChange={setGapFilter} onRescan={scan}
                onToggleSurface={() => setSurfaceMode(v => !v)}
                onToggleInspect={() => setInspectMode(v => !v)}
                onToggleTheme={toggleTheme}
                onHoverGap={setHoveredGap}
                onSaveApiKey={saveApiKey}
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
