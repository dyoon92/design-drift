import { useState } from 'react'

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       '#0a0a0f',
  surface:  '#111118',
  border:   '#1e1e2e',
  border2:  '#2a2a3e',
  text:     '#e8e8f0',
  muted:    '#6b6b80',
  blue:     '#4f8ef7',
  blueGlow: 'rgba(79,142,247,0.15)',
  green:    '#34d399',
  purple:   '#a78bfa',
  orange:   '#fb923c',
  pink:     '#f472b6',
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const mono: React.CSSProperties = { fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace' }
const sans: React.CSSProperties = { fontFamily: '"DM Sans", system-ui, sans-serif' }
const display: React.CSSProperties = { fontFamily: '"Syne", system-ui, sans-serif' }
// Legacy alias — gradually being replaced
const inter = sans

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      ...inter, fontSize: 11, fontWeight: 600, letterSpacing: 0.4,
      padding: '3px 10px', borderRadius: 999,
      background: `${color}18`, color, border: `1px solid ${color}35`,
    }}>
      {children}
    </span>
  )
}

function CodeLine({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '14px 20px',
      background: '#0d0d14', border: `1px solid ${C.border2}`,
      borderRadius: 10, ...mono,
    }}>
      <span style={{ fontSize: 13, color: C.text }}>
        <span style={{ color: C.muted, userSelect: 'none' }}>$ </span>
        {children}
      </span>
      <button
        onClick={() => {
          navigator.clipboard.writeText(children)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        }}
        style={{
          ...inter, fontSize: 11, fontWeight: 600, padding: '4px 12px',
          background: copied ? `${C.green}18` : `${C.blue}15`,
          color: copied ? C.green : C.blue,
          border: `1px solid ${copied ? `${C.green}30` : `${C.blue}30`}`,
          borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          transition: 'all 0.15s',
        }}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px', height: 60, width: '100%', boxSizing: 'border-box',
      background: `${C.bg}e8`, backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.border}`,
      ...inter,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>⬡</div>
        <span style={{ fontWeight: 700, fontSize: 15, color: C.text, ...display }}>DesignDrift</span>
      </div>

      {/* Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {['Features', 'How it works', 'Install', 'Extensions'].map(label => (
          <a
            key={label}
            href={`#${label.toLowerCase().replace(/ /g, '-')}`}
            style={{ fontSize: 13, color: C.muted, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          >
            {label}
          </a>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <a
          href="https://github.com/dyoon92/design-drift"
          target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: C.muted, textDecoration: 'none',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = C.text)}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          GitHub
        </a>
        <a
          href="?demo=1"
          style={{
            fontSize: 13, fontWeight: 600, padding: '6px 16px',
            background: C.blue, color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            textDecoration: 'none', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          ▶ See it in action
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
      textAlign: 'center', padding: '100px 40px 80px',
      position: 'relative', overflow: 'hidden',
      ...inter,
    }}>
      {/* Glow backdrop */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 800, height: 400,
        background: `radial-gradient(ellipse at 50% 0%, ${C.blueGlow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Chip color={C.blue}>Zero-config overlay</Chip>
        <Chip color={C.purple}>Figma token sync</Chip>
        <Chip color={C.green}>AI-powered fixes</Chip>
      </div>

      <h1 style={{
        ...display,
        fontSize: 'clamp(38px, 6.5vw, 76px)', fontWeight: 800,
        color: C.text, margin: '0 0 20px',
        lineHeight: 1.05, letterSpacing: -2, maxWidth: 860,
      }}>
        Catch design system drift
        <br />
        <span style={{
          background: `linear-gradient(90deg, ${C.blue}, ${C.purple})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>before it ships</span>
      </h1>

      <p style={{
        ...sans, fontSize: 18, color: C.muted, maxWidth: 560,
        lineHeight: 1.75, margin: '0 0 48px', fontWeight: 300,
      }}>
        A floating overlay that scans your React app in real time, flags
        components drifting from your design tokens, and suggests one-click AI fixes.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 56 }}>
        <a
          href="?demo=1"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 14, fontWeight: 700, padding: '12px 28px',
            background: C.blue, color: '#fff',
            borderRadius: 10, textDecoration: 'none',
            boxShadow: `0 0 32px ${C.blue}40`,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 40px ${C.blue}60` }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 32px ${C.blue}40` }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20, borderRadius: 999,
            background: 'rgba(255,255,255,0.25)',
            fontSize: 10,
          }}>▶</span>
          See it in action
        </a>
        <a
          href="#install"
          style={{
            fontSize: 14, fontWeight: 600, padding: '12px 28px',
            background: 'transparent', color: C.text,
            border: `1px solid ${C.border2}`, borderRadius: 10,
            textDecoration: 'none', transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = C.muted)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = C.border2)}
        >
          Get started free
        </a>
      </div>

      {/* Mock overlay preview */}
      <div style={{
        width: '100%', maxWidth: 900,
        background: C.surface, border: `1px solid ${C.border2}`,
        borderRadius: 16, overflow: 'hidden',
        boxShadow: `0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px ${C.border}`,
      }}>
        {/* Browser chrome */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderBottom: `1px solid ${C.border}`,
          background: '#0d0d16',
        }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: 999, background: c }} />
          ))}
          <div style={{
            marginLeft: 12, flex: 1, maxWidth: 300,
            background: C.border, borderRadius: 6, padding: '4px 12px',
            fontSize: 11, color: C.muted, ...mono,
          }}>
            localhost:5173
          </div>
        </div>
        {/* App + panel preview */}
        <div style={{ display: 'flex', minHeight: 320 }}>
          {/* Fake app area */}
          <div style={{ flex: 1, padding: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignContent: 'start' }}>
            {[
              { label: 'Total Revenue', value: '$42,800', color: C.green, dot: true },
              { label: 'Occupancy', value: '94.2%', color: C.blue, dot: false },
              { label: 'Past Due', value: '3 units', color: C.orange, dot: true },
              { label: 'New Leads', value: '12', color: C.purple, dot: false },
            ].map(card => (
              <div key={card.label} style={{
                padding: '16px 20px', borderRadius: 10,
                background: '#0e0e1a', border: `1px solid ${card.dot ? C.orange + '40' : C.border}`,
                position: 'relative',
              }}>
                {card.dot && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 8, height: 8, borderRadius: 999,
                    background: C.orange, boxShadow: `0 0 8px ${C.orange}`,
                  }} />
                )}
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, ...inter }}>{card.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: card.color, ...inter }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Fake panel */}
          <div style={{
            width: 260, borderLeft: `1px solid ${C.border}`,
            background: '#0c0c14', padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
            ...inter,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 2 }}>
              DesignDrift
            </div>
            <div style={{
              fontSize: 10, padding: '6px 10px', borderRadius: 6,
              background: `${C.orange}12`, border: `1px solid ${C.orange}30`,
              color: C.orange, fontWeight: 600,
            }}>
              ⚠ 4 drift violations found
            </div>
            {[
              { label: 'PastDueCard', issue: 'border-color not in tokens', type: 'color' },
              { label: 'RevenueWidget', issue: 'border-radius: 10px → use 8px', type: 'radius' },
              { label: 'OccupancyCard', issue: 'font-size: 22px → use 20px', type: 'type' },
            ].map(item => (
              <div key={item.label} style={{
                padding: '8px 10px', borderRadius: 8,
                background: C.surface, border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.text, marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 9, color: C.muted }}>{item.issue}</div>
                <div style={{
                  marginTop: 5, display: 'inline-block',
                  fontSize: 9, padding: '1px 6px', borderRadius: 4,
                  background: `${C.blue}15`, color: C.blue,
                }}>
                  Fix →
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '⬡',
    color: C.blue,
    title: 'Live token scanning',
    body: 'Reads your real CSS custom properties at runtime. No config needed — it finds your design tokens automatically.',
  },
  {
    icon: '⚡',
    color: C.orange,
    title: 'Instant re-scan',
    body: 'Watches for DOM mutations. When vibe-coded components change, drift is re-detected within milliseconds.',
  },
  {
    icon: '🤖',
    color: C.purple,
    title: 'AI-powered fixes',
    body: 'Hit Fix or Fix all to send a structured prompt to Claude. Get token-safe replacements, not hallucinated styles.',
  },
  {
    icon: '🔍',
    color: C.green,
    title: 'Component inspector',
    body: 'Click any highlighted element to see exactly which props are drifting and what they should be.',
  },
  {
    icon: '🗂️',
    color: C.pink,
    title: 'Figma token sync',
    body: 'Pull your color, spacing, and typography tokens directly from Figma with one command.',
  },
  {
    icon: '📦',
    color: C.orange,
    title: 'Bootstrap config',
    body: 'Register your component library once. DesignDrift maps usage counts so you know what\'s actually in production.',
  },
]

function Features() {
  return (
    <section id="features" style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto', ...inter }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <Chip color={C.blue}>Features</Chip>
        <h2 style={{ ...display, fontSize: 40, fontWeight: 800, color: C.text, margin: '16px 0 12px', letterSpacing: -1 }}>
          Everything you need to stay in sync
        </h2>
        <p style={{ ...sans, fontSize: 16, color: C.muted, maxWidth: 480, margin: '0 auto', fontWeight: 300, lineHeight: 1.7 }}>
          From live scanning to AI-assisted repairs, DesignDrift keeps your codebase and your design system speaking the same language.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {FEATURES.map(f => (
          <div key={f.title} style={{
            padding: '28px 28px', borderRadius: 14,
            background: C.surface, border: `1px solid ${C.border}`,
            transition: 'border-color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = f.color + '40')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, marginBottom: 16,
              background: `${f.color}18`, border: `1px solid ${f.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>
              {f.icon}
            </div>
            <div style={{ ...display, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>{f.title}</div>
            <div style={{ ...sans, fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{f.body}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    color: C.blue,
    title: 'Install the overlay',
    body: 'Add one import to your app entry point. The floating overlay appears in dev mode only.',
    code: `import { DSCoverageOverlay } from './ds-coverage/DSCoverageOverlay'`,
  },
  {
    n: '02',
    color: C.purple,
    title: 'Sync your Figma tokens',
    body: 'Run the sync script once to pull your design tokens into variables.css. Done.',
    code: 'npm run figma-sync',
  },
  {
    n: '03',
    color: C.green,
    title: 'Ship with confidence',
    body: 'Every time the DOM changes, DesignDrift rescans. Hit Fix all to patch violations with AI.',
    code: 'npm run drift-check',
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" style={{
      padding: '80px 40px', background: C.surface,
      borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
      ...inter,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Chip color={C.purple}>How it works</Chip>
          <h2 style={{ ...display, fontSize: 40, fontWeight: 800, color: C.text, margin: '16px 0 12px', letterSpacing: -1 }}>
            Up and running in minutes
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ position: 'relative' }}>
              <div style={{
                fontSize: 48, fontWeight: 900, color: `${s.color}18`,
                position: 'absolute', top: -8, left: 0,
                ...mono, lineHeight: 1,
              }}>{s.n}</div>
              <div style={{ paddingTop: 40 }}>
                <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{s.title}</div>
                <div style={{ ...sans, fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>{s.body}</div>
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: '#0a0a10', border: `1px solid ${C.border2}`,
                  fontSize: 12, color: s.color, ...mono,
                  wordBreak: 'break-all',
                }}>
                  {s.code}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Extensions ───────────────────────────────────────────────────────────────
function ExtensionCard({
  icon, color, badge, title, body, bullets, cta, ctaHref,
}: {
  icon: string; color: string; badge: string; title: string; body: string
  bullets: string[]; cta: string; ctaHref: string
}) {
  return (
    <div style={{
      flex: 1, minWidth: 280,
      padding: '36px 36px', borderRadius: 16,
      background: C.surface, border: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', gap: 16,
      ...inter,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `${color}18`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        }}>{icon}</div>
        <div>
          <Chip color={color}>{badge}</Chip>
          <div style={{ ...display, fontSize: 18, fontWeight: 700, color: C.text, marginTop: 6 }}>{title}</div>
        </div>
      </div>

      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, margin: 0 }}>{body}</p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {bullets.map(b => (
          <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: C.text }}>
            <span style={{ color, marginTop: 1, flexShrink: 0 }}>✓</span>
            {b}
          </li>
        ))}
      </ul>

      <a
        href={ctaHref}
        target="_blank" rel="noopener noreferrer"
        style={{
          marginTop: 'auto', fontSize: 13, fontWeight: 700,
          padding: '10px 20px', borderRadius: 8, textAlign: 'center',
          background: `${color}15`, color,
          border: `1px solid ${color}30`, textDecoration: 'none',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = `${color}25`)}
        onMouseLeave={e => (e.currentTarget.style.background = `${color}15`)}
      >
        {cta}
      </a>
    </div>
  )
}

function Extensions() {
  return (
    <section id="extensions" style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto', ...inter }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <Chip color={C.orange}>Extensions</Chip>
        <h2 style={{ ...display, fontSize: 40, fontWeight: 800, color: C.text, margin: '16px 0 12px', letterSpacing: -1 }}>
          Works where you work
        </h2>
        <p style={{ ...sans, fontSize: 16, color: C.muted, maxWidth: 480, margin: '0 auto', fontWeight: 300, lineHeight: 1.7 }}>
          Use the overlay in-browser, inspect live components from VS Code, or run drift checks in CI — your choice.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <ExtensionCard
          icon="🌐"
          color={C.blue}
          badge="Browser Extension"
          title="Inspect any deployed app"
          body="Inject the DesignDrift overlay into any running React app without touching its source code. Works on staging, preview deployments, and production."
          bullets={[
            'One-click activation on any React page',
            'No source code access needed',
            'Reads live CSS custom properties',
            'Works with Chrome and Edge',
          ]}
          cta="Install Chrome extension →"
          ctaHref="https://github.com/dyoon92/design-drift/tree/main/browser-extension"
        />
        <ExtensionCard
          icon="⬡"
          color={C.purple}
          badge="VS Code Extension"
          title="Drift warnings in your editor"
          body="Get inline diagnostics directly in your editor as you write components. Hover over a prop to see which token it should use — without switching tabs."
          bullets={[
            'Inline drift diagnostics as you type',
            'Token suggestion on hover',
            'Syncs with your figma-sync tokens',
            'Works with any Vite / CRA project',
          ]}
          cta="Install VS Code extension →"
          ctaHref="https://github.com/dyoon92/design-drift/tree/main/vscode-extension"
        />
        <ExtensionCard
          icon="🔁"
          color={C.green}
          badge="CI Integration"
          title="Fail the build on drift"
          body="Run drift-check in your GitHub Actions pipeline to block PRs that introduce design system violations before they reach production."
          bullets={[
            'JSON report with per-component violations',
            'Exit code 1 on any new drift',
            'Works with any CI provider',
            'Optional Slack / PR comment output',
          ]}
          cta="View CI setup guide →"
          ctaHref="https://github.com/dyoon92/design-drift#ci"
        />
      </div>
    </section>
  )
}

// ─── Install ──────────────────────────────────────────────────────────────────
function Install() {
  return (
    <section id="install" style={{
      padding: '80px 40px',
      background: C.surface,
      borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
      ...inter,
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Chip color={C.green}>Get started</Chip>
          <h2 style={{ ...display, fontSize: 40, fontWeight: 800, color: C.text, margin: '16px 0 12px', letterSpacing: -1 }}>
            Install in 2 minutes
          </h2>
          <p style={{ fontSize: 16, color: C.muted }}>
            No account required. Works with any React + Vite or CRA project.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, letterSpacing: 0.4 }}>
              1 · Clone or copy the overlay into your project
            </div>
            <CodeLine>git clone https://github.com/dyoon92/design-drift</CodeLine>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, letterSpacing: 0.4 }}>
              2 · Install dependencies
            </div>
            <CodeLine>npm install</CodeLine>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, letterSpacing: 0.4 }}>
              3 · Sync your Figma tokens (requires FIGMA_TOKEN env var)
            </div>
            <CodeLine>npm run figma-sync</CodeLine>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, letterSpacing: 0.4 }}>
              4 · Start the dev server
            </div>
            <CodeLine>npm run dev</CodeLine>
          </div>
        </div>

        <div style={{
          marginTop: 40, padding: '20px 24px', borderRadius: 12,
          background: `${C.blue}0a`, border: `1px solid ${C.blue}20`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginBottom: 6 }}>
            🔑 Figma token sync
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            Set <code style={{ ...mono, background: C.border, padding: '1px 5px', borderRadius: 4, color: C.text }}>FIGMA_TOKEN</code> and{' '}
            <code style={{ ...mono, background: C.border, padding: '1px 5px', borderRadius: 4, color: C.text }}>FIGMA_FILE_KEY</code> in your{' '}
            <code style={{ ...mono, background: C.border, padding: '1px 5px', borderRadius: 4, color: C.text }}>.env</code> file.
            Run <code style={{ ...mono, background: C.border, padding: '1px 5px', borderRadius: 4, color: C.text }}>npm run figma-sync</code> to
            auto-generate <code style={{ ...mono, background: C.border, padding: '1px 5px', borderRadius: 4, color: C.text }}>src/tokens/variables.css</code>.
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────
function About() {
  return (
    <section id="about" style={{ padding: '80px 40px', maxWidth: 760, margin: '0 auto', textAlign: 'center', ...inter }}>
      <Chip color={C.pink}>About</Chip>
      <h2 style={{ ...display, fontSize: 36, fontWeight: 800, color: C.text, margin: '16px 0 16px', letterSpacing: -1 }}>
        Built for design-engineering teams
      </h2>
      <p style={{ ...sans, fontSize: 15, color: C.muted, lineHeight: 1.8, marginBottom: 20 }}>
        DesignDrift was built because the gap between Figma and production is a real problem —
        not just for big enterprises, but for any team moving fast with AI-assisted code.
        When vibe-coded components ship without token validation, the design system erodes silently.
      </p>
      <p style={{ ...sans, fontSize: 15, color: C.muted, lineHeight: 1.8, marginBottom: 40 }}>
        This tool sits at that boundary. It's lightweight, non-invasive, and designed to
        feel like a natural extension of your dev workflow — not a compliance gate.
      </p>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href="https://github.com/dyoon92/design-drift/issues"
          target="_blank" rel="noopener noreferrer"
          style={{
            fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 8,
            background: 'transparent', color: C.text,
            border: `1px solid ${C.border2}`, textDecoration: 'none',
          }}
        >
          File an issue
        </a>
        <a
          href="https://github.com/dyoon92/design-drift"
          target="_blank" rel="noopener noreferrer"
          style={{
            fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 8,
            background: C.blue, color: '#fff',
            textDecoration: 'none',
          }}
        >
          Star on GitHub ★
        </a>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`,
      padding: '32px 40px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 16,
      ...inter,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11,
        }}>⬡</div>
        <span style={{ fontSize: 13, color: C.muted }}>DesignDrift — open source</span>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {[
          { label: 'GitHub', href: 'https://github.com/dyoon92/design-drift' },
          { label: 'Issues', href: 'https://github.com/dyoon92/design-drift/issues' },
          { label: 'Browser Extension', href: 'https://github.com/dyoon92/design-drift/tree/main/browser-extension' },
          { label: 'VS Code Extension', href: 'https://github.com/dyoon92/design-drift/tree/main/vscode-extension' },
        ].map(l => (
          <a
            key={l.label}
            href={l.href}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: C.muted, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          >
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
    <div style={{
      background: C.bg, minHeight: '100vh', color: C.text,
      width: '100%', overflowX: 'hidden', boxSizing: 'border-box',
    }}>
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Extensions />
      <Install />
      <About />
      <Footer />
    </div>
  )
}
