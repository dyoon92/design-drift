---
description: "First-run wizard: installs Drift into any React project, discovers DS components from Storybook, generates AI rules files, adds GitHub Action CI, and measures baseline coverage."
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
argument-hint: "[--check | --multi-team | <path-to-project>]"
disable-model-invocation: true
---

# /drift-setup — First-run Drift installation wizard

Set up Drift in this project from scratch. Detect what already exists, ask targeted
questions, then do all the work — no manual steps.

Works with any React product team — SaaS, property management, fintech, consumer, B2B.
Supports Vite, Next.js, CRA, Remix, and any custom React + Storybook setup.

## Arguments: `$ARGUMENTS`
- *(no args)* — full interactive setup inside the current project
- `--check`   — audit existing setup, report what's missing without changing anything
- `--multi-team` — configure for shared DS across multiple product teams (npm package model)
- `<path>`    — bootstrap Drift into another project, e.g. `/drift-setup ~/projects/my-app`

---

## Step 0 — Bootstrap into another project (if a path was given)

If `$ARGUMENTS` is a file path (starts with `/`, `./`, or `~`, or looks like a directory name):

1. Treat it as `TARGET_DIR`. Resolve `~` if needed.
2. Verify `TARGET_DIR` exists and has a `package.json`. If not, stop:
   ```
   No package.json found at <path>. Is this a React project?
   ```
3. Copy the Drift source files from this repo into the target:
   ```bash
   cp -r src/ds-coverage/     {TARGET_DIR}/src/ds-coverage/
   cp -r .claude/             {TARGET_DIR}/.claude/
   mkdir -p {TARGET_DIR}/scripts
   cp scripts/drift-check.mjs  {TARGET_DIR}/scripts/
   cp scripts/drift-mcp.mjs    {TARGET_DIR}/scripts/
   cp scripts/figma-sync.mjs   {TARGET_DIR}/scripts/
   ```
4. Check if `@modelcontextprotocol/sdk` is in `{TARGET_DIR}/package.json` devDependencies.
   If not: `cd {TARGET_DIR} && npm install --save-dev @modelcontextprotocol/sdk`

5. Report what was installed:
   ```
   ## Drift files copied to <TARGET_DIR>

   ✅  src/ds-coverage/    — overlay + fiber scanner + token checker
   ✅  .claude/commands/   — /drift, /drift-sync, /drift-push, /drift-prd, /drift-scaffold
   ✅  scripts/            — drift-check, drift-mcp, figma-sync
   ✅  @modelcontextprotocol/sdk installed

   Now continuing setup inside <TARGET_DIR>…
   ```

6. Continue the rest of this setup (Steps 1–10) as if running inside `TARGET_DIR`.
   All file reads/writes from this point forward target `TARGET_DIR`.

If no path argument: assume already running inside the target project and go straight to Step 1.

---

## Step 1 — Detect existing setup

Read these files if they exist and note what's already configured:
- `src/ds-coverage/config.ts` or `drift.config.ts`
- `package.json` — detect framework (Next.js, Vite, CRA, Remix), Storybook version, existing eslint plugins
- `.storybook/main.ts` or `.storybook/main.js`
- `.github/workflows/` — any existing drift workflow
- `CLAUDE.md`, `.cursorrules`, `.windsurfrules` — AI rules files
- `~/.claude.json` or `.claude/settings.json` — MCP servers

Print a brief audit:
```
## Drift setup audit

Framework:       [Next.js 14 / Vite 5 / CRA / Remix / unknown]
Storybook:       ✅ v8.x at http://localhost:6006  /  ❌ not detected
drift.config:    ✅ (37 components) / ❌ missing
CLAUDE.md:       ✅ / ⚠️ stale (last updated: <date>) / ❌ missing
.cursorrules:    ✅ / ❌ missing
.windsurfrules:  ✅ / ❌ missing
GitHub Action:   ✅ drift-check.yml / ❌ missing
MCP server:      ✅ registered / ❌ missing
ESLint plugin:   ✅ drift rules installed / ❌ not installed (optional)
Code Connect:    ✅ / ❌ not configured (optional — improves Figma Dev Mode)
```

If `--check` was passed, stop here and explain what each missing item would add.

---

## Step 2 — Gather configuration (ask all at once, don't ping-pong)

Ask these questions in a single message. Tell the user to answer what they know
and skip anything they don't have yet:

```
To set up Drift I need a few details. Answer what you have — skip anything you don't:

1. **Storybook URL (local)**
   Default: http://localhost:6006 — press enter to accept

2. **Deployed Storybook URL** (Chromatic, Netlify, Vercel, etc.)
   e.g. https://main--abc123.chromatic.com
   Skip if not deployed yet.

3. **Figma file key**
   Found in your Figma URL: figma.com/design/THIS_PART/your-file
   Skip if no Figma file yet.

4. **Figma MCP connected?** (yes/no)
   Enables AI to read/write Figma directly. Required for /drift-push automation.

5. **Jira base URL + project key** (optional)
   e.g. https://yourcompany.atlassian.net  project key: DS
   Used by /drift promote to create Jira tickets for DS gap requests.

6. **Coverage threshold** (default: 80)
   CI fails if DS coverage drops below this %.
   Recommended: start at your current baseline (we'll measure it), then raise quarterly.

7. **Multi-team setup?** (yes/no)
   If yes: are you the DS team setting up the source, or a product team consuming the DS?
   (See --multi-team flag for full multi-team workflow.)

8. **AI tools in use** (check all that apply)
   - Claude Code (CLAUDE.md)
   - Cursor (.cursorrules)
   - Windsurf (.windsurfrules)
   - Other: ___
```

---

## Step 3 — Locate the overlay source

Check where the overlay lives:

**Option A — This is the design-drift source repo** (or the user copied `src/ds-coverage/` into their project):
- `src/ds-coverage/` exists with `DSCoverageOverlay.tsx`, `config.ts`, etc.
- No install needed. Note: "Overlay source found at `src/ds-coverage/`."

**Option B — Installing from npm** (once the package is published):
```bash
npm install --save-dev design-drift
```
Then imports use `from 'design-drift'` instead of `from './ds-coverage/DSCoverageOverlay'`.

If neither exists:
```
The overlay source wasn't found in this project.
Clone the design-drift repo or copy src/ds-coverage/ into your project first.
  git clone https://github.com/dyoon92/design-drift
```

---

## Step 4 — Discover DS components from Storybook

Try to fetch `{storybookUrl}/index.json`. If it succeeds:
- Parse the story index to get all component names and story paths
- Group by category (primitives, navigation, patterns, etc.)
- Present a grouped list and ask:
  ```
  Found N components in Storybook. Which are your official DS components?

  Primitives (8): Button, Input, Badge, Modal, Toast, Dropdown, Tabs, Icon
  Navigation (3): Navbar, Sidebar, Breadcrumb
  Patterns (6): TenantsTable, UnitDetailsCard, PaymentBanner, ...
  Other (12): ...

  Options:
  - "all" — treat everything in Storybook as DS
  - "primitives, navigation" — only those categories
  - Comma-separated names: "Button, Input, Badge, Modal"
  ```
- Default to all discovered components if no response.

If Storybook isn't running or reachable:
- Ask the user to list their DS component names (comma or newline separated)
- Generate placeholder storyPaths they can fill in later via `/drift-sync`

---

## Step 5 — Create or update drift.config.ts

Write `drift.config.ts` at the project root (or `src/ds-coverage/config.ts` if
that's where the existing one is):

```typescript
import type { DesignDriftConfig } from './src/ds-coverage/types' // or 'design-drift'

const config: DesignDriftConfig = {
  storybookUrl: '<local-storybook-url>',
  // chromaticUrl: '<deployed-url>',    // uncomment when deployed
  figmaFileKey: '<figma-file-key>',     // omit if not provided
  // jiraBaseUrl: '<jira-url>',         // uncomment if using Jira
  // jiraProjectKey: '<key>',           // uncomment if using Jira
  threshold: <threshold>,
  components: {
    // <ComponentName>: { storyPath: '<story-id>' },
    // ...all discovered components...
  },
  // approvedGaps: {},  // components approved as intentional exceptions
}

export default config
```

---

## Step 6 — Add overlay to app entry point

Detect the framework automatically:

**Vite / CRA (`src/main.tsx` or `src/index.tsx`):**
```tsx
// Add near the top — dev-only guard
if (import.meta.env.DEV) {
  const { DSCoverageOverlay } = await import('./ds-coverage/DSCoverageOverlay')
  // mounted as last child in root render
}

// Inside root render, as the last child:
{import.meta.env.DEV && <DSCoverageOverlay />}
```

**Next.js (`pages/_app.tsx` or `app/layout.tsx`):**
```tsx
{process.env.NODE_ENV === 'development' && <DSCoverageOverlay />}
```

**Remix (`app/root.tsx`):**
```tsx
{process.env.NODE_ENV === 'development' && <DSCoverageOverlay />}
```

The overlay is always dev-only. It tree-shakes completely from production builds.

---

## Step 7 — Generate AI rules files

Create or update rules files for every AI tool the user selected.
All files get the same component table + constraints. Use these markers to delineate
the auto-generated section so future `/drift-sync` runs only regenerate this part:

```markdown
<!-- drift:components-start -->
| Component | Story | Figma |
|-----------|-------|-------|
| Button    | ✅    | ✅    |
...
<!-- drift:components-end -->
```

### CLAUDE.md

```markdown
# Design System Rules

## Source of truth
- Figma: https://figma.com/design/<figmaFileKey>
- Storybook: <storybookUrl>
- Tokens: src/tokens/variables.css — use CSS variables only (var(--ds-color-*), var(--ds-spacing-*))

## The #1 rule: never invent UI from scratch
If a component doesn't exist in the table below, output:
⚠️  Missing component: [ComponentName]
This needs to be designed in Figma first. Use <Placeholder> in the meantime.
File a design request: run /drift-push request [ComponentName] "[description]"

## Approved exceptions
To use a non-DS component intentionally, add this inline comment:
  {/* drift:ignore reason="<why no DS component covers this>" */}
Exceptions are tracked in drift.config.ts approvedGaps and reported separately — they
do not count against coverage.

<!-- drift:components-start -->
## Available DS components
| Component | Story | Figma |
|-----------|-------|-------|
...
<!-- drift:components-end -->

## Style rules
- Colors: var(--ds-color-*) — never hardcode hex
- Spacing: var(--ds-spacing-*) — never hardcode px
- No CSS files — inline styles only
- Font: Inter, system-ui, sans-serif

## Drift commands
- /drift           — analyze coverage + suggest fixes
- /drift-sync      — re-pull components from Figma/Storybook
- /drift-push      — push implemented components back to Figma
- /drift-prd       — generate a component inventory for a PRD/spec
- /drift-scaffold  — scaffold a new screen using only DS components
- /drift fix <X>   — migrate custom component X to its DS equivalent
- /drift approve <X> "<reason>" — approve a gap with documented rationale
```

Also create `.cursorrules` and `.windsurfrules` with the same content if those tools are in use.

---

## Step 8 — Add GitHub Actions workflow

Create `.github/workflows/drift-check.yml` if it doesn't exist.

Key configuration decisions to set correctly:
- `DRIFT_THRESHOLD`: set to current measured baseline (not a fixed 80 — let teams ramp up)
- `DRIFT_MAX_DROP`: start at `5` (allows 5% drop); suggest moving to `0` after 2 sprints of stability
- `DRIFT_STRICT`: `false` by default; only set `true` for new greenfield projects

```yaml
name: Drift Check
on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]

env:
  DRIFT_THRESHOLD: 80       # CI fails if coverage drops below this
  DRIFT_MAX_DROP: 5         # Max allowed regression per PR (set to 0 for ratchet mode)
  DRIFT_STRICT: false       # Set true to fail on any non-DS component
  DRIFT_ROUTES: /           # Comma-separated routes to scan

jobs:
  drift:
    name: Design Drift Analysis
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install chromium --with-deps
      - name: Restore drift baseline
        uses: actions/cache/restore@v4
        with:
          path: drift-baseline.json
          key: drift-baseline-${{ github.base_ref || github.ref_name }}
      - run: npm run build
      - run: npx vite preview --port 4173 &
      - run: npx wait-on http://localhost:4173 --timeout 30000
      - name: Run drift check
        run: |
          node scripts/drift-check.mjs \
            --url http://localhost:4173 \
            --threshold ${{ env.DRIFT_THRESHOLD }} \
            --routes "${{ env.DRIFT_ROUTES }}" \
            --json > drift-report.json
        continue-on-error: true
      - name: Post PR comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const report = JSON.parse(require('fs').readFileSync('drift-report.json', 'utf8'))
            // full comment script in .github/workflows/drift-check.yml
      - name: Save baseline
        if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
        uses: actions/cache/save@v4
        with:
          path: drift-report.json
          key: drift-baseline-${{ github.ref_name }}-${{ github.run_id }}
      - uses: actions/upload-artifact@v4
        with:
          name: drift-report
          path: drift-report.json
          retention-days: 90
```

If a workflow already exists, diff the existing one and only update threshold/env vars.

**Multi-team note**: If `--multi-team` was requested and this is a product team (consumer) repo:
- Set `DRIFT_THRESHOLD` to the org-wide minimum published by the DS team
- Add a step to fetch the org's `drift-config.json` from a remote URL if the team uses remote config

---

## Step 9 — Register MCP server

Add the Drift MCP server to Claude Code settings. Check if `~/.claude.json` exists:

```json
{
  "mcpServers": {
    "drift": {
      "command": "node",
      "args": ["scripts/drift-mcp.mjs"],
      "cwd": "<absolute path to this project>"
    }
  }
}
```

Use `pwd` to get the absolute path. If `~/.claude.json` already has mcpServers,
merge — don't overwrite existing entries.

If the user also has Figma MCP, show how to add it alongside:
```json
"figma": {
  "command": "npx",
  "args": ["-y", "figma-developer-mcp", "--stdio"],
  "env": { "FIGMA_ACCESS_TOKEN": "<token>" }
}
```

---

## Step 10 — Measure baseline coverage

Before finishing, measure the current state so the team has a starting point:

```bash
npm run build && npx vite preview --port 4173 &
npx wait-on http://localhost:4173
node scripts/drift-check.mjs --url http://localhost:4173 --json > drift-baseline.json
```

Parse and report:
```
## Baseline coverage measured

Current DS coverage: XX%
Custom components found: N
Token violations: N

Recommended threshold setting: XX% (your current baseline, rounded down to nearest 5)
Suggested ramp: raise threshold by 5% each quarter as gaps are resolved.
```

If coverage is below 40%, flag it prominently:
```
⚠️  Low baseline (XX%) — this is common for repos where the DS hasn't been enforced yet.
Start with threshold: <baseline - 5> to avoid immediate CI failures.
Use /drift audit to see the highest-impact gaps to fix first.
```

---

## Step 11 — Final summary

Print:
```
## ✅ Drift is set up

Files created/updated:
  drift.config.ts          — <N> DS components registered
  CLAUDE.md                — AI coding rules with DS constraints
  .cursorrules             — Cursor rules (if selected)
  .windsurfrules           — Windsurf rules (if selected)
  .github/workflows/drift-check.yml — CI drift check on every PR
  ~/.claude.json           — MCP server registered

Baseline coverage: XX% (threshold set to XX%)

Next steps:
  1. npm run dev           — open your app, press D to see Drift overlay
  2. npm run storybook     — verify Storybook component links work
  3. npm run figma-sync    — pull latest design tokens (needs FIGMA_API_TOKEN)
  4. git push              — first PR will show a drift delta comment

When you add a new DS component:
  1. Build it in src/stories/[Name].tsx
  2. Add to drift.config.ts
  3. Run /drift-sync to update all AI rules files automatically

When a PdM or designer wants to prototype:
  1. Run /drift-prd to generate a component inventory for their spec
  2. Run /drift-scaffold to generate a starter page using only DS components
  3. Run /drift check before submitting the PR to see coverage
```

---

## Multi-team mode (`--multi-team`)

If `--multi-team` was passed, ask an additional question:

```
Multi-team setup — which role are you?

  A. DS Team (source): You maintain the component library that product teams consume.
  B. Product Team (consumer): You build features using the DS team's components.
```

### DS Team setup
- Generate an additional `drift-org-config.json` file that can be hosted at a static URL
- This file contains the org's component registry, threshold, and token reference — product teams fetch it
- Add a GitHub Action step to publish `drift-org-config.json` to GitHub Pages or a CDN on every DS release
- Recommend Renovate or Dependabot for automated DS version upgrade PRs in product repos

### Product Team setup
- Add a config fetch step: `remoteConfigUrl: 'https://ds.yourorg.com/drift-config.json'`
- The overlay and CI tool merge remote config (DS components) with local config (app-specific approvals)
- Local `drift.config.ts` only needs `approvedGaps` and local threshold overrides — all component definitions come from the remote URL
- This is the pattern used by Salesforce Lightning and Microsoft Fluent for multi-product DS governance
