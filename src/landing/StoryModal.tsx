import React, { useState, useEffect, useCallback } from 'react'

interface StoryModalProps {
  onDone: () => void
}

const STEPS = [
  {
    icon: <img src="/figma-logo.svg" style={{ width: 44, height: 44, display: 'block' }} alt="Figma" />,
    iconColor: '#7c3aed',
    title: 'Your design system lives in Figma',
    body: 'Designers define every component, token, and spacing rule. Figma is the source of truth — the contract between what was designed and what gets built.',
    visual: 'figma',
  },
  {
    icon: <img src="/storybook-icon.webp" style={{ width: 44, height: 44, display: 'block' }} alt="Storybook" />,
    iconColor: '#4f8ef7',
    title: 'Developers build them in Storybook',
    body: "Each component gets implemented, documented, and catalogued. Storybook becomes the living bridge between design and code — and Drift reads it to know your system.",
    visual: 'storybook',
  },
  {
    icon: <span style={{ fontSize: 44, lineHeight: 1, display: 'block' }}>⚡</span>,
    iconColor: '#f59e0b',
    title: 'Then AI enters the picture',
    body: "Cursor and Claude can now build entire screens in seconds using your Storybook components. Most of the time it works great. But sometimes AI invents a one-off card, hardcodes a color, or skips your spacing tokens.",
    visual: 'code',
  },
  {
    icon: <span style={{ fontSize: 44, lineHeight: 1, display: 'block', color: '#ef4444' }}>◎</span>,
    iconColor: '#ef4444',
    title: 'Drift measures what actually shipped',
    body: "Drift reads the live React fiber tree — not static code, but what's actually running on screen. Every component is classified, every hardcoded token flagged. You see the real coverage number, not an estimate.",
    visual: 'coverage',
  },
  {
    icon: <span style={{ fontSize: 44, lineHeight: 1, display: 'block' }}>✦</span>,
    iconColor: '#34d399',
    title: 'Every PR shows the drift delta',
    body: "The GitHub Action posts coverage before and after to every pull request. Designers see what AI changed. Engineers fix drift before review. PMs track coverage as a real metric. The loop is closed.",
    visual: 'loop',
    isFinal: true,
  },
]

function FigmaVisual() {
  const items = [
    { label: 'Button', color: '#7c3aed' },
    { label: 'Modal', color: '#4f8ef7' },
    { label: 'Navbar', color: '#34d399' },
    { label: 'Badge', color: '#f59e0b' },
    { label: 'Input', color: '#ef4444' },
  ]
  return (
    <div style={{ background: '#13131f', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map(it => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: it.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#9090aa', fontFamily: 'Inter, sans-serif' }}>{it.label}</span>
          <div style={{ flex: 1, height: 1, background: '#272738', marginLeft: 4 }} />
          <span style={{ fontSize: 10, color: '#4a4a60' }}>component</span>
        </div>
      ))}
    </div>
  )
}

function StorybookVisual() {
  const items = ['Button', 'Modal', 'Navbar', 'Badge', 'Input', 'Dropdown']
  return (
    <div style={{ background: '#13131f', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map(it => (
        <div key={it} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#34d399' }}>✓</span>
          <span style={{ fontSize: 12, color: '#9090aa', fontFamily: 'Inter, sans-serif' }}>{it}</span>
        </div>
      ))}
    </div>
  )
}

function CodeVisual() {
  const lines = [
    { text: 'function UnitCard({ unit }) {', highlight: false },
    { text: '  return (', highlight: false },
    { text: '    <div style={{ background: "#fff",', highlight: true },
    { text: '      padding: "24px", borderRadius: "8px" }}>', highlight: true },
    { text: '      <h3>{unit.name}</h3>', highlight: false },
    { text: '    </div>', highlight: false },
    { text: '  )', highlight: false },
    { text: '}', highlight: false },
  ]
  return (
    <div style={{ background: '#0a0a14', borderRadius: 10, padding: '12px 14px', fontFamily: 'monospace', fontSize: 11 }}>
      {lines.map((l, i) => (
        <div key={i} style={{
          color: l.highlight ? '#f97316' : '#6060a0',
          background: l.highlight ? 'rgba(249,115,22,0.10)' : 'transparent',
          padding: '1px 4px', borderRadius: 3, marginBottom: 1,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{l.text}</span>
          {l.highlight && <span style={{ fontSize: 9, color: '#f97316', background: 'rgba(249,115,22,0.2)', padding: '1px 5px', borderRadius: 4 }}>custom · not in DS</span>}
        </div>
      ))}
    </div>
  )
}

function CoverageVisual() {
  return (
    <div style={{ background: '#13131f', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#9090aa', fontFamily: 'Inter, sans-serif' }}>DS Coverage</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b', fontFamily: 'Inter, sans-serif' }}>77%</span>
      </div>
      <div style={{ height: 8, background: '#272738', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: '77%', height: '100%', background: 'linear-gradient(90deg, #7c3aed, #4f8ef7)', borderRadius: 4 }} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['UnitCard · drifted', 'PaymentRow · custom', 'StatusPill · drifted'].map(label => (
          <span key={label} style={{ fontSize: 10, color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 4, padding: '2px 7px', fontFamily: 'Inter, sans-serif' }}>{label}</span>
        ))}
      </div>
    </div>
  )
}

function LoopVisual() {
  const steps = ['Figma → design', 'Storybook → build', 'AI → ship', 'Drift → catch', 'PR → fix']
  return (
    <div style={{ background: '#13131f', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden' }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 10, color: '#34d399', fontWeight: 600, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</div>
          </div>
          {i < steps.length - 1 && <span style={{ color: '#3a3a55', fontSize: 14, flexShrink: 0, margin: '0 2px' }}>›</span>}
        </div>
      ))}
    </div>
  )
}

const VISUALS: Record<string, () => React.ReactElement> = {
  figma: FigmaVisual,
  storybook: StorybookVisual,
  code: CodeVisual,
  coverage: CoverageVisual,
  loop: LoopVisual,
}

export function StoryModal({ onDone }: StoryModalProps) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [contentVisible, setContentVisible] = useState(true)

  useEffect(() => {
    // Fade in on mount
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const goTo = useCallback((next: number) => {
    setContentVisible(false)
    setTimeout(() => {
      setStep(next)
      setContentVisible(true)
    }, 160)
  }, [])

  const handleDone = useCallback(() => {
    setVisible(false)
    setTimeout(onDone, 300)
  }, [onDone])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && step < STEPS.length - 1) goTo(step + 1)
      else if (e.key === 'ArrowLeft' && step > 0) goTo(step - 1)
      else if (e.key === 'Escape') handleDone()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [step, goTo, handleDone])

  const current = STEPS[step]
  const Visual = VISUALS[current.visual]

  return (
    <>
      <style>{`
        @keyframes sm-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sm-fade-out { from { opacity: 1; } to { opacity: 0; } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleDone}
        style={{
          position: 'fixed', inset: 0, zIndex: 999990,
          background: 'rgba(0,0,0,0.82)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
        }}
      />

      {/* Modal card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', inset: 0, zIndex: 999991,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px 16px',
          pointerEvents: 'none',
        }}
      >
        <div style={{
          maxWidth: 580, width: '100%',
          background: '#0f0f18',
          border: '1px solid #272738',
          borderRadius: 20,
          padding: '44px 48px',
          pointerEvents: 'all',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>

          {/* Content area — fades on step change */}
          <div style={{
            opacity: contentVisible ? 1 : 0,
            transition: 'opacity 0.16s ease',
          }}>
            {/* Icon */}
            <div style={{ marginBottom: 16 }}>
              {current.icon}
            </div>

            {/* Step label */}
            <div style={{ fontSize: 11, color: '#6b6b82', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Step {step + 1} of {STEPS.length}
            </div>

            {/* Title */}
            <h2 style={{ margin: '0 0 14px', fontSize: 22, fontWeight: 700, color: '#eeeef4', lineHeight: 1.25 }}>
              {current.title}
            </h2>

            {/* Body */}
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#9090aa', lineHeight: 1.7 }}>
              {current.body}
            </p>

            {/* Visual */}
            <div style={{ marginBottom: 24 }}>
              <Visual />
            </div>

            {/* Final step bonus line */}
            {current.isFinal && (
              <p style={{ fontSize: 12, color: '#6b6b82', margin: '0 0 20px', fontStyle: 'italic', lineHeight: 1.6 }}>
                Coming soon: create Jira tickets directly from drift gaps to assign component-building work to your team.
              </p>
            )}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            {/* Prev button */}
            <button
              onClick={() => step > 0 && goTo(step - 1)}
              disabled={step === 0}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: step === 0 ? 'transparent' : 'rgba(255,255,255,0.07)',
                border: '1px solid ' + (step === 0 ? 'transparent' : '#2a2a3e'),
                color: step === 0 ? 'transparent' : '#9090aa',
                cursor: step === 0 ? 'default' : 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              ← Back
            </button>

            {/* Step dots */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  onClick={() => goTo(i)}
                  style={{
                    width: i === step ? 20 : 7,
                    height: 7,
                    borderRadius: 4,
                    background: i === step ? '#7c3aed' : '#2a2a3e',
                    cursor: 'pointer',
                    transition: 'all 0.22s ease',
                  }}
                />
              ))}
            </div>

            {/* Next / Done button */}
            {current.isFinal ? (
              <button
                onClick={handleDone}
                style={{
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'linear-gradient(135deg, #7c3aed, #4f8ef7)',
                  border: 'none', color: '#fff', cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
                }}
              >
                Explore the demo →
              </button>
            ) : (
              <button
                onClick={() => goTo(step + 1)}
                style={{
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'rgba(255,255,255,0.09)',
                  border: '1px solid #2a2a3e',
                  color: '#eeeef4', cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                Next →
              </button>
            )}
          </div>

          {/* Skip hint — only on final step */}
          {current.isFinal && (
            <p style={{ textAlign: 'center', fontSize: 11, color: '#4a4a60', marginTop: 16, marginBottom: 0 }}>
              Press Escape or click outside to skip
            </p>
          )}
        </div>
      </div>
    </>
  )
}
