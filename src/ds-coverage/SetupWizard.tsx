/**
 * SetupWizard — first-run configuration wizard for Drift
 * ───────────────────────────────────────────────────────
 * Renders inside the overlay panel when 0 components are registered.
 * Guides the user through:
 *   1. Welcome
 *   2. Connect Storybook (auto-discover component names)
 *   3. Select which components are DS components
 *   4. Export config.ts snippet + CLAUDE.md content
 */

import React, { useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StorybookEntry {
  id: string
  title: string
  name: string
  importPath?: string
}

interface StorybookIndex {
  entries?: Record<string, StorybookEntry>
  stories?: Record<string, StorybookEntry>
}

interface DiscoveredComponent {
  /** Display title, e.g. "Primitives/Button" → "Button" */
  displayName: string
  /** Best-guess story ID for this component */
  storyPath: string
}

type WizardStep = 1 | 2 | 3 | 4 | 'manual'
type ExportTab = 'config' | 'claude'

// ─── Color palette (matches overlay dark theme) ───────────────────────────────

const C = {
  bg:      '#09090f',
  surface: '#0f0f18',
  border:  '#1e1e2e',
  text:    '#eeeef4',
  muted:   '#6b6b82',
  blue:    '#4f8ef7',
  green:   '#34d399',
  orange:  '#fb923c',
  red:     '#ef4444',
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractDisplayName(title: string): string {
  // "Primitives/Button" → "Button", "Shell/Navbar" → "Navbar", "Button" → "Button"
  const parts = title.split('/')
  return parts[parts.length - 1].trim()
}

function toIdentifier(name: string): string {
  // "My Component" → "MyComponent"
  return name.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
             .replace(/^[^a-zA-Z]/, '')
             || name
}

function buildConfigSnippet(
  storybookUrl: string,
  figmaFileKey: string,
  selected: DiscoveredComponent[],
): string {
  const compLines = selected.map(c =>
    `    ${toIdentifier(c.displayName)}: { storyPath: '${c.storyPath}' },`
  ).join('\n')

  return `const config: DesignDriftConfig = {
  storybookUrl: '${storybookUrl}',
  figmaFileKey: '${figmaFileKey}', // optional — add your Figma file key
  threshold: 80,
  components: {
    // Discovered from Storybook
${compLines}
  },
}

export default config`
}

function buildClaudeContent(selected: DiscoveredComponent[]): string {
  const tableRows = selected.map(c =>
    `| \`${toIdentifier(c.displayName)}\` | \`${c.storyPath}\` |`
  ).join('\n')

  return `# Design System Rules

## Available components (always use these — never invent custom UI)

| Component | Story Path |
|---|---|
${tableRows}

## Style rules
- All colors must use CSS variables: \`var(--ds-color-*)\`
- All spacing must use CSS variables: \`var(--ds-spacing-*)\`
- No CSS files or modules — inline styles only
- No new dependencies without asking

## If a component is missing
Use a \`<Placeholder>\` and output:
⚠️ Missing component: [ComponentName]
This needs to be designed in Figma first before it can be built.
Next step: file a design request so it can be added to the component library.`
}

// ─── SetupWizard ─────────────────────────────────────────────────────────────

export interface SetupWizardProps {
  onDone: () => void
}

export function SetupWizard({ onDone }: SetupWizardProps) {
  const [step, setStep] = useState<WizardStep>(1)

  // Step 2
  const [sbUrl, setSbUrl]       = useState('http://localhost:6006')
  const [fetching, setFetching] = useState(false)
  const [fetchErr, setFetchErr] = useState<string | null>(null)
  const [discovered, setDiscovered] = useState<DiscoveredComponent[]>([])

  // Step 3
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Step 4
  const [figmaKey, setFigmaKey] = useState('')
  const [activeTab, setActiveTab] = useState<ExportTab>('config')
  const [configCopied, setConfigCopied] = useState(false)
  const [claudeCopied, setClaudeCopied] = useState(false)

  // ─── Storybook discovery ──────────────────────────────────────────────────

  const handleDiscover = useCallback(async () => {
    setFetching(true)
    setFetchErr(null)
    try {
      const url = sbUrl.replace(/\/$/, '')
      let res: Response
      try {
        res = await fetch(`${url}/index.json`)
      } catch {
        // Network error — connection refused or CORS preflight blocked
        setFetchErr(
          `Can't reach ${url}. Check that Storybook is running and accessible from this page. ` +
          `If Storybook is on a different port or domain, CORS may be blocking the request — use manual setup instead.`
        )
        return
      }
      if (res.status === 401 || res.status === 403) {
        setFetchErr(`Storybook returned ${res.status} — it appears to be protected. Use manual setup to enter component names directly.`)
        return
      }
      if (!res.ok) {
        setFetchErr(`Storybook returned HTTP ${res.status}. Check the URL and try again, or use manual setup.`)
        return
      }
      const data: StorybookIndex = await res.json()
      const entries = data.entries ?? data.stories ?? {}
      if (Object.keys(entries).length === 0) {
        setFetchErr(`Connected to Storybook but found no stories. Make sure your stories are registered and the server has finished loading.`)
        return
      }

      // Group by title to get one entry per component
      const byTitle = new Map<string, string>() // title → first storyId
      for (const [id, entry] of Object.entries(entries)) {
        if (!byTitle.has(entry.title)) {
          byTitle.set(entry.title, id)
        }
      }

      const comps: DiscoveredComponent[] = [...byTitle.entries()].map(([title, storyPath]) => ({
        displayName: extractDisplayName(title),
        storyPath,
      }))

      setDiscovered(comps)
      setSelected(new Set(comps.map(c => c.displayName)))
      setStep(3)
    } catch {
      setFetchErr(`Something went wrong parsing the Storybook response. Try manual setup.`)
    } finally {
      setFetching(false)
    }
  }, [sbUrl])

  // ─── Step 3 helpers ───────────────────────────────────────────────────────

  const allSelected = discovered.length > 0 && selected.size === discovered.length
  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(discovered.map(c => c.displayName)))
  }

  const toggleOne = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const selectedComponents = discovered.filter(c => selected.has(c.displayName))

  // ─── Copy helpers ─────────────────────────────────────────────────────────

  const handleCopyConfig = async () => {
    const text = buildConfigSnippet(sbUrl, figmaKey, selectedComponents)
    try { await navigator.clipboard.writeText(text) } catch { prompt('Copy config:', text) }
    setConfigCopied(true)
    setTimeout(() => setConfigCopied(false), 2000)
  }

  const handleCopyClaude = async () => {
    const text = buildClaudeContent(selectedComponents)
    try { await navigator.clipboard.writeText(text) } catch { prompt('Copy CLAUDE.md:', text) }
    setClaudeCopied(true)
    setTimeout(() => setClaudeCopied(false), 2000)
  }

  // ─── Shared styles ────────────────────────────────────────────────────────

  const panelStyle: React.CSSProperties = {
    flex: 1, display: 'flex', flexDirection: 'column',
    fontFamily: 'system-ui, sans-serif', color: C.text,
    background: C.bg, overflow: 'hidden',
  }

  const headerStyle: React.CSSProperties = {
    padding: '14px 16px 12px',
    borderBottom: `1px solid ${C.border}`,
    flexShrink: 0,
  }

  const bodyStyle: React.CSSProperties = {
    flex: 1, overflowY: 'auto', padding: '16px',
  }

  const primaryBtn = (label: string, onClick: () => void, disabled = false): React.ReactElement => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.muted : C.blue,
        color: '#fff', border: 'none', borderRadius: 8,
        padding: '8px 18px', fontSize: 12, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'system-ui, sans-serif',
      }}
    >{label}</button>
  )

  const ghostBtn = (label: string, onClick: () => void): React.ReactElement => (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', color: C.muted,
        border: `1px solid ${C.border}`, borderRadius: 8,
        padding: '8px 18px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
      }}
    >{label}</button>
  )

  const numericStep = typeof step === 'number' ? step : 4

  const stepDot = (n: number): React.ReactElement => (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      background: numericStep >= n ? C.blue : C.border,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, color: numericStep >= n ? '#fff' : C.muted,
      transition: 'background 0.2s',
    }}>{n}</div>
  )

  // ─── Step progress bar ────────────────────────────────────────────────────

  const Progress = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 16px 10px' }}>
      {[1, 2, 3, 4].map((n, i) => (
        <React.Fragment key={n}>
          {stepDot(n)}
          {i < 3 && <div style={{ flex: 1, height: 2, background: numericStep > n ? C.blue : C.border, transition: 'background 0.2s' }} />}
        </React.Fragment>
      ))}
    </div>
  )

  // ─── Step 1 — Welcome ─────────────────────────────────────────────────────

  const Step1 = () => (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
          Let's set up Drift
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          Takes 2 minutes. We'll auto-discover your design system components.
        </div>
      </div>
      <Progress />
      <div style={{ ...bodyStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          background: C.surface, borderRadius: 10, padding: '14px',
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 6 }}>
            What Drift does
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            Scans your React app to see which components are from your design system
            and which are custom one-offs. Helps you track design coverage and catch drift.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {primaryBtn('Connect Storybook →', () => setStep(2))}
          {ghostBtn('Enter components manually →', () => setStep('manual'))}
        </div>
      </div>
    </div>
  )

  // ─── Step 2 — Storybook URL ───────────────────────────────────────────────

  const Step2 = () => (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <button
          onClick={() => setStep(1)}
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
          Back
        </button>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Connect Storybook</div>
        <div style={{ fontSize: 12, color: C.muted }}>
          Drift will fetch your story index to discover components automatically.
        </div>
      </div>
      <Progress />
      <div style={{ ...bodyStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 700,
            color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            Storybook URL
          </label>
          <input
            type="text"
            value={sbUrl}
            onChange={e => { setSbUrl(e.target.value); setFetchErr(null) }}
            onKeyDown={e => e.key === 'Enter' && handleDiscover()}
            placeholder="http://localhost:6006"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: C.surface, border: `1px solid ${fetchErr ? C.red : C.border}`,
              borderRadius: 8, padding: '9px 12px', color: C.text,
              fontSize: 13, fontFamily: 'system-ui, sans-serif',
              outline: 'none',
            }}
          />
          {fetchErr && (
            <div style={{ fontSize: 11, color: C.red, marginTop: 6, lineHeight: 1.5 }}>
              {fetchErr}
              <button onClick={() => setStep('manual')} style={{
                display: 'block', marginTop: 8, background: 'none', border: 'none',
                color: C.blue, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                padding: 0, fontFamily: 'system-ui, sans-serif', textDecoration: 'underline',
              }}>
                Enter components manually instead →
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {primaryBtn(
            fetching ? 'Discovering…' : 'Discover components',
            handleDiscover,
            fetching,
          )}
        </div>

        {fetching && (
          <div style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              border: `2px solid ${C.blue}`,
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }} />
            Fetching story index…
          </div>
        )}
      </div>
    </div>
  )

  // ─── Step 3 — Select components ───────────────────────────────────────────

  const Step3 = () => (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <button
          onClick={() => setStep(2)}
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
          Back
        </button>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
          Which of these are your design system components?
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>
          Discovered {discovered.length} component{discovered.length !== 1 ? 's' : ''} from Storybook.
        </div>
      </div>
      <Progress />

      {/* Select all / deselect all */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 16px',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: C.muted }}>
          {selected.size} of {discovered.length} selected
        </span>
        <button
          onClick={toggleAll}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: C.blue, fontFamily: 'system-ui, sans-serif',
            fontWeight: 600, padding: 0,
          }}
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {discovered.map(c => (
          <label
            key={c.displayName}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 16px', cursor: 'pointer',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(c.displayName)}
              onChange={() => toggleOne(c.displayName)}
              style={{ accentColor: C.blue, width: 14, height: 14, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{c.displayName}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{c.storyPath}</div>
            </div>
          </label>
        ))}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        {primaryBtn(
          `Continue → (${selected.size} selected)`,
          () => setStep(4),
          selected.size === 0,
        )}
      </div>
    </div>
  )

  // ─── Step 4 — Export ──────────────────────────────────────────────────────

  const configSnippet = buildConfigSnippet(sbUrl, figmaKey, selectedComponents)
  const claudeContent = buildClaudeContent(selectedComponents)

  const Step4 = () => (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
          You're all set! 🎉
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          Copy these into your project to activate Drift.
        </div>
      </div>
      <Progress />

      {/* Optional Figma key */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <label style={{
          display: 'block', fontSize: 10, fontWeight: 700,
          color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4,
        }}>
          Figma file key (optional)
        </label>
        <input
          type="text"
          value={figmaKey}
          onChange={e => setFigmaKey(e.target.value)}
          placeholder="e.g. yO7V6x2VhxuIhDyR24fQ2h"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: '7px 10px', color: C.text,
            fontSize: 12, fontFamily: 'system-ui, sans-serif', outline: 'none',
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        {(['config', 'claude'] as ExportTab[]).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              flex: 1, padding: '8px 0', background: 'none',
              border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              color: activeTab === t ? C.blue : C.muted,
              borderBottom: `2px solid ${activeTab === t ? C.blue : 'transparent'}`,
              fontFamily: 'system-ui, sans-serif',
              transition: 'color 0.15s',
            }}
          >
            {t === 'config' ? 'config.ts' : 'CLAUDE.md'}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <pre style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '12px', margin: 0,
          fontSize: 10.5, color: C.text, lineHeight: 1.6,
          fontFamily: "'Fira Code', 'Cascadia Code', 'Menlo', monospace",
          overflowX: 'auto', whiteSpace: 'pre',
          flex: 1,
        }}>
          {activeTab === 'config' ? configSnippet : claudeContent}
        </pre>

        <button
          onClick={activeTab === 'config' ? handleCopyConfig : handleCopyClaude}
          style={{
            background: (activeTab === 'config' ? configCopied : claudeCopied) ? C.green : C.blue,
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
            transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          {(activeTab === 'config' ? configCopied : claudeCopied)
            ? 'Copied!'
            : `Copy ${activeTab === 'config' ? 'config.ts' : 'CLAUDE.md'}`}
        </button>

        <div style={{
          fontSize: 10.5, color: C.muted, lineHeight: 1.5,
          padding: '8px 10px',
          background: C.surface, borderRadius: 6,
          border: `1px solid ${C.border}`,
        }}>
          These are starting points — edit <code style={{ color: C.orange }}>config.ts</code> to
          fine-tune storyPaths, then restart your dev server.
        </div>

        <button
          onClick={onDone}
          style={{
            background: 'none', border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '7px 16px',
            fontSize: 11, fontWeight: 600, color: C.muted,
            cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
          }}
        >
          Done — open Drift panel
        </button>
      </div>
    </div>
  )

  // ─── Manual entry step ───────────────────────────────────────────────────

  const [manualText, setManualText] = useState('')

  const ManualStep = () => {
    const names = manualText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    const valid = names.length > 0

    const handleConfirm = () => {
      const comps: DiscoveredComponent[] = names.map(n => ({
        displayName: n,
        storyPath: n.toLowerCase().replace(/\s+/g, '-') + '--default',
      }))
      setDiscovered(comps)
      setSelected(new Set(comps.map(c => c.displayName)))
      setStep(4)
    }

    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.muted, marginBottom: 8, fontFamily: 'system-ui, sans-serif' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Enter components manually</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            One component name per line (or comma-separated). Use exact React display names — the same names you'd see in React DevTools.
          </div>
        </div>
        <div style={{ ...bodyStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            placeholder={'Button\nModal\nNavbar\nTenantsTable\n...'}
            rows={8}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '10px 12px', color: C.text,
              fontSize: 12, fontFamily: 'monospace', lineHeight: 1.7, outline: 'none',
            }}
          />
          {valid && (
            <div style={{ fontSize: 11, color: C.muted }}>
              {names.length} component{names.length !== 1 ? 's' : ''} — storyPaths will be best-guess placeholders, edit <code style={{ color: C.orange }}>config.ts</code> to fix them.
            </div>
          )}
          {primaryBtn(`Generate config for ${valid ? names.length : '…'} components →`, handleConfirm, !valid)}
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {step === 1        && <Step1 />}
      {step === 2        && <Step2 />}
      {step === 3        && <Step3 />}
      {step === 4        && <Step4 />}
      {step === 'manual' && <ManualStep />}
    </>
  )
}
