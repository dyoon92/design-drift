/**
 * PromotePanel — "Promote to DS" flow
 * ─────────────────────────────────────
 * Surfaces inside the Drift overlay when a gap component appears frequently
 * enough to be a design system candidate. Generates a ready-to-paste
 * Cursor / Claude prompt and guides the user through the process.
 */

import React, { useState, useCallback } from 'react'

// ─── Color palette (matches overlay dark theme) ────────────────────────────────

const C = {
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
} as const

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface PromotePanelProps {
  componentName: string
  count: number
  figmaFileKey: string
  storybookUrl: string
  onClose: () => void
  onPromoted: (name: string) => void
}

// ─── Prompt generator ──────────────────────────────────────────────────────────

function buildPromotePrompt(
  componentName: string,
  count: number,
  figmaFileKey: string,
  storybookUrl: string,
): string {
  const hasFigma = figmaFileKey.trim().length > 0
  const step2 = hasFigma ? 2 : 1
  const step3 = hasFigma ? 3 : 2
  const step4 = hasFigma ? 4 : 3

  const figmaSection = hasFigma
    ? `## Step 1 — Find it in Figma
Using Figma MCP, open the file with key "${figmaFileKey}".
Look for a component, frame, or section named "${componentName}" or something visually similar.
Inspect its structure, colors, spacing, and variants.

`
    : ''

  const storyIdSlug = `components-${componentName.toLowerCase()}--default`

  return `You are adding a new component to our design system.

## Component: ${componentName}

This component appeared ${count} times in the app but isn't in the design system yet.
Build it properly so future AI-assisted work uses the real DS component.

${figmaSection}## Step ${step2} — Build the component
Create: src/stories/${componentName}.tsx

Rules (never break these):
- Colors: var(--ds-color-*) only — never hardcoded hex or rgb
- Spacing: var(--ds-spacing-*) and var(--ds-border-radius-*) only
- Inline styles only — no CSS files, no CSS modules, no Tailwind
- No new npm dependencies
- Font: Inter, system-ui, sans-serif
- Export as a named export: export function ${componentName}(...)

Component must accept sensible props with TypeScript types.
Add a brief JSDoc comment describing what it's used for.

## Step ${step3} — Add Storybook stories
Create: src/stories/${componentName}.stories.ts

Export:
- meta with title: 'Components/${componentName}'
- At least one default story with realistic prop values

Storybook is running at: ${storybookUrl}

## Step ${step4} — Register in Drift
Add this to src/ds-coverage/config.ts under components:

  ${componentName}: { storyPath: '${storyIdSlug}' },

Then restart your dev server and press D — it should appear as a DS component.`
}

// ─── PromotePanel ──────────────────────────────────────────────────────────────

export function PromotePanel({
  componentName,
  count,
  figmaFileKey,
  storybookUrl,
  onClose,
  onPromoted,
}: PromotePanelProps) {
  const [copied, setCopied] = useState(false)
  const promptText = buildPromotePrompt(componentName, count, figmaFileKey, storybookUrl)

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(promptText) } catch { prompt('Copy prompt:', promptText) }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [promptText])

  const handlePromoted = useCallback(() => {
    localStorage.setItem(`drift-promoted-${componentName}`, '1')
    onPromoted(componentName)
    onClose()
  }, [componentName, onPromoted, onClose])

  const isHighFrequency = count >= 5
  const isWorthPromoting = count >= 3 && count < 5

  // ─── Shared micro-styles ─────────────────────────────────────────────────

  const panelStyle: React.CSSProperties = {
    flex: 1, display: 'flex', flexDirection: 'column',
    fontFamily: 'system-ui, sans-serif', color: C.text,
    background: C.bg, overflow: 'hidden',
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: C.muted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 8,
  }

  return (
    <div style={panelStyle}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 16px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {/* Back button */}
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: C.muted, marginBottom: 8,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Overview
        </button>

        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>
          Promote to design system
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          <code style={{ fontFamily: 'monospace', color: C.sub }}>{componentName}</code>
          {' '}appeared {count} time{count !== 1 ? 's' : ''} — it's a DS candidate
        </div>

        {/* Frequency badge */}
        {isHighFrequency && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginTop: 8, padding: '3px 9px', borderRadius: 20,
            background: `${C.amber}18`, border: `1px solid ${C.amber}35`,
            fontSize: 11, fontWeight: 700, color: C.amber,
          }}>
            ⬆ High frequency — strong DS candidate
          </div>
        )}
        {isWorthPromoting && !isHighFrequency && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginTop: 8, padding: '3px 9px', borderRadius: 20,
            background: `${C.blue}18`, border: `1px solid ${C.blue}35`,
            fontSize: 11, fontWeight: 700, color: C.blue,
          }}>
            Worth promoting
          </div>
        )}
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Section 1 — Find in Figma */}
        <div>
          <div style={sectionLabelStyle}>1. Find it in Figma</div>
          {figmaFileKey.trim() ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6 }}>
                We'll search your Figma file for a matching component or frame.
              </div>
              <a
                href={`https://www.figma.com/design/${figmaFileKey}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 8,
                  background: C.surface, border: `1px solid ${C.border}`,
                  fontSize: 11, fontWeight: 600, color: C.blue,
                  textDecoration: 'none',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Open Figma →
              </a>
            </div>
          ) : (
            <div style={{
              fontSize: 11, color: C.muted, lineHeight: 1.6,
              padding: '10px 12px', borderRadius: 8,
              background: C.surface, border: `1px solid ${C.border}`,
            }}>
              Add your Figma file key in{' '}
              <code style={{ fontFamily: 'monospace', color: C.orange }}>config.ts</code>
              {' '}to enable Figma lookup. You can still build from scratch using the prompt below.
            </div>
          )}
        </div>

        {/* Section 2 — Generated prompt */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={sectionLabelStyle}>2. Generated Cursor / Claude prompt</div>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? C.green : C.blue,
                color: '#fff', border: 'none', borderRadius: 6,
                padding: '4px 10px', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
                transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              {copied ? 'Copied!' : 'Copy prompt'}
            </button>
          </div>
          <pre style={{
            margin: 0, padding: '12px', borderRadius: 8,
            background: C.surface2, border: `1px solid ${C.border}`,
            fontSize: 10.5, color: C.sub, lineHeight: 1.65,
            fontFamily: "'Fira Code', 'Cascadia Code', Menlo, monospace",
            maxHeight: 280, overflowY: 'auto', whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {promptText}
          </pre>
        </div>

        {/* Section 3 — What to do next */}
        <div>
          <div style={sectionLabelStyle}>3. What to do next</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              {
                n: 1,
                label: 'Copy the prompt above',
                detail: 'Paste into Cursor or Claude Code in your project root',
              },
              {
                n: 2,
                label: 'Review the generated component',
                detail: 'Check colors, spacing, and props match the design',
              },
              {
                n: 3,
                label: 'Click below when you\'ve added it to Storybook',
                detail: 'Drift will track it as promoted and remove it from gaps',
              },
            ].map(({ n, label, detail }) => (
              <div
                key={n}
                style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '9px 10px', borderRadius: 8,
                  background: C.surface, border: `1px solid ${C.border}`,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: `${C.purple}20`, border: `1px solid ${C.purple}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: C.purple,
                }}>{n}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px', borderTop: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
        background: C.bg,
      }}>
        <button
          onClick={handlePromoted}
          style={{
            background: C.green, color: '#111', border: 'none', borderRadius: 8,
            padding: '9px 16px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
          }}
        >
          I've added it to Storybook ✓
        </button>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '7px 16px', fontSize: 11, fontWeight: 600,
            color: C.muted, cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  )
}
