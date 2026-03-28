# Drift

> Design system compliance for teams shipping with AI.

Drift reads the live React fiber tree, measures what percentage of your UI is built from your design system, and flags every custom component and hardcoded token — in dev, in CI, and on every PR.

---

## What problem does it solve?

AI coding tools (Cursor, Copilot, Claude) write components in seconds — but they don't know your design system. They invent one-off components, hardcode colors, and skip your spacing tokens. Sprint after sprint, your UI silently drifts from what was designed.

Drift is the guardrail. It gives every person on your team — designers, engineers, and PMs — a shared, measurable answer to: **"how much has our UI drifted from the design system?"**

---

## How it works

```
Designer → Figma → Storybook   (source of truth)
                       ↓
          Engineer vibes with Cursor / Claude
                       ↓
          Drift reads the live React fiber tree
                       ↓
          Coverage %, gaps, and token violations surfaced
                       ↓
          GitHub Action posts delta to every PR
```

---

## Repository structure

```
design-drift/
├── src/
│   ├── ds-coverage/               ← THE TOOL (drop into any React app)
│   │   ├── DSCoverageOverlay.tsx   Main panel UI (~1600 lines)
│   │   ├── fiberScanner.ts         React fiber tree walker
│   │   ├── tokenChecker.ts         Inline style / token violation detector
│   │   ├── manifest.ts             DS component registry
│   │   └── config.ts               ← Edit this to register YOUR components
│   │
│   ├── stories/                   ← Sample design system (StorageOS)
│   │   ├── Button.tsx, Input.tsx, Modal.tsx, ...
│   │   └── prototypes/             Composed screen prototypes
│   │
│   ├── landing/
│   │   └── LandingPage.tsx         Marketing site (served at /)
│   │
│   └── tokens/
│       ├── variables.css           CSS custom properties (auto-generated)
│       └── tokens.ts               Token constants (auto-generated)
│
├── scripts/
│   ├── drift-check.mjs             CI scanner — headless Playwright scan
│   └── figma-sync.mjs              Figma API → tokens pipeline
│
└── .github/workflows/
    └── drift-check.yml             PR drift delta GitHub Action
```

> **For a backend developer:** The files you need are `scripts/drift-check.mjs`, `.github/workflows/drift-check.yml`, and `src/ds-coverage/config.ts`. You do not need to touch `DSCoverageOverlay.tsx` for CI or backend work.

---

## Quick start — add Drift to your own React app

```bash
# 1. Clone (npm package coming soon)
git clone https://github.com/dyoon92/design-drift

# 2. Copy src/ds-coverage/ into your project

# 3. Add to your app entry point (dev only)
```

```tsx
// main.tsx or App.tsx
import { DSCoverageOverlay } from './ds-coverage/DSCoverageOverlay'

function App() {
  return (
    <>
      <YourApp />
      {import.meta.env.DEV && <DSCoverageOverlay />}
    </>
  )
}
```

```bash
# 4. Register your components in src/ds-coverage/config.ts
# 5. Press D in the browser to open the Drift panel
```

---

## Configuration

Edit `src/ds-coverage/config.ts` to register your design system components:

```ts
const config: DesignDriftConfig = {
  storybookUrl: 'http://localhost:6006',
  figmaFileKey:  'your-figma-file-key',
  threshold:     80,   // minimum DS coverage % to pass CI

  components: {
    Button:  { storyPath: 'primitives-button--primary' },
    Modal:   { storyPath: 'primitives-modal--default' },
    Navbar:  { storyPath: 'shell-navbar--default' },
    // ... one entry per component in your design system
  },
}
```

Each key must exactly match the React component's display name (visible in React DevTools).

---

## Running locally

```bash
npm run storybook      # Component catalog → http://localhost:6006
npm run dev            # Demo app → http://localhost:5173
npm run build          # Production build
npm run drift-check    # Run the CI scanner locally (requires a running app)
npm run figma-sync     # Pull design tokens from Figma
npm run chromatic      # Publish Storybook to Chromatic
```

---

## CI — PR Drift Delta

The GitHub Action at `.github/workflows/drift-check.yml`:

1. Builds the app and starts a preview server
2. Runs the headless Playwright scanner across configured routes
3. Compares coverage against the last main-branch baseline
4. Posts a formatted drift delta as a PR comment — updates on new commits, no spam
5. Optionally fails CI if coverage drops below threshold

**Repository variables** (Settings → Variables → Actions):

| Variable | Default | Description |
|---|---|---|
| `DRIFT_THRESHOLD` | `80` | Minimum DS coverage % to pass |
| `DRIFT_ROUTES` | `/` | Comma-separated routes, e.g. `/,/dashboard,/tenants` |
| `DRIFT_MAX_DROP` | *(unset)* | Block PRs that drop coverage by more than this %. Set `0` for ratchet mode (coverage can never decrease). |
| `DRIFT_STRICT` | `false` | Fail CI on any gap or token violation, regardless of % |

No secrets needed — uses the built-in `GITHUB_TOKEN`.

**Example PR comment:**

```
📊 Drift Delta   81% → 74%  ⚠ −7% since main

Route: /dashboard — 🔴 74% DS coverage
  DS components     10
  Custom (drifted)   3
  Token violations  19

  Custom components:
  • CustomCard ×3  (consider promoting to DS)
  • InlineAlert ×1
```

---

## Token sync (Figma → code)

```bash
FIGMA_TOKEN=your_token npm run figma-sync
```

Reads your Figma file (key in `config.ts`) and writes:
- `src/tokens/variables.css` — CSS custom properties (`--ds-color-*`, `--ds-spacing-*`)
- `src/tokens/tokens.ts` — TypeScript constants

**Never edit these files by hand** — they are overwritten on every sync.

---

## Tech stack

| | |
|---|---|
| UI framework | React 19 |
| Build tool | Vite 8 |
| Language | TypeScript 5.9 |
| Component catalog | Storybook 10 |
| CI scanner | Playwright (Chromium, headless) |
| Token pipeline | Style Dictionary 5 |
| AI features | Anthropic claude-haiku-4-5 |
| Styles | Inline styles + CSS custom properties only. No CSS files, no Tailwind. |

---

## Key architectural decisions

**Why read the React fiber tree instead of the AST?**
Static analysis only sees source. The fiber tree shows what is *actually rendered on screen* — including lazy-loaded components, feature-flagged UI, and runtime-composed layouts. It is the only approach that catches drift in AI-generated code after it runs.

**Why inline styles only?**
Design system tokens (`var(--ds-color-*)`, `var(--ds-spacing-*)`) must be the only styling source. CSS modules and utility classes create a styling layer that is invisible to the token checker. Inline styles make every violation detectable.

**Why an overlay instead of a browser extension?**
Extensions require store review and cannot reliably access React internals on arbitrary domains. The overlay ships in minutes, works everywhere React runs, and is stripped completely in production builds.

---

## Maintenance (for backend developers)

| Component | Risk | Notes |
|---|---|---|
| GitHub Actions YAML | Very low | Actions API stable for years |
| Playwright / Chromium | Low | `npm update` quarterly |
| React fiber key (`__reactFiber$`) | Low | Unchanged since React 16; would only break on a major React version change |
| Token checker (inline style scan) | None | CSS property names don't change |

---

## Roadmap

- [ ] `npm install @drift/overlay` — standalone npm package
- [ ] VS Code extension — real-time token violation underlines as you type
- [ ] Pre-commit hook (`npx drift check`) via Husky
- [ ] Coverage history dashboard (requires backend + DB)
- [ ] GitHub App with OAuth (Team tier subscriptions)
- [ ] Multi-framework support (Vue, Svelte)

---

## Contributing

1. Fork and clone
2. `npm install`
3. `npm run dev` — demo app on :5173
4. `npm run storybook` — component catalog on :6006
5. Make changes, verify with `npm run build`
6. Open a PR — the drift check runs automatically

The landing page (`src/landing/`) and the tool (`src/ds-coverage/`) are co-located for convenience. When Drift ships as an npm package the tool will move to its own repository.
