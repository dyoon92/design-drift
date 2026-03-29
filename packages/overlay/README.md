# @catchdrift/overlay

> Drop-in design system coverage overlay for React apps. Press **D** to see drift.

Drift reads your live React component tree, compares every rendered component against your design system registry, flags token violations (hardcoded colors, spacing, radii, font sizes), and gives your page a real coverage score — all without touching your source code.

---

## Install

```bash
npm install @catchdrift/overlay
```

## Setup

```tsx
// src/main.tsx (or wherever your app mounts)
import { DriftOverlay } from '@catchdrift/overlay'

function App() {
  return (
    <>
      <YourApp />

      {/* Dev-only — tree-shaken in production builds */}
      {import.meta.env.DEV && (
        <DriftOverlay
          config={{
            storybookUrl: 'https://your-storybook.chromatic.com',
            figmaFileKey: 'your-figma-file-key',
            threshold: 80,
            components: {
              // Register every component in your design system
              Button:   { storyPath: 'primitives-button--primary' },
              Input:    { storyPath: 'primitives-input--default' },
              Modal:    { storyPath: 'primitives-modal--default' },
              Navbar:   { storyPath: 'shell-navbar--default' },
              // ...
            }
          }}
        />
      )}
    </>
  )
}
```

Press **D** in the browser to open the overlay.

---

## Config reference

| Option | Type | Description |
|---|---|---|
| `components` | `Record<string, DriftComponentEntry>` | **Required.** Your DS component registry. |
| `storybookUrl` | `string` | Storybook base URL. Default: `http://localhost:6006` |
| `chromaticUrl` | `string` | Deployed Storybook URL for public links (Chromatic, Netlify, etc.) |
| `figmaFileKey` | `string` | Figma file key — enables "Open in Figma" links. |
| `jiraBaseUrl` | `string` | Jira instance URL for one-click ticket creation. |
| `jiraProjectKey` | `string` | Jira project key to pre-fill new tickets. |
| `threshold` | `number` | Coverage threshold for CI (0–100). Default: `80` |

### Component entry

```ts
{
  storyPath?: string  // e.g. 'primitives-button--primary'  → powers "Open in Storybook" links
  figmaLink?: string  // e.g. 'https://figma.com/design/KEY?node-id=1:2'
}
```

---

## What it detects

- **Component gaps** — components rendered on screen that aren't in your registry
- **Token violations** — hardcoded colors, border-radius, spacing, font-size, font-weight that should be CSS variables
- **Style overrides** — DS components using inline styles instead of tokens

## What the overlay shows

- Live DS coverage score per page (%)
- Color-coded borders on every component (green = DS, red = gap, orange = drifted, grey = approved)
- Inspect any component — see props, token violations, fix prompts
- One-click "Fix this" — copies an AI prompt to clipboard for Claude Code or Cursor
- Promote gaps — generates a structured Cursor/Claude prompt to build the missing component
- Coverage history — tracks your score per page across the session

---

## CI integration

Use the companion CLI for headless scanning on every PR:

```bash
npx @catchdrift/cli check --url http://localhost:5173 --threshold 80
```

See [catchdrift.ai](https://catchdrift.ai) for the full GitHub Action setup.

---

## License

MIT — [catchdrift.ai](https://catchdrift.ai)
