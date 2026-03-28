# /drift-setup — First-run Drift installation wizard

Set up Drift in this project from scratch. Detect what already exists, ask targeted
questions, then do all the work — no manual steps.

## Arguments: `$ARGUMENTS`
- *(no args)* — full interactive setup inside the current project
- `--check` — audit existing setup, report what's missing without changing anything
- `<path>` — bootstrap Drift into another project, e.g. `/drift-setup ~/projects/my-app`

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

   ✅  src/ds-coverage/    — overlay + fiber scanner
   ✅  .claude/commands/   — /drift, /drift-sync, /drift-push slash commands
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
- `package.json` (check for storybook, chromatic, vite, next, react scripts)
- `.storybook/main.ts` or `.storybook/main.js`
- `.github/workflows/` (any drift workflow)
- `CLAUDE.md` or `.cursorrules`
- `~/.claude.json` or `.claude/settings.json` (MCP servers)

Print a brief audit:
```
## Drift setup audit

✅ Already configured    ❌ Missing    ⚠️  Needs update

Framework:     [detected framework]
Storybook:     ✅/❌ [url if found]
drift.config:  ✅/❌
CLAUDE.md:     ✅/❌
GitHub Action: ✅/❌
MCP server:    ✅/❌
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
   Enables AI to read/write Figma directly during vibe coding.

5. **Jira base URL + project key** (optional)
   e.g. https://yourcompany.atlassian.net  project key: DS
   Skip if you don't use Jira.

6. **Coverage threshold** (default: 80)
   CI fails if DS coverage drops below this %.
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

If neither exists, say:
```
The overlay source wasn't found in this project.
Clone the design-drift repo or copy src/ds-coverage/ into your project first.
  git clone https://github.com/dyoon92/design-drift
```

---

## Step 4 — Discover DS components from Storybook

Try to fetch `{storybookUrl}/index.json`. If it succeeds:
- Parse the story index to get all component names and story paths
- Present a grouped list and ask: "Which of these are your official DS components?
  (Everything in Storybook, or just a subset?)"
- Default to all discovered components

If Storybook isn't running or reachable:
- Ask the user to list their DS component names (comma or newline separated)
- Generate placeholder storyPaths they can fill in later

---

## Step 5 — Create or update drift.config.ts

Write `drift.config.ts` at the project root (or `src/ds-coverage/config.ts` if
that's where the existing one is):

```typescript
import type { DesignDriftConfig } from 'design-drift' // or './types'

const config: DesignDriftConfig = {
  storybookUrl: '<local-storybook-url>',
  // chromaticUrl: '<deployed-url>',   // uncomment when deployed
  figmaFileKey: '<figma-file-key>',    // omit line if not provided
  // jiraBaseUrl: '<jira-url>',        // uncomment if using Jira
  // jiraProjectKey: '<key>',          // uncomment if using Jira
  threshold: <threshold>,
  components: {
    // <ComponentName>: { storyPath: '<story-id>' },
    // ...all discovered components...
  },
}

export default config
```

---

## Step 6 — Add overlay to app entry point

Find the app entry file (`src/main.tsx`, `src/App.tsx`, `pages/_app.tsx`, etc.).
Add the overlay import wrapped in a dev-only guard:

```tsx
// Add near the top
const DSCoverageOverlay = import.meta.env.DEV
  ? (await import('design-drift')).DSCoverageOverlay  // or from './ds-coverage/DSCoverageOverlay'
  : null

// Add inside the root render, last child of the outermost element:
{import.meta.env.DEV && <DSCoverageOverlay />}
```

For Next.js use `process.env.NODE_ENV === 'development'` instead of `import.meta.env.DEV`.

---

## Step 7 — Generate CLAUDE.md

Create or update `CLAUDE.md` at the project root with:

```markdown
# Design System Rules

## Source of truth
- Figma: https://figma.com/design/<figmaFileKey> — components designed here first
- Storybook: <storybookUrl> — all approved DS components documented here
- Tokens: src/tokens/variables.css — use CSS variables only

## The #1 rule: never invent UI from scratch
If a component doesn't exist below, output:
⚠️  Missing component: [ComponentName]
File a design request. Use <Placeholder> in the meantime.

## Available DS components
| Component | Story |
|-----------|-------|
| <name>    | <storyPath> |
...

## Style rules
- Colors: var(--ds-color-*) — never hardcode hex
- Spacing: var(--ds-spacing-*) — never hardcode px
- No CSS files — inline styles only
- Font: Inter, system-ui, sans-serif

[IF FIGMA MCP:]
## Figma MCP
Figma MCP is connected. You can:
- Read component specs: reference file key <figmaFileKey>
- Create Figma frames for new components via MCP tools
- After implementation, use /drift-push to attach screenshots to Figma nodes
[END IF]

## Drift commands
- /drift          — analyze coverage + suggest fixes
- /drift-sync     — re-pull components from Figma/Storybook
- /drift-push     — push implemented components back to Figma
- /drift fix <X>  — migrate custom component X to its DS equivalent
```

Also create `.cursorrules` with the same content (Cursor reads this automatically).

---

## Step 8 — Add GitHub Actions workflow

Create `.github/workflows/drift-check.yml` if it doesn't exist:

```yaml
name: Drift Check
on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]

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
      - run: npm run build
      - run: npx vite preview --port 4173 &
      - run: npx wait-on http://localhost:4173 --timeout 30000
      - name: Run drift check
        run: |
          node scripts/drift-check.mjs \
            --url http://localhost:4173 \
            --threshold 80 \
            --json > drift-report.json || true
      - name: Post PR comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const report = JSON.parse(require('fs').readFileSync('drift-report.json', 'utf8'))
            // ... (full script in .github/workflows/drift-check.yml)
```

If a workflow already exists, diff the existing one and only update the threshold.

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

---

## Step 10 — Final summary

Print:
```
## ✅ Drift is set up

Files created/updated:
  drift.config.ts          — <N> DS components registered
  CLAUDE.md                — AI coding rules with DS constraints
  .cursorrules             — same rules for Cursor
  .github/workflows/drift-check.yml
  ~/.claude.json           — MCP server registered

Next steps:
  1. npm run dev           — open your app, press D to see Drift
  2. npm run storybook     — verify Storybook links work
  3. npm run figma-sync    — pull latest tokens from Figma (needs FIGMA_API_TOKEN)
  4. git push              — first PR will show a drift delta comment

When you add a new DS component:
  1. Build it in src/stories/[Name].tsx
  2. Add to drift.config.ts
  3. Run /drift-sync to update CLAUDE.md automatically
```
