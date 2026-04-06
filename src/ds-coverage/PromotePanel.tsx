/**
 * PromotePanel — full vibe-code → DS promotion flow
 * ──────────────────────────────────────────────────
 * When a custom component appears frequently enough to be a DS candidate,
 * this panel walks the user through promoting it completely:
 *
 *   1. Plan   — choose where it lives in Figma, describe it, confirm scope
 *   2. Act    — four ready-to-run artifacts:
 *                 • Figma MCP prompt  (creates component frame in Figma)
 *                 • Code prompt       (builds src/stories/Component.tsx)
 *                 • Story scaffold    (creates Component.stories.tsx)
 *                 • Config snippet    (registers in config.ts)
 *
 * Figma page list is fetched live from the Figma REST API if a token is
 * stored in localStorage (drift-figma-token). If not, the user can still
 * promote — they just skip the Figma step.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { config, fetchFigmaPages, FIGMA_TOKEN_KEY } from './manifest'

// ─── Colors ───────────────────────────────────────────────────────────────────

function makeColors(theme: 'dark' | 'light') {
  if (theme === 'light') {
    return {
      bg:      'rgba(253,250,245,0.98)',
      surface: '#f5f0e8',
      surface2:'#ede8e0',
      border:  'rgba(120,90,40,0.13)',
      text:    '#1a1207',
      muted:   '#7a6a55',
      sub:     '#5a4a35',
      blue:    '#2563eb',
      green:   '#16a34a',
      purple:  '#7c3aed',
      orange:  '#d97706',
      amber:   '#b45309',
      red:     '#dc2626',
    }
  }
  return {
    bg:      '#09090f',
    surface: '#0f0f18',
    surface2:'#13131f',
    border:  '#1e1e2e',
    text:    '#eeeef4',
    muted:   '#6b6b82',
    sub:     '#9999b0',
    blue:    '#4f8ef7',
    green:   '#34d399',
    purple:  '#a78bfa',
    orange:  '#fb923c',
    amber:   '#f59e0b',
    red:     '#ef4444',
  }
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface PromotePanelProps {
  componentName: string
  count: number
  figmaFileKey: string
  storybookUrl: string
  theme?: 'dark' | 'light'
  onClose: () => void
  onPromoted: (name: string) => void
}

// ─── Artifact generators ───────────────────────────────────────────────────────

function buildFigmaPrompt(name: string, targetPage: string, description: string, figmaFileKey: string): string {
  const desc = description.trim() || `A reusable UI component used ${name} across the product.`
  return `Using the Figma MCP, create a new component in my Figma file.

File key: ${figmaFileKey}
Target page: "${targetPage}"
Component name: ${name}

Description: ${desc}

Instructions:
1. Open the Figma file (key: ${figmaFileKey}) using the MCP
2. Navigate to the page named "${targetPage}"
3. Create a new component frame named "${name}"
4. Build the component structure based on its usage in the codebase — inspect any screenshots or context provided
5. Use the design token naming convention: colors as ds-color-*, spacing as ds-spacing-*
6. Create at least one variant (default state)
7. Add a description to the component: "${desc}"
8. Publish the component to the library

After creating it, tell me:
- The exact Figma node URL (figma.com/design/...?node-id=...)
- Which page it was created on
- Any variants you created`
}

function buildCodePrompt(name: string, count: number, description: string, figmaFileKey: string, _storybookUrl: string): string {
  const desc = description.trim() || `used ${count} times in the app`
  const hasFigma = figmaFileKey.trim().length > 0
  const storyIdSlug = `components-${name.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '').toLowerCase()}--default`

  return `Add "${name}" to our design system. It appears ${count} times in the app but isn't registered yet.

${hasFigma ? `Figma file: https://www.figma.com/design/${figmaFileKey} — look for a component named "${name}" to use as reference.

` : ''}Context: ${desc}

## Step 1 — Build the component
Create: src/stories/${name}.tsx

Rules (never break these):
- Colors: var(--ds-color-*) only — never hardcoded hex or rgb
- Spacing: var(--ds-spacing-*) and var(--ds-border-radius-*) only
- Inline styles only — no CSS files, no Tailwind
- No new npm dependencies
- Font: Inter, system-ui, sans-serif
- Export as named: export function ${name}(...)
- TypeScript props with JSDoc comment

## Step 2 — Register in Drift config
Add to src/ds-coverage/config.ts under components:

  ${name}: { storyPath: '${storyIdSlug}' },

## Step 3 — Verify
Run: npm run dev → press D → "${name}" should appear green.`
}

function buildStoryScaffold(name: string): string {
  const slug = name.replace(/([A-Z])/g, (_m, c, i) => (i > 0 ? '-' : '') + c.toLowerCase())
  return `import type { Meta, StoryObj } from '@storybook/react-vite'
import { ${name} } from './${name}'

const meta: Meta<typeof ${name}> = {
  title: 'Components/${name}',
  component: ${name},
  parameters: { layout: 'padded' },
}
export default meta

export const Default: StoryObj<typeof ${name}> = {
  name: 'Default',
  render: () => <${name} />,
}

// story ID for config.ts → 'components-${slug}--default'`
}

function buildConfigSnippet(name: string, storyPath?: string): string {
  const slug = `components-${name.replace(/([A-Z])/g, (_m, c, i) => (i > 0 ? '-' : '') + c.toLowerCase()).toLowerCase()}--default`
  const path = storyPath ?? slug
  return `// Add inside the components: {} block in src/ds-coverage/config.ts\n${name}: { storyPath: '${path}' },`
}

// ─── PromotePanel ──────────────────────────────────────────────────────────────

type Phase = 'plan' | 'act'
type Artifact = 'figma' | 'code' | 'story' | 'config'

export function PromotePanel({
  componentName,
  count,
  figmaFileKey,
  storybookUrl,
  theme = 'dark',
  onClose,
  onPromoted,
}: PromotePanelProps) {
  const C = makeColors(theme)
  const [phase,       setPhase]       = useState<Phase>('plan')
  const [artifact,    setArtifact]    = useState<Artifact>('figma')
  const [description, setDescription] = useState('')
  const [figmaPages,  setFigmaPages]  = useState<Array<{ id: string; name: string }>>([])
  const [targetPage,  setTargetPage]  = useState('')
  const [loadingPages,setLoadingPages]= useState(false)
  const [hasFigmaToken, setHasFigmaToken] = useState(false)
  const [copied,      setCopied]      = useState<Artifact | null>(null)

  const isHighFreq = count >= 5

  // ─── Load Figma pages ───────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(FIGMA_TOKEN_KEY)
    setHasFigmaToken(!!token && !!figmaFileKey)
    if (!token || !figmaFileKey) return

    setLoadingPages(true)
    fetchFigmaPages().then(pages => {
      setFigmaPages(pages)
      // Auto-select: prefer a page named "Components", "Design System", or "UI Kit"
      const preferred = pages.find(p =>
        /components?|design.?system|ui.?kit|library/i.test(p.name)
      )
      if (preferred) setTargetPage(preferred.name)
      else if (pages.length > 0) setTargetPage(pages[0].name)
      setLoadingPages(false)
    })
  }, [figmaFileKey])

  // ─── Copy helper ────────────────────────────────────────────────────────
  const copyArtifact = useCallback(async (type: Artifact, text: string) => {
    try { await navigator.clipboard.writeText(text) } catch { prompt('Copy:', text) }
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const handlePromoted = useCallback(() => {
    localStorage.setItem(`drift-promoted-${componentName}`, '1')
    onPromoted(componentName)
    onClose()
  }, [componentName, onPromoted, onClose])

  // ─── Shared styles ──────────────────────────────────────────────────────
  const panel: React.CSSProperties = {
    flex: 1, display: 'flex', flexDirection: 'column',
    fontFamily: 'Inter, system-ui, sans-serif', color: C.text,
    background: C.bg, overflow: 'hidden',
  }
  const label: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: C.muted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
    display: 'block',
  }
  const copyBtn = (type: Artifact, text: string) => (
    <button
      onClick={() => copyArtifact(type, text)}
      style={{
        background: copied === type ? C.green : C.blue,
        color: '#fff', border: 'none', borderRadius: 6,
        padding: '4px 10px', fontSize: 11, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      {copied === type ? '✓ Copied' : 'Copy'}
    </button>
  )

  // ─── Pre-compute artifacts ──────────────────────────────────────────────
  const figmaPrompt  = buildFigmaPrompt(componentName, targetPage || 'Components', description, figmaFileKey)
  const codePrompt   = buildCodePrompt(componentName, count, description, figmaFileKey, storybookUrl)
  const storyCode    = buildStoryScaffold(componentName)
  const configSnip   = buildConfigSnippet(componentName)

  // ─── Phase: Plan ────────────────────────────────────────────────────────

  if (phase === 'plan') {
    return (
      <div style={panel}>
        {/* Header */}
        <div style={{ padding: '12px 16px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: C.muted, marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Overview
          </button>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
            Promote <code style={{ fontFamily: 'monospace', color: C.purple }}>{componentName}</code> to DS
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            Appeared {count} time{count !== 1 ? 's' : ''} as a custom component.
            {' '}We'll create it properly so every future build uses the real DS version.
          </div>
          {isHighFreq && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
              padding: '3px 9px', borderRadius: 20,
              background: `${C.amber}18`, border: `1px solid ${C.amber}35`,
              fontSize: 11, fontWeight: 700, color: C.amber,
            }}>⬆ High frequency — strong DS candidate</div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* What will happen */}
          <div>
            <span style={label}>What we'll create</span>
            {[
              {
                icon: '◈',
                color: C.purple,
                title: hasFigmaToken
                  ? `Figma component on "${targetPage || '…'}"`
                  : 'Figma component',
                sub: hasFigmaToken
                  ? `Created on the "${targetPage}" page in your file — with a direct link back here`
                  : 'Figma token not connected — skip this step or add your token in Settings',
                dim: !hasFigmaToken,
              },
              { icon: '⚡', color: C.blue, title: `src/stories/${componentName}.tsx`, sub: 'The component built from your DS tokens — no hardcoded values', dim: false },
              { icon: '📖', color: C.sub, title: `src/stories/${componentName}.stories.tsx`, sub: 'A Storybook story so it appears in your catalog', dim: false },
              { icon: '✓', color: C.green, title: 'Registered in config.ts', sub: 'Drift will recognise it as DS on the next scan', dim: false },
            ].map(item => (
              <div key={item.title} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '8px 10px', borderRadius: 8, marginBottom: 6,
                background: C.surface, border: `1px solid ${C.border}`,
                opacity: item.dim ? 0.5 : 1,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: `${item.color}18`, border: `1px solid ${item.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: item.color,
                }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2, fontFamily: 'monospace' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, fontFamily: 'Inter, system-ui, sans-serif' }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Figma page picker */}
          {hasFigmaToken && (
            <div>
              <span style={label}>Target Figma page</span>
              {loadingPages ? (
                <div style={{ fontSize: 11, color: C.muted }}>Loading pages from Figma…</div>
              ) : figmaPages.length > 0 ? (
                <select
                  value={targetPage}
                  onChange={e => setTargetPage(e.target.value)}
                  style={{
                    width: '100%', background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '8px 10px', color: C.text,
                    fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', outline: 'none',
                  }}
                >
                  {figmaPages.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={targetPage}
                  onChange={e => setTargetPage(e.target.value)}
                  placeholder="e.g. Components, Design System, UI Kit"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '8px 10px', color: C.text,
                    fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', outline: 'none',
                  }}
                />
              )}
              <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
                The component frame will be created here. Your team will see it at{' '}
                <strong style={{ color: C.text }}>Figma → {targetPage || '…'} → {componentName}</strong>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <span style={label}>What does it do? <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional — helps Claude build it better)</span></span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={`e.g. "A card showing a tenant's payment status with a badge and action button"`}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical',
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '8px 10px', color: C.text,
                fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1.6, outline: 'none',
              }}
            />
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setPhase('act')}
            style={{
              background: C.purple, color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 16px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Generate promotion artifacts →
          </button>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '7px 16px', fontSize: 11, fontWeight: 600,
            color: C.muted, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
          }}>
            Not now
          </button>
        </div>
      </div>
    )
  }

  // ─── Phase: Act ─────────────────────────────────────────────────────────

  const artifacts: Array<{ key: Artifact; icon: string; label: string; sub: string; text: string; color: string; disabled?: boolean }> = [
    {
      key: 'figma', icon: '◈', color: C.purple,
      label: hasFigmaToken ? `Create in Figma — "${targetPage}"` : 'Create in Figma',
      sub: hasFigmaToken
        ? `Paste into Claude Code → it creates "${componentName}" on your "${targetPage}" page`
        : 'Add your Figma token to enable this step',
      text: figmaPrompt,
      disabled: !hasFigmaToken,
    },
    { key: 'code', icon: '⚡', color: C.blue, label: 'Build the component', sub: 'Paste into Claude Code or Cursor — builds src/stories/' + componentName + '.tsx', text: codePrompt },
    { key: 'story', icon: '📖', color: C.sub, label: 'Story scaffold', sub: 'Copy into src/stories/' + componentName + '.stories.tsx', text: storyCode },
    { key: 'config', icon: '✓', color: C.green, label: 'Register in config.ts', sub: 'Add this inside the components: {} block in src/ds-coverage/config.ts', text: configSnip },
  ]

  const active = artifacts.find(a => a.key === artifact) ?? artifacts[0]

  return (
    <div style={panel}>
      {/* Header */}
      <div style={{ padding: '12px 16px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={() => setPhase('plan')} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, color: C.muted, marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>
          Promoting <code style={{ fontFamily: 'monospace', color: C.purple }}>{componentName}</code>
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>Run each step in order. Copy → paste into Claude Code or your editor.</div>
      </div>

      {/* Step tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto' }}>
        {artifacts.map((a, i) => (
          <button
            key={a.key}
            onClick={() => !a.disabled && setArtifact(a.key)}
            style={{
              flex: '0 0 auto', padding: '8px 12px',
              background: 'none', border: 'none', cursor: a.disabled ? 'not-allowed' : 'pointer',
              fontSize: 11, fontWeight: 700,
              color: a.disabled ? C.border : artifact === a.key ? a.color : C.muted,
              borderBottom: `2px solid ${artifact === a.key ? a.color : 'transparent'}`,
              fontFamily: 'Inter, system-ui, sans-serif', transition: 'color 0.15s',
              display: 'flex', alignItems: 'center', gap: 5, opacity: a.disabled ? 0.4 : 1,
            }}
          >
            <span>{a.icon}</span>
            <span>{i + 1}</span>
          </button>
        ))}
      </div>

      {/* Active artifact */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: active.color, marginBottom: 3 }}>{active.label}</div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{active.sub}</div>
          </div>
          {!active.disabled && copyBtn(active.key, active.text)}
        </div>

        {active.key === 'figma' && hasFigmaToken && (
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: `${C.purple}10`, border: `1px solid ${C.purple}25`,
            fontSize: 11, color: C.purple, lineHeight: 1.6,
          }}>
            ◈ After running this in Claude Code, your component will appear at:<br/>
            <strong>Figma → {targetPage} → {componentName}</strong>
            {config.figmaFileKey && (
              <>
                {' '} · {' '}
                <a
                  href={`https://www.figma.com/design/${config.figmaFileKey}`}
                  target="_blank" rel="noreferrer"
                  style={{ color: C.purple }}
                >
                  Open Figma file →
                </a>
              </>
            )}
          </div>
        )}

        {active.key === 'figma' && !hasFigmaToken && (
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: C.surface, border: `1px solid ${C.border}`,
            fontSize: 11, color: C.muted, lineHeight: 1.6,
          }}>
            To create components in Figma automatically, add your Figma personal access token.<br/>
            Get one at: figma.com → Profile → Settings → Security → Personal access tokens<br/>
            Then add it in Drift Settings (gear icon).
          </div>
        )}

        {!active.disabled && (
          <pre style={{
            margin: 0, padding: '12px', borderRadius: 8,
            background: C.surface2, border: `1px solid ${C.border}`,
            fontSize: 10.5, color: C.sub, lineHeight: 1.65,
            fontFamily: "'Fira Code', 'Cascadia Code', Menlo, monospace",
            flex: 1, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {active.text}
          </pre>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handlePromoted}
          style={{
            background: C.green, color: '#111', border: 'none', borderRadius: 8,
            padding: '9px 16px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Done — mark as promoted ✓
        </button>
        <button onClick={onClose} style={{
          background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '7px 16px', fontSize: 11, fontWeight: 600,
          color: C.muted, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          Finish later
        </button>
      </div>
    </div>
  )
}
