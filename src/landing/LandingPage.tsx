import { useState, useEffect, useCallback } from 'react'

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       '#09090f',
  surface:  '#0f0f18',
  surface2: '#13131f',
  border:   '#1e1e2e',
  border2:  '#272738',
  text:     '#eeeef4',
  muted:    '#6b6b82',
  sub:      '#9999b0',
  blue:     '#4f8ef7',
  blueGlow: 'rgba(79,142,247,0.15)',
  green:    '#34d399',
  purple:   '#a78bfa',
  orange:   '#fb923c',
  pink:     '#f472b6',
  amber:        '#f59e0b',
}

const mono: React.CSSProperties    = { fontFamily: '"JetBrains Mono","Fira Code",monospace' }
const sans: React.CSSProperties    = { fontFamily: '"DM Sans",system-ui,sans-serif' }
const display: React.CSSProperties = { fontFamily: '"Space Grotesk",system-ui,sans-serif' }
const claudeOrange = '#D97757'

// ─── Claude logo (asterisk burst) ─────────────────────────────────────────────
function ClaudeLogo({ size = 32 }: { size?: number }) {
  const RAYS = 12
  const INNER = 10, OUTER = 38
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="22" fill="#D97757"/>
      {Array.from({ length: RAYS }).map((_, i) => {
        const a = ((i * 360 / RAYS) - 90) * Math.PI / 180
        return (
          <line key={i}
            x1={50 + INNER * Math.cos(a)} y1={50 + INNER * Math.sin(a)}
            x2={50 + OUTER * Math.cos(a)} y2={50 + OUTER * Math.sin(a)}
            stroke="rgba(255,255,255,0.93)" strokeWidth="8.5" strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

// ─── Wave logo ────────────────────────────────────────────────────────────────
function WaveLogo({ size = 24, color = C.blue }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M1 9 Q4 5, 7 9 Q10 13, 13 9 Q16 5, 19 9"
        stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 14 Q4 10, 7 14 Q10 18, 13 14 Q16 10, 19 14"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45"/>
    </svg>
  )
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      ...sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
      padding: '3px 10px', borderRadius: 999,
      background: `${color}15`, color, border: `1px solid ${color}30`,
    }}>
      {children}
    </span>
  )
}

// ─── Waitlist counter (Cloudflare Pages Function at /count) ──────────────────
async function incrementCounter(): Promise<number> {
  const r = await fetch('/count', { method: 'POST' })
  const j = await r.json()
  return (j as any).value as number
}

function useWaitlistCount() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    fetch('/count').then(r => r.json()).then(j => setCount((j as any).value as number)).catch(() => {})
  }, [])
  return { count, setCount }
}

// ─── Waitlist form ────────────────────────────────────────────────────────────
function WaitlistForm({ onSuccess, onCountUpdate }: { onSuccess?: () => void; onCountUpdate?: (n: number) => void }) {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const { count, setCount } = useWaitlistCount()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      await fetch('https://formspree.io/f/xjgpgovz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const n = await incrementCounter()
      setCount(n)
      onCountUpdate?.(n)
    } catch { /* fire-and-forget */ }
    setStatus('done')
    onSuccess?.()
  }

  if (status === 'done') {
    return (
      <div style={{
        padding: '16px 22px',
        background: `${C.green}12`, border: `1px solid ${C.green}30`,
        borderRadius: 12, ...sans,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ color: C.green, fontSize: 20 }}>✓</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>You're on the list</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {count ? `#${count} in line — ` : ''}We'll reach out when early access opens.
            </div>
          </div>
        </div>
        <a href="?demo=1" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          fontSize: 13, fontWeight: 700, color: C.blue,
          textDecoration: 'none', padding: '8px 16px',
          background: `${C.blue}12`, border: `1px solid ${C.blue}30`,
          borderRadius: 8, transition: 'opacity 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <span style={{ opacity: 0.8 }}>▶</span> Try the live demo while you wait
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input
        type="email" required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@company.com"
        style={{
          ...sans, flex: '1 1 200px', minWidth: 0,
          padding: '13px 16px', fontSize: 14,
          background: C.surface2, color: C.text,
          border: `1px solid ${C.border2}`, borderRadius: 10, outline: 'none',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = C.blue)}
        onBlur={e => (e.currentTarget.style.borderColor = C.border2)}
      />
      <button type="submit" disabled={status === 'loading'} style={{
        ...sans, padding: '13px 26px', fontSize: 14, fontWeight: 700,
        background: status === 'loading' ? C.border2 : C.blue,
        color: status === 'loading' ? C.muted : '#fff',
        border: 'none', borderRadius: 10,
        cursor: status === 'loading' ? 'default' : 'pointer',
        whiteSpace: 'nowrap', transition: 'opacity 0.15s',
        boxShadow: status === 'loading' ? 'none' : `0 0 20px ${C.blue}35`,
      }}
        onMouseEnter={e => { if (status !== 'loading') e.currentTarget.style.opacity = '0.88' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
        {status === 'loading' ? 'Joining…' : 'Join waitlist'}
      </button>
    </form>
  )
}

// ─── Waitlist modal ────────────────────────────────────────────────────────────
export function WaitlistModal({ onClose }: { onClose: () => void }) {
  const { count, setCount } = useWaitlistCount()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'rgba(0,0,0,0.88)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.surface, border: `1px solid ${C.border2}`,
          borderRadius: 22, padding: '44px 48px', maxWidth: 460, width: '100%',
          position: 'relative',
          boxShadow: `0 48px 96px rgba(0,0,0,0.65), 0 0 0 1px ${C.border}, 0 0 80px ${C.blueGlow}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          width: 30, height: 30, borderRadius: 999,
          background: C.border, border: 'none', color: C.muted,
          fontSize: 18, cursor: 'pointer', lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = C.border2)}
          onMouseLeave={e => (e.currentTarget.style.background = C.border)}>
          ×
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <WaveLogo size={30} />
          <span style={{ ...display, fontSize: 24, fontWeight: 800, color: C.text }}>Join the waitlist</span>
        </div>
        <p style={{ ...sans, fontSize: 14, color: C.muted, lineHeight: 1.7, margin: '10px 0 28px' }}>
          PR drift comments are invite-only for the first 200 builders.<br/>
          The local overlay is free and available right now.
        </p>

        <WaitlistForm onSuccess={() => setTimeout(onClose, 2400)} onCountUpdate={setCount} />

        {count !== null && (
          <div style={{ marginTop: 14, ...sans, fontSize: 12, color: C.muted }}>
            <span style={{ color: C.green, fontWeight: 700 }}>{count}</span> {count === 1 ? 'builder' : 'builders'} already on the list
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 48px', height: 60, boxSizing: 'border-box',
      background: `${C.bg}ee`, backdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${C.border}`, ...sans,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <WaveLogo size={20} />
        <span style={{ ...display, fontWeight: 800, fontSize: 16, color: C.text, letterSpacing: -0.3 }}>Drift</span>
      </div>
      <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {[['Features', '#features']].map(([label, href]) => (
          <a key={label} href={href} style={{ fontSize: 13, color: C.muted, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
            {label}
          </a>
        ))}
        <a href="https://github.com/dyoon92/design-drift" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 13, color: C.muted, textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = C.text)}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
          GitHub
        </a>
        <button onClick={onOpenModal} style={{
          ...sans, fontSize: 13, fontWeight: 700, padding: '7px 18px',
          background: C.blue, color: '#fff', border: 'none',
          borderRadius: 8, cursor: 'pointer', transition: 'opacity 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          Join waitlist
        </button>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onOpenModal }: { onOpenModal: () => void }) {
  const { count } = useWaitlistCount()
  const [scanMode, setScanMode] = useState<'quick' | 'full'>('quick')

  useEffect(() => {
    // cycle Quick → Full → Quick every 2.5 s
    const id = setInterval(() => setScanMode(m => m === 'quick' ? 'full' : 'quick'), 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <section style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Full-bleed gradient — covers the entire hero viewport */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 120% 70% at 50% 40%, ${C.blueGlow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      {/* Subtle bottom fade into the stats strip */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
        background: `linear-gradient(to bottom, transparent, ${C.bg})`,
        pointerEvents: 'none',
      }} />

      {/* Content grid */}
      <div className="hero-grid" style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 56, alignItems: 'center',
        padding: '0 64px',
        maxWidth: 1240, margin: '0 auto', width: '100%',
        boxSizing: 'border-box', position: 'relative', zIndex: 1,
      }}>

      {/* Left: copy */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          <Chip color={C.blue}>Live coverage score</Chip>
          <Chip color={C.purple}>Figma sync</Chip>
          <Chip color={C.green}>Browser · IDE · CI</Chip>
        </div>

        <h1 style={{
          ...display, fontSize: 'clamp(34px, 3.8vw, 60px)', fontWeight: 800,
          color: C.text, margin: '0 0 20px', lineHeight: 1.06, letterSpacing: -2,
        }}>
          AI ships UI fast.{' '}
          <span style={{
            background: `linear-gradient(95deg, ${C.blue} 0%, ${C.purple} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Drift makes sure it follows your design system.</span>
        </h1>

        <p style={{
          ...sans, fontSize: 17, color: C.sub, lineHeight: 1.8,
          margin: '0 0 36px', fontWeight: 300, maxWidth: 480,
        }}>
          Every sprint, AI coding tools introduce components your design system never approved. Drift gives every page a live coverage score — what's on-spec, what drifted, what AI invented from scratch. Catch gaps before they merge and push them back to Figma in one click.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={onOpenModal} style={{
            ...sans, fontSize: 14, fontWeight: 700, padding: '13px 28px',
            background: C.blue, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
            boxShadow: `0 0 32px ${C.blue}40`, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 40px ${C.blue}55` }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 32px ${C.blue}40` }}>
            Join waitlist — it's free
          </button>
          <a href="?demo=1" style={{
            ...sans, fontSize: 14, fontWeight: 600, padding: '13px 24px',
            background: 'transparent', color: C.sub,
            border: `1px solid ${C.border2}`, borderRadius: 10,
            textDecoration: 'none', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.muted; e.currentTarget.style.color = C.text }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.sub }}>
            <span style={{ opacity: 0.7 }}>▶</span> Live demo
          </a>
        </div>
        {count !== null && count > 0 && (
          <p style={{ ...sans, fontSize: 13, color: C.muted, marginTop: 14, marginBottom: 0 }}>
            <span style={{ color: C.green, fontWeight: 700 }}>{count.toLocaleString()}</span> builder{count !== 1 ? 's' : ''} already on the waitlist
          </p>
        )}
      </div>

      {/* Right: screenshot-based hero mock */}
      <div className="hero-mock" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          border: `1px solid ${C.border2}`, borderRadius: 14, overflow: 'hidden',
          boxShadow: `0 40px 90px rgba(0,0,0,0.7), 0 0 0 1px ${C.border}`,
          background: '#08080f',
        }}>
          {/* Browser chrome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: '#0c0c15' }}>
            {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: 999, background: c }} />)}
            <div style={{ marginLeft: 8, flex: 1, maxWidth: 220, background: C.border, borderRadius: 4, padding: '3px 10px', fontSize: 10, color: C.muted, ...mono }}>
              localhost:5173/dashboard
            </div>
          </div>

          {/* Composite area */}
          <div style={{ position: 'relative', height: 440, overflow: 'hidden' }}>

            {/* ── Screenshot layers — crossfade between Quick and Full ── */}
            <img
              src="/hero-app-overlay.png"
              alt=""
              style={{
                position: 'absolute', left: 0, top: 0,
                height: '100%', width: 'auto', maxWidth: 'calc(100% - 210px)',
                objectFit: 'cover', objectPosition: 'left top',
                opacity: scanMode === 'quick' ? 1 : 0,
                filter: 'blur(1.5px)',
                transition: 'opacity 0.7s ease',
              }}
            />
            <img
              src="/hero-app-full.png"
              alt=""
              style={{
                position: 'absolute', left: 0, top: 0,
                height: '100%', width: 'auto', maxWidth: 'calc(100% - 210px)',
                objectFit: 'cover', objectPosition: 'left top',
                opacity: scanMode === 'full' ? 1 : 0,
                transition: 'opacity 0.7s ease',
              }}
            />

            {/* Right edge fade so screenshot blends into panel */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              right: 210, width: 40,
              background: `linear-gradient(to right, transparent, #08080f)`,
              pointerEvents: 'none',
            }} />

            {/* ── Drift panel (always sharp) ── */}
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 208,
              background: C.bg, borderLeft: `1px solid ${C.border2}`,
              padding: '12px 11px', display: 'flex', flexDirection: 'column', gap: 7,
              overflow: 'hidden',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <WaveLogo size={14} />
                  <span style={{ ...display, fontSize: 13, fontWeight: 800, color: C.text }}>Drift</span>
                </div>
                {/* Animated Quick/Full toggle */}
                <div style={{ display: 'flex', gap: 2, background: C.surface2, borderRadius: 8, padding: 2 }}>
                  {(['Quick','Full'] as const).map(m => (
                    <span key={m} style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: (m.toLowerCase() === scanMode) ? C.blue : 'transparent',
                      color: (m.toLowerCase() === scanMode) ? '#fff' : C.muted,
                      transition: 'all 0.4s ease',
                    }}>{m}</span>
                  ))}
                </div>
              </div>

              {/* Score — updates per scan mode */}
              <div style={{ padding: '10px 12px', borderRadius: 9, background: '#0e0e1c', border: `1px solid ${C.border2}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 5 }}>
                  <span style={{
                    fontSize: 28, fontWeight: 800, ...display,
                    color: scanMode === 'quick' ? C.orange : '#ef4444',
                    transition: 'color 0.4s',
                  }}>{scanMode === 'quick' ? '77%' : '16%'}</span>
                  <span style={{ fontSize: 10, color: C.muted, whiteSpace: 'nowrap' }}>from your designs</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: C.border2, overflow: 'hidden', marginBottom: 7 }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: scanMode === 'quick' ? '77%' : '16%',
                    background: scanMode === 'quick'
                      ? `linear-gradient(90deg, ${C.green}, ${C.orange})`
                      : `linear-gradient(90deg, ${C.orange}, #ef4444)`,
                    transition: 'width 0.7s ease, background 0.4s',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
                  <span style={{ color: C.green }}>10 designed</span>
                  <span style={{ color: C.orange }}>10 modified</span>
                  <span style={{ color: '#ef4444', transition: 'all 0.4s' }}>
                    {scanMode === 'quick' ? '3' : '53'} custom
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}` }}>
                {['Overview','Modifications','Style issues','History'].map((tab, i) => (
                  <span key={tab} style={{
                    fontSize: 9, fontWeight: i === 0 ? 700 : 500, padding: '5px 8px',
                    color: i === 0 ? C.text : C.muted,
                    borderBottom: i === 0 ? `2px solid ${C.blue}` : '2px solid transparent',
                    whiteSpace: 'nowrap',
                  }}>
                    {tab}{i === 1 ? ' 10' : i === 2 ? ' 22' : i === 0 ? ` ${scanMode === 'quick' ? '4' : '4'}` : ''}
                  </span>
                ))}
              </div>

              {/* Component list — different per mode */}
              {(scanMode === 'quick' ? [
                { name: 'Navbar', tag: 'modified', color: C.orange, desc: 'Custom styles applied on top' },
                { name: 'Sidebar', tag: 'modified', color: C.orange, desc: 'Custom styles applied on top' },
                { name: 'OccupancyWidget', tag: 'modified', color: C.orange, desc: 'Custom styles applied on top' },
              ] : [
                { name: 'CardHeader', tag: 'custom', color: '#ef4444', desc: 'No DS equivalent — 6× used' },
                { name: 'BtnGrp', tag: 'custom', color: '#ef4444', desc: 'No DS equivalent — 4× used' },
                { name: 'LineChart', tag: 'custom', color: '#ef4444', desc: 'No DS equivalent — 3× used' },
              ]).map(item => (
                <div key={item.name} style={{ padding: '7px 9px', borderRadius: 7, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 999, background: item.color }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{item.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: `${item.color}18`, color: item.color }}>{item.tag}</span>
                    </div>
                    <span style={{ fontSize: 9, color: C.muted }}>×1 ↗</span>
                  </div>
                  <div style={{ fontSize: 9, color: C.muted, paddingLeft: 12 }}>{item.desc}</div>
                </div>
              ))}

              {/* CTA */}
              <div style={{
                marginTop: 'auto', padding: '10px', borderRadius: 9,
                background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`,
                fontSize: 11, color: '#fff', fontWeight: 700, textAlign: 'center',
                cursor: 'pointer',
              }}>
                Like what you see? Join the waitlist →
              </div>
            </div>

          </div>
        </div>
      </div>
      </div>{/* end content grid */}

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        zIndex: 2, cursor: 'pointer',
      }}
        onClick={() => document.getElementById('social-proof')?.scrollIntoView({ behavior: 'smooth' })}>
        <span style={{ ...sans, fontSize: 11, color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>Scroll</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, animation: 'drift-bounce 1.8s ease-in-out infinite' }}>
          <div style={{ width: 1.5, height: 20, background: `linear-gradient(to bottom, transparent, ${C.muted})`, borderRadius: 1 }} />
          <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
            <path d="M1 1L6 6L11 1" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <style>{`@keyframes drift-bounce { 0%,100%{transform:translateY(0)}50%{transform:translateY(6px)} }`}</style>
      </div>
    </section>
  )
}

// ─── Social proof ─────────────────────────────────────────────────────────────
function SocialProof() {
  return (
    <div id="social-proof" style={{
      borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
      padding: '32px 48px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 56, flexWrap: 'wrap',
    }}>
      {[
        { value: '77%', label: 'average DS coverage on first scan — 23% already drifted' },
        { value: '38%', label: 'less rework time at 80%+ DS coverage (Dan Mall, 2023)*' },
        { value: '0', label: 'other tools measure drift from the live React fiber tree' },
      ].map(stat => (
        <div key={stat.value} style={{ textAlign: 'center' }}>
          <div style={{ ...display, fontSize: 30, fontWeight: 800, color: C.blue, letterSpacing: -1 }}>{stat.value}</div>
          <div style={{ ...sans, fontSize: 12, color: C.muted, marginTop: 4, maxWidth: 170 }}>{stat.label}</div>
        </div>
      ))}
      <div style={{ width: '100%', textAlign: 'center', marginTop: -8 }}>
        <span style={{ ...sans, fontSize: 10, color: C.border2 }}>* Dan Mall, Design System Coverage</span>
      </div>
    </div>
  )
}


// ─── Persona Tabs ─────────────────────────────────────────────────────────────
type Persona = 'designer' | 'pm' | 'developer'

const PERSONA_DATA: Record<Persona, { label: string; color: string; icon: string; steps: { icon: string; title: string; body: string }[] }> = {
  designer: {
    label: 'Designer', color: '#a78bfa', icon: '◈',
    steps: [
      { icon: '①', title: 'Design in Figma', body: 'Figma is the source of truth. Components on any page, any structure. Run /drift-sync figma — Claude reads every published component across all pages.' },
      { icon: '②', title: 'Tokens flow automatically', body: 'Run npm run figma-sync → colors, spacing, and typography push straight to CSS variables. Every component using var(--ds-color-*) updates instantly.' },
      { icon: '③', title: 'See what shipped vs. what you designed', body: 'Open the live app, press D. Every DS component has a Figma link. Click any component — see it in Figma without a manual QA handoff.' },
      { icon: '④', title: 'Catch AI drift before design review', body: 'When a developer builds a one-off instead of using your component, it shows red in the overlay. You see it before it compounds.' },
      { icon: '⑤', title: 'Request missing components by spec', body: 'Run /drift-push to generate a structured Figma brief for any custom component — props, variants, token requirements. Designers know exactly what to build next.' },
    ],
  },
  pm: {
    label: 'PM', color: '#34d399', icon: '◎',
    steps: [
      { icon: '①', title: 'DS coverage is a number you can report', body: 'Open the live app, press D → "73% DS coverage on /tenants." One metric designers, engineers, and leadership can all act on.' },
      { icon: '②', title: 'Set a threshold — enforce it in CI', body: 'Set threshold: 80 in config. Every PR that drops coverage below 80% fails CI. Coverage regressions are caught before merge, not after.' },
      { icon: '③', title: 'Know what drifted in every PR', body: 'The GitHub Action posts a drift delta before anyone reviews: "Coverage: 76% → 74% ↓ — 2 new custom components introduced."' },
      { icon: '④', title: 'Create Jira tickets from gaps in one click', body: 'Custom component used 12× with no Figma equivalent? One click creates a pre-filled ticket — component name, screenshot, occurrence count, design prompt.' },
      { icon: '⑤', title: 'Share the demo with stakeholders', body: 'design-drift.pages.dev shows what drift looks like in a real product. No install, no setup — just press D.' },
    ],
  },
  developer: {
    label: 'Developer', color: '#4f8ef7', icon: '⚡',
    steps: [
      { icon: '①', title: 'Set up in 5 minutes with Claude Code', body: 'Run /drift-setup. Claude reads your codebase, asks 6 questions (Storybook URL, Figma key, Jira, threshold), writes config, CLAUDE.md, GitHub Action, and registers the MCP server.' },
      { icon: '②', title: 'CLAUDE.md keeps AI in the DS', body: 'Every AI tool — Claude Code, Cursor, Windsurf — reads CLAUDE.md. It knows exactly which components exist. If a component is missing, it outputs ⚠️ Missing component instead of inventing one.' },
      { icon: '③', title: 'Press D — see drift as you build', body: 'npm run dev → press D. Green = DS component. Red = custom gap. Token violations flagged inline. No context switch to a different tool.' },
      { icon: '④', title: 'Fix gaps from the IDE', body: 'The MCP server surfaces drift_gaps, drift_suggest, and drift_analyze directly in Claude Code and Cursor. Ask what\'s drifted, get a replacement suggestion, apply it — without touching the browser.' },
      { icon: '⑤', title: 'PR comment catches everything else', body: 'GitHub Action posts a coverage delta before review. Teammates see it. When someone asks "what\'s that Drift comment?" — that\'s how the team adopts it.' },
    ],
  },
}

function PersonaTabs() {
  const [active, setActive] = useState<Persona>('developer')
  const data = PERSONA_DATA[active]

  return (
    <div>
      {/* Tab row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(Object.entries(PERSONA_DATA) as [Persona, typeof PERSONA_DATA[Persona]][]).map(([key, p]) => (
          <button key={key} onClick={() => setActive(key)} style={{
            ...sans, fontSize: 13, fontWeight: 700,
            padding: '8px 20px', borderRadius: 8, cursor: 'pointer', border: 'none',
            background: active === key ? `${p.color}18` : 'transparent',
            color: active === key ? p.color : C.muted,
            outline: active === key ? `1px solid ${p.color}35` : '1px solid transparent',
            transition: 'all 0.15s',
          }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div style={{ background: C.surface2, borderRadius: 14, border: `1px solid ${C.border2}`, overflow: 'hidden' }}>
        {data.steps.map((step, i) => (
          <div key={step.title} style={{
            display: 'flex', gap: 16, padding: '16px 20px',
            borderBottom: i < data.steps.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <div style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: 8,
              background: `${data.color}15`, border: `1px solid ${data.color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: data.color, ...mono,
            }}>{step.icon}</div>
            <div>
              <div style={{ ...display, fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>{step.title}</div>
              <div style={{ ...sans, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{step.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Claude Section ────────────────────────────────────────────────────────────

function ClaudeSection() {
  return (
    <section style={{
      background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
      padding: '80px 64px',
    }}>
      <div style={{
        maxWidth: 1000, margin: '0 auto',
        display: 'flex', gap: 64, alignItems: 'flex-start', flexWrap: 'wrap',
      }}>

        {/* Left */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <ClaudeLogo size={34} />
            <Chip color={claudeOrange}>Built for Claude Code</Chip>
          </div>
          <h2 style={{
            ...display, fontSize: 34, fontWeight: 800, color: C.text,
            margin: '0 0 16px', letterSpacing: -0.8, lineHeight: 1.1,
          }}>
            The only DS tool native to AI coding.
          </h2>
          <p style={{ ...sans, fontSize: 15, color: C.muted, lineHeight: 1.8, margin: '0 0 20px' }}>
            Drift ships with Claude Code slash commands, an MCP server, and CLAUDE.md generation built in. Set it up once — your AI can no longer invent UI from scratch.
          </p>
          <p style={{ ...sans, fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            The MCP server also works with <span style={{ color: C.text, fontWeight: 600 }}>Cursor</span> and <span style={{ color: C.text, fontWeight: 600 }}>Windsurf</span> — any IDE that supports the Model Context Protocol.
          </p>
        </div>

        {/* Right: command panel */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{
            background: C.surface2, borderRadius: 14, border: `1px solid ${C.border2}`,
            overflow: 'hidden',
            boxShadow: `0 24px 56px rgba(0,0,0,0.4), 0 0 0 1px ${C.border}`,
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#0c0c14',
            }}>
              <ClaudeLogo size={18} />
              <span style={{ ...sans, fontSize: 12, fontWeight: 700, color: C.text }}>Claude Code</span>
              <span style={{ ...mono, fontSize: 10, color: C.muted, marginLeft: 'auto' }}>slash commands</span>
            </div>

            {/* Commands */}
            <div style={{ padding: '8px 0' }}>
              {[
                { cmd: '/drift-setup',       desc: 'Full install — config, CLAUDE.md, CI, MCP', color: C.blue },
                { cmd: '/drift',             desc: 'Coverage report + gap analysis from terminal', color: C.green },
                { cmd: '/drift-sync figma',  desc: 'Pull all components from Figma (all pages)',  color: C.purple },
                { cmd: '/drift-push <Name>', desc: 'Push component spec back to Figma',            color: claudeOrange },
              ].map(item => (
                <div key={item.cmd} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
                }}>
                  <code style={{ ...mono, fontSize: 11, color: item.color, flexShrink: 0, paddingTop: 1 }}>{item.cmd}</code>
                  <span style={{ ...sans, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{item.desc}</span>
                </div>
              ))}
            </div>

            {/* MCP tools */}
            <div style={{ padding: '12px 16px' }}>
              <div style={{ ...sans, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 0.5, marginBottom: 8 }}>MCP TOOLS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['drift_manifest', 'drift_analyze', 'drift_gaps', 'drift_suggest', 'drift_report'].map(t => (
                  <code key={t} style={{
                    ...mono, fontSize: 10, color: C.sub,
                    background: C.bg, border: `1px solid ${C.border2}`,
                    padding: '3px 8px', borderRadius: 5,
                  }}>{t}</code>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

// ─── AI Era Section ────────────────────────────────────────────────────────────
function AIEraSection() {
  return (
    <section style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '88px 64px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ marginBottom: 52, maxWidth: 700 }}>
          <Chip color={C.amber}>Why Drift exists</Chip>
          <h2 style={{
            ...display, fontSize: 'clamp(30px, 4vw, 50px)', fontWeight: 800,
            color: C.text, margin: '20px 0 16px', letterSpacing: -1.5, lineHeight: 1.08,
          }}>
            The design system used to be built once.<br/>
            <span style={{ color: C.amber }}>Now it needs to hold</span> every sprint.
          </h2>
          <p style={{ ...sans, fontSize: 16, color: C.sub, maxWidth: 540, lineHeight: 1.75, fontWeight: 300 }}>
            AI doesn't know you already have a <span style={{ ...mono, fontSize: 14, color: C.amber, fontWeight: 600 }}>PaymentBanner</span>. It invents one. Every sprint adds a little more. Drift catches it before it compounds.
          </p>
        </div>

        {/* Flow: Tokens → Constrain → Vibe → Drift */}
        <div className="aiera-flow" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          background: C.surface2, borderRadius: 16,
          border: `1px solid ${C.border2}`,
          overflow: 'hidden', marginBottom: 40,
        }}>
          {[
            { step: '01', label: 'TOKENS',    color: C.purple,  icon: '◈', title: 'Figma → token pipeline',  body: 'Tokens Studio → Style Dictionary → CSS vars. Fully automated — tokens stay in sync.' },
            { step: '02', label: 'CONSTRAIN', color: C.blue,    icon: '⬡', title: 'Storybook + AI rules',     body: 'Components in Storybook. CLAUDE.md tells AI which to use and which tokens to reference.' },
            { step: '03', label: 'VIBE',      color: C.orange,  icon: '⚡', title: 'AI ships fast',            body: 'Cursor builds a dashboard in 8 seconds. Mostly right — but one off-spec card, one hardcoded hex.' },
            { step: '04', label: 'DRIFT',     color: '#ef4444', icon: '◎', title: 'Gaps compound silently',   body: 'Nobody notices until design QA finds 30% of the UI never went through the system.', note: '← Drift catches this' },
          ].map((s, i) => (
            <div key={s.step} style={{ padding: '24px 20px', borderRight: i < 3 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ ...mono, fontSize: 10, color: C.muted }}>{s.step}</span>
                <span style={{ ...sans, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: s.color }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 18, marginBottom: 10, color: s.color }}>{s.icon}</div>
              <div style={{ ...display, fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6, lineHeight: 1.3 }}>{s.title}</div>
              <div style={{ ...sans, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{s.body}</div>
              {s.note && (
                <div style={{ marginTop: 12, padding: '5px 10px', borderRadius: 6, background: `${'#ef4444'}15`, border: `1px solid ${'#ef4444'}30`, fontSize: 11, fontWeight: 600, color: '#ef4444', ...sans }}>
                  {s.note}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Persona tabs */}
        <PersonaTabs />
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '⬡', color: C.blue,   title: 'Live fiber tree scanning',        body: 'Reads the actual rendered component tree — not source. Sees drift as it runs, not as it\'s written.' },
  { icon: '◎', color: C.orange, title: 'Drift score per page',             body: '"23% of this page has drifted." One number engineers and leadership can both act on.' },
  { icon: '✦', color: C.green,  title: 'AI rules export',                  body: 'Generates CLAUDE.md and .cursorrules from your component registry — tells Cursor and Claude what exists and which tokens to use.' },
  { icon: '⬚', color: C.pink,   title: 'Page scaffold generator',          body: 'Describe a screen. Get React built from only your registered DS components — zero drift on day one.' },
  { icon: '↑',  color: C.amber, title: 'Promote to DS',                     body: 'Component appeared 8× but isn\'t in your system? One click generates the Cursor prompt to build it properly from Figma — then Drift tracks it.' },
  { icon: '⟳', color: C.orange, title: 'Token violation flagging',         body: 'Catches hardcoded hex before it ships. Every violation is flagged with the correct CSS variable.' },
  { icon: '📷', color: C.blue,   title: 'One-click screenshot capture',     body: 'Capture any component as an image directly from the overlay — download it, attach to a Jira ticket, or drop it into a Figma file request without leaving the browser.' },
  { icon: '◈', color: C.purple, title: 'Jira ticket from any gap',         body: 'Custom component with no DS equivalent? One click creates a pre-filled Jira ticket — component name, screenshot, occurrence count, and a curated design prompt ready to go.' },
  { icon: '⬡', color: C.pink,   title: 'Figma spec prompts',               body: 'Missing a DS component? Drift generates a structured Figma brief — props, states, token requirements — so designers know exactly what to build next.' },
]

function Features() {
  return (
    <section id="features" style={{ padding: '88px 64px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <Chip color={C.blue}>Features</Chip>
        <h2 style={{ ...display, fontSize: 44, fontWeight: 800, color: C.text, margin: '20px 0 14px', letterSpacing: -1 }}>
          See every drift. Ship with confidence.
        </h2>
        <p style={{ ...sans, fontSize: 16, color: C.muted, maxWidth: 460, margin: '0 auto', lineHeight: 1.7, fontWeight: 300 }}>
          Detection, measurement, and enforcement — in one tool that takes 2 minutes to add to any React app.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {FEATURES.map(f => (
          <div key={f.title} style={{
            padding: '26px', borderRadius: 14,
            background: C.surface, border: `1px solid ${C.border}`,
            transition: 'border-color 0.2s, transform 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = f.color + '45'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = '' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11, marginBottom: 16,
              background: `${f.color}15`, border: `1px solid ${f.color}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: f.color,
            }}>{f.icon}</div>
            <div style={{ ...display, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>{f.title}</div>
            <div style={{ ...sans, fontSize: 13, color: C.muted, lineHeight: 1.75 }}>{f.body}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── PR Drift Delta callout ────────────────────────────────────────────────────
function PRDeltaCallout() {
  return (
    <section style={{
      padding: '80px 64px',
      background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 64, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <Chip color={C.green}>The viral loop</Chip>
          <h2 style={{ ...display, fontSize: 36, fontWeight: 800, color: C.text, margin: '20px 0 16px', letterSpacing: -0.8, lineHeight: 1.1 }}>
            Know exactly what drifted in every PR
          </h2>
          <p style={{ ...sans, fontSize: 15, color: C.muted, lineHeight: 1.8, margin: '0 0 28px' }}>
            The GitHub Action posts a drift delta to every PR — components, tokens, coverage change — before anyone hits review. When a teammate asks "what's that Drift comment?" that's your acquisition loop.
          </p>
          <a href="https://github.com/dyoon92/design-drift/blob/main/.github/workflows/drift-check.yml"
            target="_blank" rel="noopener noreferrer"
            style={{ ...sans, fontSize: 13, fontWeight: 700, color: C.blue, textDecoration: 'none' }}>
            View the GitHub Action →
          </a>
        </div>
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{
            borderRadius: 14, border: `1px solid ${C.border2}`,
            overflow: 'hidden', background: '#0c0c14',
            boxShadow: `0 24px 56px rgba(0,0,0,0.55)`,
          }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, flexShrink: 0 }} />
              <div>
                <div style={{ ...sans, fontSize: 12, fontWeight: 600, color: C.text }}>github-actions[bot]</div>
                <div style={{ ...sans, fontSize: 10, color: C.muted }}>commented just now</div>
              </div>
            </div>
            <div style={{ padding: '16px', ...sans }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <WaveLogo size={14} /> Drift Report
              </div>
              <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: `${C.orange}10`, border: `1px solid ${C.orange}25`, fontSize: 12, color: C.orange, fontWeight: 600 }}>
                ⚠️ Coverage below threshold (80%)
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}><code style={mono}>/dashboard</code> — DS coverage</div>
              <div style={{ background: C.surface2, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, marginBottom: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  {[['DS components','10'],['Custom (drifted)','3'],['Total','13'],['Token violations','19']].map(([k,v]) => (
                    <tr key={k} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '6px 12px', color: C.muted }}>{k}</td>
                      <td style={{ padding: '6px 12px', color: C.text, fontWeight: 600, textAlign: 'right' }}>{v}</td>
                    </tr>
                  ))}
                </table>
              </div>
              <div style={{ fontSize: 10, color: C.muted }}>Generated by Drift · Threshold: 80%</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


// ─── Pricing (hidden — restore from git when tiers are finalised) ─────────────

// ─── Waitlist CTA section ─────────────────────────────────────────────────────
function WaitlistSection({ onOpenModal }: { onOpenModal: () => void }) {
  const { count } = useWaitlistCount()

  return (
    <section id="waitlist" style={{ padding: '96px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 60% 70% at 50% 100%, ${C.blueGlow}, transparent)`,
        pointerEvents: 'none',
      }} />
      <div style={{ maxWidth: 540, margin: '0 auto', position: 'relative' }}>
        <WaveLogo size={40} />
        <h2 style={{ ...display, fontSize: 44, fontWeight: 800, color: C.text, margin: '24px 0 16px', letterSpacing: -1, lineHeight: 1.1 }}>
          Stop guessing.<br/>Start catching drift.
        </h2>
        <p style={{ ...sans, fontSize: 16, color: C.muted, lineHeight: 1.8, margin: '0 0 40px', fontWeight: 300 }}>
          The overlay is free. PR drift comments are invite-only for the first 200 builders.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onOpenModal} style={{
            ...sans, fontSize: 15, fontWeight: 700, padding: '14px 36px',
            background: C.blue, color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
            boxShadow: `0 0 32px ${C.blue}40`, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 40px ${C.blue}55` }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 32px ${C.blue}40` }}>
            Join the waitlist
          </button>
          <a href="https://github.com/dyoon92/design-drift" target="_blank" rel="noopener noreferrer" style={{
            ...sans, fontSize: 15, fontWeight: 600, padding: '14px 32px',
            background: 'transparent', color: C.text,
            border: `1px solid ${C.border2}`, borderRadius: 12, textDecoration: 'none',
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.muted)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border2)}>
            ★ Star on GitHub
          </a>
        </div>
        {count !== null && (
          <p style={{ ...sans, fontSize: 12, color: C.muted, marginTop: 16 }}>
            <span style={{ color: C.green, fontWeight: 700 }}>{count}</span> {count === 1 ? 'builder' : 'builders'} on the waitlist · No spam. One email when early access opens.
          </p>
        )}
        {count === null && (
          <p style={{ ...sans, fontSize: 12, color: C.muted, marginTop: 16 }}>
            No spam. One email when early access opens.
          </p>
        )}
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`, padding: '28px 64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 16, ...sans,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <WaveLogo size={16} />
        <span style={{ fontSize: 13, color: C.muted }}>Drift — the UX governance layer for teams shipping with AI.</span>
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        {[
          { label: 'GitHub', href: 'https://github.com/dyoon92/design-drift' },
          { label: 'Issues', href: 'https://github.com/dyoon92/design-drift/issues' },
          { label: 'Demo', href: '?demo=1' },
        ].map(l => (
          <a key={l.label} href={l.href}
            target={l.href.startsWith('http') ? '_blank' : undefined}
            rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            style={{ fontSize: 12, color: C.muted, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
            {l.label}
          </a>
        ))}
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const openModal  = useCallback(() => setModalOpen(true),  [])
  const closeModal = useCallback(() => setModalOpen(false), [])

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, width: '100%', overflowX: 'hidden' }}>
      <style>{`
        /* ── Responsive breakpoints ── */
        @media (max-width: 960px) {
          .hero-grid   { grid-template-columns: 1fr !important; padding: 0 40px !important; }
          .hero-mock   { display: none !important; }
          .aiera-flow  { grid-template-columns: 1fr 1fr !important; }
          .aiera-bottom { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .hero-grid   { padding: 0 24px !important; }
          .nav-links   { gap: 16px !important; }
          .nav-links a { display: none !important; }
          .aiera-flow  { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .hero-grid  { padding: 0 20px !important; }
        }
      `}</style>
      {modalOpen && <WaitlistModal onClose={closeModal} />}
      <Nav onOpenModal={openModal} />
      <Hero onOpenModal={openModal} />
      <SocialProof />
      <AIEraSection />
      <Features />
      <ClaudeSection />
      <PRDeltaCallout />
      <WaitlistSection onOpenModal={openModal} />
      <Footer />
    </div>
  )
}
