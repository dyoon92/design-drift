import { useState, useEffect, useLayoutEffect, useCallback } from 'react'

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
    body: "This floating button lives in the corner of your app during development. The badge shows how many components are drifting. Click it to open the panel.",
    selector: '[data-dd-toggle]',
    tooltipSide: 'left',
    padding: 12,
    action: 'Click to open the panel',
  },
  {
    id: 'panel',
    title: 'The overlay panel',
    body: "The panel shows every React component on the current page — which ones are from your design system, which are custom-built, and which ones have hardcoded styles overriding your tokens.",
    selector: '[data-dd-panel]',
    tooltipSide: 'left',
    padding: 8,
  },
  {
    id: 'tabs',
    title: 'Overview · Modifications · Style issues',
    body: "Tabs let you switch views. 'Modifications' shows DS components that have been overridden with custom styles — the most common source of drift. 'Style issues' catches hardcoded colors outside your token set.",
    selector: '[data-dd-tabs]',
    tooltipSide: 'left',
    padding: 6,
    action: 'Click "Modifications" to see drift',
  },
  {
    id: 'drift',
    title: 'Drift violations',
    body: "Each card here is a design system component that has custom styles applied on top. Click any card to open the inspector and see exactly which props are drifting — and get a one-click AI fix.",
    selector: '[data-dd-drift-summary]',
    tooltipSide: 'left',
    padding: 10,
    action: 'Click a card to inspect it',
  },
  {
    id: 'done',
    title: "That's the full loop",
    body: "DesignDrift rescans every time the DOM changes — so when you or your AI assistant pushes new code, drift is caught immediately. No CI step required during development.",
    tooltipSide: 'center',
  },
]

// ─── Spotlight ────────────────────────────────────────────────────────────────

function useSpotlightRect(selector?: string, deps?: unknown[]) {
  const [rect, setRect] = useState<Rect | null>(null)

  useLayoutEffect(() => {
    if (!selector) { setRect(null); return }
    const el = document.querySelector<HTMLElement>(selector)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, ...(deps ?? [])])

  return rect
}

// ─── Tooltip position ─────────────────────────────────────────────────────────

const TOOLTIP_W = 320
const TOOLTIP_PAD = 20  // gap from spotlight edge

function tooltipStyle(
  side: Step['tooltipSide'],
  rect: Rect | null,
  padding: number,
): React.CSSProperties {
  if (!rect || side === 'center') {
    return {
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: TOOLTIP_W,
    }
  }

  const sp = { // spotlight box
    top:    rect.top    - padding,
    left:   rect.left   - padding,
    right:  rect.left   + rect.width  + padding,
    bottom: rect.top    + rect.height + padding,
  }

  switch (side) {
    case 'left':
      return {
        position: 'fixed',
        top:  Math.max(16, sp.top + (rect.height / 2) - 100),
        left: Math.max(16, sp.left - TOOLTIP_W - TOOLTIP_PAD),
        width: TOOLTIP_W,
      }
    case 'right':
      return {
        position: 'fixed',
        top:  Math.max(16, sp.top + (rect.height / 2) - 100),
        left: Math.min(window.innerWidth - TOOLTIP_W - 16, sp.right + TOOLTIP_PAD),
        width: TOOLTIP_W,
      }
    case 'top':
      return {
        position: 'fixed',
        bottom: window.innerHeight - sp.top + TOOLTIP_PAD,
        left: Math.max(16, sp.left + rect.width / 2 - TOOLTIP_W / 2),
        width: TOOLTIP_W,
      }
    case 'bottom':
    default:
      return {
        position: 'fixed',
        top: sp.bottom + TOOLTIP_PAD,
        left: Math.max(16, sp.left + rect.width / 2 - TOOLTIP_W / 2),
        width: TOOLTIP_W,
      }
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
  const [step, setStep]     = useState(0)
  const [visible, setVisible] = useState(false)
  const [tick, setTick]     = useState(0)  // force re-measure

  const current = STEPS[step]

  // Fade in
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  // Re-measure on step change (DOM might not have the element yet)
  useEffect(() => {
    current.onEnter?.()
    // poll briefly in case the selector element isn't rendered yet
    const id = setInterval(() => setTick(t => t + 1), 120)
    const stop = setTimeout(() => clearInterval(id), 800)
    return () => { clearInterval(id); clearTimeout(stop) }
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

  const rect = useSpotlightRect(current.selector, [tick])
  const padding = current.padding ?? 10

  const isCenter = !current.selector || current.tooltipSide === 'center'

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
        }}
        // Stop click from bubbling to backdrop (which advances)
        onClick={e => e.stopPropagation()}
      >
        {/* Step counter */}
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

        {/* Content */}
        <div style={{ fontFamily: '"Syne", system-ui, sans-serif', fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.3 }}>
          {current.title}
        </div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: current.action ? 14 : 20 }}>
          {current.body}
        </div>

        {/* Action hint */}
        {current.action && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            marginBottom: 18, padding: '7px 12px', borderRadius: 8,
            background: `${C.blue}12`, border: `1px solid ${C.blue}25`,
          }}>
            <span style={{ fontSize: 14 }}>👆</span>
            <span style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>{current.action}</span>
          </div>
        )}

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

        {/* Keyboard hint */}
        <div style={{ marginTop: 10, fontSize: 10, color: `${C.muted}80`, textAlign: 'center' }}>
          ← → arrow keys · Esc to skip
        </div>
      </div>

      {/* ── Pulse keyframe ─────────────────────────────────────────── */}
      <style>{`
        @keyframes dd-tour-pulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(79,142,247,0.3), 0 0 16px rgba(79,142,247,0.2); }
          50%       { box-shadow: 0 0 0 1px rgba(79,142,247,0.6), 0 0 32px rgba(79,142,247,0.35); }
        }
      `}</style>
    </div>
  )
}
