import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rect { top: number; left: number; width: number; height: number }

interface Step {
  id: string
  title: string
  body: string
  selector?: string          // DOM element to spotlight
  tooltipSide?: 'top' | 'left' | 'bottom' | 'right' | 'center'
  action?: string            // "click hint" shown with arrow
  padding?: number           // spotlight padding around element
  onEnter?: () => void       // side-effect when step becomes active (e.g. click a button)
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome to the DesignDrift demo',
    body: "You're looking at Monument — a real React property management app built with a design system. DesignDrift scans it live and flags anything that's drifted from your tokens.",
    tooltipSide: 'center',
  },
  {
    id: 'toggle',
    title: 'The DesignDrift button',
    body: "This floating button lives in the corner of your app during development. The numbers show how many components are drifting from your design tokens.",
    selector: '[data-dd-toggle]',
    tooltipSide: 'top',
    padding: 12,
    action: 'Click the button to open the panel',
  },
  {
    id: 'panel',
    title: 'The overlay panel',
    body: "The panel shows every React component on the current page — which ones are from your design system, which are custom-built, and which ones have hardcoded styles overriding your tokens.",
    selector: '[data-dd-panel]',
    tooltipSide: 'left',
    padding: 8,
    onEnter: () => {
      // Auto-open the panel if it isn't already visible
      if (!document.querySelector('[data-dd-panel]')) {
        const btn = document.querySelector<HTMLElement>('[data-dd-toggle] button')
        btn?.click()
      }
    },

  },
  {
    id: 'tabs',
    title: 'Overview · Modifications · Style issues',
    body: "Tabs let you switch views. 'Modifications' shows DS components that have been overridden with custom styles — the most common source of drift. 'Style issues' catches hardcoded colors outside your token set.",
    selector: '[data-dd-tabs]',
    tooltipSide: 'left',
    padding: 6,
    onEnter: () => {
      // Panel may have just opened — wait for tabs to render then click Modifications
      const clickMods = () => {
        const tabs = document.querySelectorAll<HTMLElement>('[data-dd-tabs] button')
        const modsTab = Array.from(tabs).find(b => b.textContent?.includes('Modifications'))
        if (modsTab) { modsTab.click(); return true }
        return false
      }
      if (!clickMods()) {
        // Retry a few times if tabs aren't in DOM yet
        let attempts = 0
        const retry = setInterval(() => {
          if (clickMods() || ++attempts > 10) clearInterval(retry)
        }, 150)
      }
    },
  },
  {
    id: 'drift',
    title: 'Drift violations',
    body: "Each card here is a design system component that has custom styles applied on top. Click any card to open the inspector and see exactly which props are drifting — and get a one-click AI fix.",
    selector: '[data-dd-drift-summary]',
    tooltipSide: 'left',
    padding: 10,
    onEnter: () => {
      // Ensure Modifications tab is active, then scroll drift summary into view
      const activate = () => {
        const tabs = document.querySelectorAll<HTMLElement>('[data-dd-tabs] button')
        const modsTab = Array.from(tabs).find(b => b.textContent?.includes('Modifications'))
        if (!modsTab) return false
        modsTab.click()
        setTimeout(() => {
          document.querySelector('[data-dd-drift-summary]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 150)
        return true
      }
      if (!activate()) {
        let attempts = 0
        const retry = setInterval(() => {
          if (activate() || ++attempts > 10) clearInterval(retry)
        }, 150)
      }
    },
  },
  {
    id: 'done',
    title: "That's the full loop",
    body: "DesignDrift rescans every time the DOM changes — so when you or your AI assistant pushes new code, drift is caught immediately. No CI step required during development.",
    tooltipSide: 'center',
  },
]

// ─── Spotlight ────────────────────────────────────────────────────────────────

function useSpotlightRect(selector?: string, onFound?: () => void, deps?: unknown[]) {
  const [rect, setRect] = useState<Rect | null>(null)
  const onFoundRef = useRef(onFound)
  onFoundRef.current = onFound

  useLayoutEffect(() => {
    if (!selector) { setRect(null); onFoundRef.current?.(); return }
    const el = document.querySelector<HTMLElement>(selector)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    onFoundRef.current?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, ...(deps ?? [])])

  return rect
}

// ─── Tooltip position ─────────────────────────────────────────────────────────

const TOOLTIP_W     = 300
const TOOLTIP_PAD   = 16   // gap between spotlight edge and tooltip
const SCREEN_MARGIN = 12   // min distance from any viewport edge
// Conservative height estimate — keeps tooltip fully on-screen without measuring
const TOOLTIP_MAX_H = 340

/** Clamp a raw pixel value so the tooltip box stays inside the viewport */
function clampX(left: number) {
  return Math.max(SCREEN_MARGIN, Math.min(left, window.innerWidth - TOOLTIP_W - SCREEN_MARGIN))
}
function clampY(top: number) {
  return Math.max(SCREEN_MARGIN, Math.min(top, window.innerHeight - TOOLTIP_MAX_H - SCREEN_MARGIN))
}

function tooltipStyle(
  side: Step['tooltipSide'],
  rect: Rect | null,
  padding: number,
): React.CSSProperties {
  const base: React.CSSProperties = { position: 'fixed', width: TOOLTIP_W, maxHeight: TOOLTIP_MAX_H, overflowY: 'auto' }

  if (!rect || side === 'center') {
    return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxHeight: 'unset', overflowY: 'visible' }
  }

  const sp = {
    top:    rect.top    - padding,
    left:   rect.left   - padding,
    right:  rect.left   + rect.width  + padding,
    bottom: rect.top    + rect.height + padding,
    midX:   rect.left   + rect.width  / 2,
    midY:   rect.top    + rect.height / 2,
  }

  switch (side) {
    case 'left':
      return { ...base, top: clampY(sp.midY - TOOLTIP_MAX_H / 2), left: clampX(sp.left - TOOLTIP_W - TOOLTIP_PAD) }
    case 'right':
      return { ...base, top: clampY(sp.midY - TOOLTIP_MAX_H / 2), left: clampX(sp.right + TOOLTIP_PAD) }
    case 'top':
      return { ...base, top: clampY(sp.top - TOOLTIP_MAX_H - TOOLTIP_PAD), left: clampX(sp.midX - TOOLTIP_W / 2) }
    case 'bottom':
    default:
      return { ...base, top: clampY(sp.bottom + TOOLTIP_PAD), left: clampX(sp.midX - TOOLTIP_W / 2) }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const C = {
  bg:      'rgba(13,15,25,0.97)',
  border:  'rgba(255,255,255,0.12)',
  border2: 'rgba(255,255,255,0.06)',
  text:    '#e8eaf0',
  muted:   '#7a8499',
  blue:    '#4f8ef7',
  orange:  '#fb923c',
  green:   '#34d399',
}

export function GuidedTour({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep]         = useState(0)
  const [visible, setVisible]   = useState(false)
  const [tick, setTick]         = useState(0)
  // Hide tooltip until it has a measured position (prevents center→corner snap)
  const [positioned, setPositioned] = useState(false)

  const current = STEPS[step]

  // Fade in on mount
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  // On step change: reset positioned, fire onEnter with delay, then poll for DOM
  useEffect(() => {
    setPositioned(false)
    setTick(0)

    // Give the DOM time to render before firing onEnter actions
    const enterDelay = setTimeout(() => {
      current.onEnter?.()
    }, 80)

    // Poll for the target element (panel/tabs may take a few frames to appear)
    const id = setInterval(() => setTick(t => t + 1), 100)
    const stop = setTimeout(() => clearInterval(id), 1200)

    return () => { clearTimeout(enterDelay); clearInterval(id); clearTimeout(stop) }
  }, [step, current])

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
      if (e.key === 'ArrowRight' || e.key === 'Enter') advance()
      if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(onDismiss, 250)
  }, [onDismiss])

  const advance = useCallback(() => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else dismiss()
  }, [step, dismiss])

  const back = useCallback(() => {
    if (step > 0) setStep(s => s - 1)
  }, [step])

  const rect = useSpotlightRect(current.selector, () => setPositioned(true), [tick])
  const padding = current.padding ?? 10

  const isCenter = !current.selector || current.tooltipSide === 'center'
  // For center steps there's no element to find — show immediately
  useEffect(() => { if (isCenter) setPositioned(true) }, [isCenter])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s',
        pointerEvents: 'auto',
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      {/* ── Backdrop with spotlight cutout ─────────────────────────── */}
      {isCenter ? (
        // Full dim for centered steps
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)' }}
          onClick={advance}
        />
      ) : rect ? (
        // Four dim panels around the spotlight
        <>
          {/* Top */}
          <div onClick={advance} style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: rect.top - padding,
            background: 'rgba(0,0,0,0.7)',
          }} />
          {/* Bottom */}
          <div onClick={advance} style={{
            position: 'absolute', left: 0, right: 0,
            top: rect.top + rect.height + padding,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
          }} />
          {/* Left */}
          <div onClick={advance} style={{
            position: 'absolute',
            top: rect.top - padding,
            left: 0,
            width: rect.left - padding,
            height: rect.height + padding * 2,
            background: 'rgba(0,0,0,0.7)',
          }} />
          {/* Right */}
          <div onClick={advance} style={{
            position: 'absolute',
            top: rect.top - padding,
            left: rect.left + rect.width + padding,
            right: 0,
            height: rect.height + padding * 2,
            background: 'rgba(0,0,0,0.7)',
          }} />
          {/* Spotlight border ring */}
          <div style={{
            position: 'absolute',
            top:    rect.top    - padding,
            left:   rect.left   - padding,
            width:  rect.width  + padding * 2,
            height: rect.height + padding * 2,
            border: `2px solid ${C.blue}`,
            borderRadius: 12,
            boxShadow: `0 0 0 1px ${C.blue}30, 0 0 24px ${C.blue}30`,
            pointerEvents: 'none',
            animation: 'dd-tour-pulse 2s ease-in-out infinite',
          }} />
        </>
      ) : (
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }}
          onClick={advance}
        />
      )}

      {/* ── Tooltip card ───────────────────────────────────────────── */}
      <div
        style={{
          ...tooltipStyle(current.tooltipSide, rect, padding),
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: '20px 22px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          zIndex: 1,
          // Hide until position is known — prevents snap from center to corner
          opacity: positioned ? 1 : 0,
          transition: 'opacity 0.18s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Step counter dots — outside the keyed content so they don't re-animate */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {STEPS.map((_, i) => (
              <div key={i} onClick={() => setStep(i)} style={{
                width: i === step ? 20 : 6, height: 6, borderRadius: 999,
                background: i === step ? C.blue : i < step ? `${C.blue}50` : C.border,
                transition: 'all 0.2s', cursor: 'pointer',
              }} />
            ))}
          </div>
          <button
            onClick={dismiss}
            style={{
              background: 'none', border: 'none', color: C.muted,
              fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 2px',
            }}
          >×</button>
        </div>

        {/* Fading content block — re-keyed on step so it animates in */}
        <div key={step} style={{ animation: 'dd-step-fade 0.22s ease both' }}>
          <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.3 }}>
            {current.title}
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: current.action ? 12 : 20 }}>
            {current.body}
          </div>

          {/* Action hint — plain text style, not a button */}
          {current.action && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 18,
            }}>
              <span style={{ fontSize: 12 }}>↑</span>
              <span style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>{current.action}</span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {step > 0 && (
            <button
              onClick={back}
              style={{
                fontSize: 12, fontWeight: 600, padding: '7px 14px',
                background: 'none', color: C.muted,
                border: `1px solid ${C.border2}`, borderRadius: 8, cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={advance}
            style={{
              flex: 1, fontSize: 13, fontWeight: 700, padding: '8px 16px',
              background: C.blue, color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              boxShadow: `0 0 16px ${C.blue}40`,
            }}
          >
            {step === STEPS.length - 1 ? 'Start exploring →' : 'Next →'}
          </button>
        </div>

        {/* Skip + keyboard hint */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={dismiss}
            style={{
              background: 'none', border: 'none', fontSize: 11,
              color: `${C.muted}90`, cursor: 'pointer', padding: 0,
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            Skip tour
          </button>
          <span style={{ fontSize: 10, color: `${C.muted}60` }}>← → · Esc</span>
        </div>
      </div>

      {/* ── Pulse keyframe ─────────────────────────────────────────── */}
      <style>{`
        @keyframes dd-tour-pulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(79,142,247,0.3), 0 0 16px rgba(79,142,247,0.2); }
          50%       { box-shadow: 0 0 0 1px rgba(79,142,247,0.6), 0 0 32px rgba(79,142,247,0.35); }
        }
        @keyframes dd-step-fade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
