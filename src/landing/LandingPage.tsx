import { useState, useEffect } from 'react'

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       '#0a0a0f',
  surface:  '#0f0f18',
  surface2: '#13131f',
  border:   '#1e1e2e',
  border2:  '#272738',
  text:     '#eeeef4',
  muted:    '#6b6b82',
  sub:      '#9999b0',
  blue:     '#4f8ef7',
  blueGlow: 'rgba(79,142,247,0.14)',
  green:    '#34d399',
  purple:   '#a78bfa',
  orange:   '#fb923c',
  pink:     '#f472b6',
}

const mono: React.CSSProperties    = { fontFamily: '"JetBrains Mono", "Fira Code", monospace' }
const sans: React.CSSProperties    = { fontFamily: '"DM Sans", system-ui, sans-serif' }
const display: React.CSSProperties = { fontFamily: '"Space Grotesk", system-ui, sans-serif' }

// ─── Wave icon (matches the overlay brand mark) ────────────────────────────────
function WaveLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M1 9 Q4 5, 7 9 Q10 13, 13 9 Q16 5, 19 9"
        stroke={C.blue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 14 Q4 10, 7 14 Q10 18, 13 14 Q16 10, 19 14"
        stroke={C.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45"/>
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


// ─── Waitlist counter (countapi.xyz — free, no auth) ─────────────────────────
const COUNTER_HIT = 'https://api.countapi.xyz/hit/design-drift.dev/waitlist'
const COUNTER_GET = 'https://api.countapi.xyz/get/design-drift.dev/waitlist'

async function incrementCounter(): Promise<number> {
  const r = await fetch(COUNTER_HIT)
  const j = await r.json()
  return j.value as number
}

function useWaitlistCount() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    fetch(COUNTER_GET).then(r => r.json()).then(j => setCount(j.value as number)).catch(() => {})
  }, [])
  return { count, setCount }
}

// ─── Waitlist form (reusable) ─────────────────────────────────────────────────
function WaitlistForm({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
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
    } catch { /* fire-and-forget */ }
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: size === 'lg' ? '14px 24px' : '10px 18px',
        background: `${C.green}12`, border: `1px solid ${C.green}30`,
        borderRadius: 12, ...sans,
      }}>
        <span style={{ color: C.green, fontSize: 18 }}>✓</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>You're on the list</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {count ? `#${count} in line — ` : ''}We'll reach out when team access opens.
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@company.com"
        style={{
          ...sans,
          flex: '1 1 220px', minWidth: 0,
          padding: size === 'lg' ? '13px 16px' : '10px 14px',
          fontSize: size === 'lg' ? 14 : 13,
          background: C.surface2, color: C.text,
          border: `1px solid ${C.border2}`, borderRadius: 10,
          outline: 'none',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = C.blue)}
        onBlur={e => (e.currentTarget.style.borderColor = C.border2)}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          ...sans,
          padding: size === 'lg' ? '13px 28px' : '10px 20px',
          fontSize: size === 'lg' ? 14 : 13,
          fontWeight: 700,
          background: status === 'loading' ? C.border2 : C.blue,
          color: status === 'loading' ? C.muted : '#fff',
          border: 'none', borderRadius: 10, cursor: status === 'loading' ? 'default' : 'pointer',
          transition: 'opacity 0.15s', whiteSpace: 'nowrap',
          boxShadow: status === 'loading' ? 'none' : `0 0 24px ${C.blue}35`,
        }}
        onMouseEnter={e => { if (status !== 'loading') e.currentTarget.style.opacity = '0.88' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
      >
        {status === 'loading' ? 'Joining…' : 'Join waitlist'}
      </button>
    </form>
    {count !== null && (
      <div style={{ textAlign: 'center', marginTop: 10, ...sans, fontSize: 12, color: C.muted }}>
        <span style={{ color: C.green, fontWeight: 700 }}>{count}</span> {count === 1 ? 'team' : 'teams'} on the waitlist
      </div>
    )}
    </>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px', height: 60, boxSizing: 'border-box',
      background: `${C.bg}ec`, backdropFilter: 'blur(14px)',
      borderBottom: `1px solid ${C.border}`,
      ...sans,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <WaveLogo size={20} />
        <span style={{ ...display, fontWeight: 800, fontSize: 16, color: C.text, letterSpacing: -0.3 }}>Drift</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {[['Features', '#features'], ['How it works', '#how-it-works'], ['Pricing', '#pricing']].map(([label, href]) => (
          <a key={label} href={href} style={{ fontSize: 13, color: C.muted, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>{label}</a>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <a href="https://github.com/dyoon92/design-drift" target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted, textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = C.text)}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          GitHub
        </a>
        <a href="#waitlist" style={{
          ...sans, fontSize: 13, fontWeight: 700, padding: '7px 16px',
          background: C.blue, color: '#fff',
          borderRadius: 8, textDecoration: 'none', transition: 'opacity 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          Join waitlist
        </a>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', padding: '96px 40px 80px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 900, height: 500,
        background: `radial-gradient(ellipse at 50% 0%, ${C.blueGlow} 0%, transparent 68%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ marginBottom: 28, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Chip color={C.blue}>React fiber scanner</Chip>
        <Chip color={C.purple}>AI context export</Chip>
        <Chip color={C.green}>PR drift comments</Chip>
      </div>

      <h1 style={{
        ...display,
        fontSize: 'clamp(36px, 5.5vw, 72px)', fontWeight: 800,
        color: C.text, margin: '0 0 24px',
        lineHeight: 1.08, letterSpacing: -2, maxWidth: 860,
      }}>
        Your design system{' '}
        <span style={{
          background: `linear-gradient(95deg, ${C.blue} 0%, ${C.purple} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>is leaking.</span>
      </h1>

      <p style={{
        ...sans, fontSize: 19, color: C.sub, maxWidth: 560,
        lineHeight: 1.75, margin: '0 0 16px', fontWeight: 300,
      }}>
        Drift scans your live React component tree, flags every hardcoded token and rogue custom component, and posts the coverage delta to every PR.
      </p>
      <p style={{ ...sans, fontSize: 14, color: C.muted, maxWidth: 440, lineHeight: 1.6, margin: '0 0 48px' }}>
        ESLint for your design system. Catches drift before it merges.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 64 }}>
        <a href="?demo=1" style={{
          ...sans, display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, fontWeight: 700, padding: '13px 28px',
          background: C.blue, color: '#fff', borderRadius: 10, textDecoration: 'none',
          boxShadow: `0 0 32px ${C.blue}40`, transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 40px ${C.blue}60` }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 32px ${C.blue}40` }}>
          <span style={{ width: 20, height: 20, borderRadius: 999, background: 'rgba(255,255,255,0.22)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>▶</span>
          See the live demo
        </a>
        <a href="#waitlist" style={{
          ...sans, fontSize: 14, fontWeight: 600, padding: '13px 28px',
          background: 'transparent', color: C.text,
          border: `1px solid ${C.border2}`, borderRadius: 10,
          textDecoration: 'none', transition: 'border-color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = C.muted)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = C.border2)}>
          Join the waitlist
        </a>
      </div>

      {/* Hero screenshot — the actual panel floating over a real app */}
      <div style={{
        width: '100%', maxWidth: 920,
        background: C.surface, border: `1px solid ${C.border2}`,
        borderRadius: 16, overflow: 'hidden',
        boxShadow: `0 48px 96px rgba(0,0,0,0.65), 0 0 0 1px ${C.border}`,
      }}>
        {/* Browser chrome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderBottom: `1px solid ${C.border}`, background: '#0c0c15' }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => (
            <div key={c} style={{ width: 11, height: 11, borderRadius: 999, background: c }} />
          ))}
          <div style={{ marginLeft: 10, flex: 1, maxWidth: 260, background: C.border, borderRadius: 5, padding: '4px 12px', fontSize: 11, color: C.muted, ...mono }}>
            app.yourdomain.com/dashboard
          </div>
        </div>

        <div style={{ display: 'flex', minHeight: 340 }}>
          {/* Mock app */}
          <div style={{ flex: 1, padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, ...display, marginBottom: 4 }}>Dashboard</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Occupancy', value: '94.2%', color: C.blue, ok: true },
                { label: 'Revenue', value: '$42.8k', color: C.green, ok: true },
                { label: 'Past Due', value: '3 units', color: C.orange, ok: false },
                { label: 'New Leads', value: '12', color: C.purple, ok: false },
              ].map(card => (
                <div key={card.label} style={{
                  padding: '14px 18px', borderRadius: 10,
                  background: '#0d0d18',
                  border: `1.5px solid ${card.ok ? C.border : C.orange + '50'}`,
                  position: 'relative', overflow: 'hidden',
                }}>
                  {!card.ok && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `${C.orange}08`, pointerEvents: 'none',
                    }} />
                  )}
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 5, ...sans }}>{card.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: card.color, ...display }}>{card.value}</div>
                  {!card.ok && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: `${C.orange}20`, color: C.orange, ...sans,
                    }}>drift</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mock Drift panel */}
          <div style={{
            width: 252, borderLeft: `1px solid ${C.border}`,
            background: '#0b0b14', padding: '14px 12px',
            display: 'flex', flexDirection: 'column', gap: 10,
            ...sans,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <WaveLogo size={14} />
                <span style={{ ...display, fontSize: 13, fontWeight: 800, color: C.text }}>Drift</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {['Quick', 'Full'].map((m, i) => (
                  <span key={m} style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: i === 0 ? '#555566' : 'transparent', color: i === 0 ? '#fff' : C.muted }}>{m}</span>
                ))}
              </div>
            </div>
            {/* Coverage */}
            <div style={{ padding: '12px', borderRadius: 10, background: '#0e0e1c', border: `1px solid ${C.border2}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: C.orange, ...display }}>77%</span>
                <span style={{ fontSize: 10, color: C.muted }}>from your designs</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: C.border2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '77%', borderRadius: 2, background: C.orange }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 10 }}>
                <span><span style={{ fontWeight: 700, color: C.green }}>10</span><span style={{ color: C.muted }}> designed</span></span>
                <span><span style={{ fontWeight: 700, color: C.orange }}>10</span><span style={{ color: C.muted }}> modified</span></span>
                <span><span style={{ fontWeight: 700, color: '#ef4444' }}>3</span><span style={{ color: C.muted }}> custom</span></span>
              </div>
            </div>
            {/* Component cards */}
            {[
              { name: 'PastDueCard', tag: 'drift', color: C.orange, note: 'border-color not in tokens' },
              { name: 'RevenueWidget', tag: 'drift', color: C.orange, note: 'hardcoded #22c55e' },
              { name: 'Navbar', tag: 'DS ✓', color: C.green, note: 'From your design system' },
            ].map(item => (
              <div key={item.name} style={{ padding: '8px 10px', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{item.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: `${item.color}18`, color: item.color }}>{item.tag}</span>
                </div>
                <div style={{ fontSize: 9, color: C.muted }}>{item.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Social proof ─────────────────────────────────────────────────────────────
function SocialProof() {
  return (
    <div style={{
      borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
      padding: '32px 40px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 48, flexWrap: 'wrap',
    }}>
      {[
        { value: '77%', label: 'avg DS coverage found on first scan' },
        { value: '38%', label: 'less sprint time at 80%+ DS coverage*' },
        { value: '0', label: 'competitors read the live fiber tree' },
      ].map(stat => (
        <div key={stat.value} style={{ textAlign: 'center' }}>
          <div style={{ ...display, fontSize: 28, fontWeight: 800, color: C.blue, letterSpacing: -1 }}>{stat.value}</div>
          <div style={{ ...sans, fontSize: 12, color: C.muted, marginTop: 4, maxWidth: 160 }}>{stat.label}</div>
        </div>
      ))}
      <div style={{ width: '100%', textAlign: 'center', marginTop: -8 }}>
        <span style={{ ...sans, fontSize: 10, color: C.border2 }}>* Dan Mall, Design System Coverage</span>
      </div>
    </div>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '⬡', color: C.blue,
    title: 'Live fiber tree scanning',
    body: 'Reads the actual rendered React component tree — not static AST analysis. Sees what\'s on screen right now, not what\'s in source.',
  },
  {
    icon: '◎', color: C.orange,
    title: 'DS coverage %',
    body: '"77% of this page is from your design system." A single number that gives leadership a KPI and engineers a target.',
  },
  {
    icon: '⚡', color: C.purple,
    title: 'PR drift comments',
    body: 'Every pull request gets a coverage delta comment. Engineers see "DS coverage dropped 8%" before you do.',
  },
  {
    icon: '✦', color: C.green,
    title: 'AI context file export',
    body: 'Generates .cursorrules and CLAUDE.md from your live token system. AI coding tools stop hallucinating hardcoded hex values.',
  },
  {
    icon: '⬚', color: C.pink,
    title: 'Page scaffold generator',
    body: 'Describe a page in plain English. Get a React file scaffolded using only your registered design system components.',
  },
  {
    icon: '⟳', color: C.orange,
    title: 'Token violation flagging',
    body: 'Catches color: #2563EB before it merges. Every hardcoded value gets a suggested CSS variable replacement.',
  },
]

function Features() {
  return (
    <section id="features" style={{ padding: '88px 40px', maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <Chip color={C.blue}>Features</Chip>
        <h2 style={{ ...display, fontSize: 44, fontWeight: 800, color: C.text, margin: '20px 0 14px', letterSpacing: -1 }}>
          The compliance layer your DS has been missing
        </h2>
        <p style={{ ...sans, fontSize: 16, color: C.muted, maxWidth: 500, margin: '0 auto', lineHeight: 1.7, fontWeight: 300 }}>
          Detection, enforcement, and generation — in one tool that takes 2 minutes to install.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        {FEATURES.map(f => (
          <div key={f.title} style={{
            padding: '26px 26px', borderRadius: 14,
            background: C.surface, border: `1px solid ${C.border}`,
            transition: 'border-color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = f.color + '45')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
          >
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
      padding: '80px 40px',
      background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 64, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <Chip color={C.green}>The viral loop</Chip>
          <h2 style={{ ...display, fontSize: 36, fontWeight: 800, color: C.text, margin: '20px 0 16px', letterSpacing: -0.8, lineHeight: 1.1 }}>
            Every PR shows the drift delta
          </h2>
          <p style={{ ...sans, fontSize: 15, color: C.muted, lineHeight: 1.8, margin: '0 0 16px' }}>
            The GitHub Action posts a coverage table to every pull request. Engineers see "DS coverage dropped from 81% → 74% in this PR" before anyone reviews it.
          </p>
          <p style={{ ...sans, fontSize: 15, color: C.muted, lineHeight: 1.8, margin: '0 0 28px' }}>
            When a teammate asks "what's that drift comment?" — that's when they install it for their own repo.
          </p>
          <a href="https://github.com/dyoon92/design-drift/blob/main/.github/workflows/drift-check.yml"
            target="_blank" rel="noopener noreferrer"
            style={{ ...sans, fontSize: 13, fontWeight: 700, color: C.blue, textDecoration: 'none' }}>
            View the GitHub Action →
          </a>
        </div>

        {/* Mock PR comment */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{
            borderRadius: 14, border: `1px solid ${C.border2}`,
            overflow: 'hidden', background: '#0c0c14',
            boxShadow: `0 20px 48px rgba(0,0,0,0.5)`,
          }}>
            {/* PR comment header */}
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, flexShrink: 0 }} />
              <div>
                <div style={{ ...sans, fontSize: 12, fontWeight: 600, color: C.text }}>github-actions[bot]</div>
                <div style={{ ...sans, fontSize: 10, color: C.muted }}>commented just now</div>
              </div>
            </div>
            {/* Comment body */}
            <div style={{ padding: '16px 16px', ...sans }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                <WaveLogo size={14} /> Drift Report
              </div>
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 12,
                background: `${C.orange}10`, border: `1px solid ${C.orange}25`,
                fontSize: 12, color: C.orange, fontWeight: 600,
              }}>
                ⚠️ Coverage below threshold (80%)
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}><code style={mono}>/dashboard</code> — DS coverage</div>
              <div style={{
                background: C.surface2, borderRadius: 8, overflow: 'hidden',
                border: `1px solid ${C.border}`, marginBottom: 10,
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  {[['DS components', '10'], ['Custom (gaps)', '3'], ['Total', '13'], ['Token violations', '19']].map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '6px 12px', color: C.muted }}>{k}</td>
                      <td style={{ padding: '6px 12px', color: C.text, fontWeight: 600, textAlign: 'right' }}>{v}</td>
                    </tr>
                  ))}
                </table>
              </div>
              <div style={{ fontSize: 10, color: C.muted }}>
                Generated by Drift · Threshold: 80%
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: '01', color: C.blue,
      title: 'Install free, no account needed',
      body: 'Clone the repo and import the overlay into your app entry point. The floating panel appears in dev mode only.',
      code: 'npx drift install  # coming soon',
    },
    {
      n: '02', color: C.purple,
      title: 'Scan your first page',
      body: 'Press D to open Drift. It reads the live React fiber tree and shows you DS coverage % instantly.',
      code: '77% DS coverage — 13 components, 3 custom',
    },
    {
      n: '03', color: C.green,
      title: 'Add to your CI pipeline',
      body: 'Install the GitHub App. Every PR gets a drift delta comment. Your whole team sees coverage before code merges.',
      code: 'DS coverage: 81% → 74% ⚠️  (−7%)',
    },
  ]

  return (
    <section id="how-it-works" style={{ padding: '88px 40px', maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <Chip color={C.purple}>How it works</Chip>
        <h2 style={{ ...display, fontSize: 44, fontWeight: 800, color: C.text, margin: '20px 0 12px', letterSpacing: -1 }}>
          Up and running in 2 minutes
        </h2>
        <p style={{ ...sans, fontSize: 16, color: C.muted, fontWeight: 300 }}>No account. No config file. No AST transforms.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
        {steps.map(s => (
          <div key={s.n}>
            <div style={{ fontSize: 52, fontWeight: 900, color: `${s.color}15`, ...mono, lineHeight: 1, marginBottom: -12 }}>{s.n}</div>
            <div style={{ paddingTop: 20 }}>
              <div style={{ ...display, fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 10 }}>{s.title}</div>
              <div style={{ ...sans, fontSize: 13, color: C.muted, lineHeight: 1.75, marginBottom: 16 }}>{s.body}</div>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#09090f', border: `1px solid ${C.border2}`, fontSize: 12, color: s.color, ...mono, wordBreak: 'break-all' }}>
                {s.code}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      color: C.sub,
      desc: 'For individual engineers evaluating Drift.',
      features: [
        'Local overlay — unlimited scans',
        'DS coverage % per page',
        'Token violation detection',
        'AI context file export',
        'Page scaffold generator',
      ],
      cta: 'Install free',
      ctaHref: 'https://github.com/dyoon92/design-drift',
      highlight: false,
    },
    {
      name: 'Team',
      price: '$149',
      period: '/ month',
      color: C.blue,
      desc: 'For teams that ship with a design system.',
      features: [
        'Everything in Free',
        'GitHub App — PR drift delta comments',
        'Coverage history dashboard',
        'Team-wide token ruleset sync',
        'Up to 10 repos · 25 members',
      ],
      cta: 'Join waitlist',
      ctaHref: '#waitlist',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      color: C.purple,
      desc: 'For large orgs with multi-brand systems.',
      features: [
        'Everything in Team',
        'Unlimited repos & members',
        'SSO / SCIM provisioning',
        'Slack + Jira integrations',
        'Dedicated onboarding & SLA',
      ],
      cta: 'Talk to us',
      ctaHref: 'mailto:hello@drift.design',
      highlight: false,
    },
  ]

  return (
    <section id="pricing" style={{ padding: '88px 40px', background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <Chip color={C.purple}>Pricing</Chip>
          <h2 style={{ ...display, fontSize: 44, fontWeight: 800, color: C.text, margin: '20px 0 12px', letterSpacing: -1 }}>
            Free forever for local scans
          </h2>
          <p style={{ ...sans, fontSize: 15, color: C.muted, fontWeight: 300 }}>
            One PR comment and your team will ask you to upgrade.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {tiers.map(tier => (
            <div key={tier.name} style={{
              padding: '32px 28px', borderRadius: 16,
              background: tier.highlight ? `linear-gradient(160deg, #0f1525 0%, #0a0f20 100%)` : C.surface2,
              border: `1.5px solid ${tier.highlight ? tier.color + '50' : C.border}`,
              display: 'flex', flexDirection: 'column', gap: 20,
              boxShadow: tier.highlight ? `0 0 48px ${tier.color}18` : 'none',
              position: 'relative',
            }}>
              {tier.highlight && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  ...sans, fontSize: 11, fontWeight: 700, padding: '3px 14px',
                  background: tier.color, color: '#fff', borderRadius: 999,
                }}>Most popular</div>
              )}
              <div>
                <div style={{ ...display, fontSize: 13, fontWeight: 700, color: tier.color, marginBottom: 8, letterSpacing: 0.5 }}>{tier.name.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ ...display, fontSize: 36, fontWeight: 800, color: C.text, letterSpacing: -1 }}>{tier.price}</span>
                  {tier.period && <span style={{ ...sans, fontSize: 13, color: C.muted }}>{tier.period}</span>}
                </div>
                <div style={{ ...sans, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{tier.desc}</div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tier.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: C.sub }}>
                    <span style={{ color: tier.color, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <a href={tier.ctaHref}
                target={tier.ctaHref.startsWith('http') ? '_blank' : undefined}
                rel={tier.ctaHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                style={{
                  marginTop: 'auto', ...sans, fontSize: 14, fontWeight: 700,
                  padding: '12px 0', borderRadius: 10, textAlign: 'center',
                  background: tier.highlight ? tier.color : `${tier.color}12`,
                  color: tier.highlight ? '#fff' : tier.color,
                  border: tier.highlight ? 'none' : `1px solid ${tier.color}30`,
                  textDecoration: 'none', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Waitlist CTA ─────────────────────────────────────────────────────────────
function WaitlistSection() {
  return (
    <section id="waitlist" style={{ padding: '96px 40px', textAlign: 'center' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <WaveLogo size={40} />
        <h2 style={{ ...display, fontSize: 44, fontWeight: 800, color: C.text, margin: '24px 0 16px', letterSpacing: -1, lineHeight: 1.1 }}>
          Be in the first 200 teams
        </h2>
        <p style={{ ...sans, fontSize: 16, color: C.muted, lineHeight: 1.75, margin: '0 0 40px', fontWeight: 300 }}>
          GitHub App access (PR drift comments) is invite-only while we tune the experience. Local overlay is free and available now.
        </p>
        <WaitlistForm size="lg" />
        <p style={{ ...sans, fontSize: 12, color: C.muted, marginTop: 14 }}>
          No spam. We'll email once when team access opens.
        </p>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`,
      padding: '28px 40px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 16,
      ...sans,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <WaveLogo size={16} />
        <span style={{ fontSize: 13, color: C.muted }}>Drift — built for design-engineering teams</span>
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
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, width: '100%', overflowX: 'hidden' }}>
      <Nav />
      <Hero />
      <SocialProof />
      <Features />
      <PRDeltaCallout />
      <HowItWorks />
      <Pricing />
      <WaitlistSection />
      <Footer />
    </div>
  )
}
