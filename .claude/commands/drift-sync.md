---
description: "Sync Figma and/or Storybook into drift.config.ts and regenerate CLAUDE.md, .cursorrules, and .windsurfrules. Run after adding new DS components or updating Figma."
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
argument-hint: "[figma | storybook | tokens | status | --dry-run]"
disable-model-invocation: true
---

# /drift-sync — Sync Figma + Storybook → update manifest

Pull the latest component state from Figma and/or Storybook and keep
`drift.config.ts`, `CLAUDE.md`, `.cursorrules`, and `.windsurfrules` in sync.
Works with any product team — property management, SaaS, fintech, consumer, B2B.

## Arguments: `$ARGUMENTS`
- *(no args)* — sync from both Storybook and Figma, update all config files
- `figma`     — pull component list from Figma only (all pages)
- `storybook` — re-discover components from Storybook index only
- `tokens`    — run figma-sync (design tokens + icons only, no component changes)
- `status`    — report sync status without making changes (safe read-only audit)
- `--dry-run` — show what would change without writing any files

---

## Step 1 — Read current state

Read `drift.config.ts` (or `src/ds-coverage/config.ts`) to get:
- `figmaFileKey`
- `storybookUrl`
- `figmaWIPPages` — array of page names the team designated as staging/draft during `npx catchdrift init` (e.g. `['🚧 In Progress', 'Sandbox']`). Components on any of these pages are treated as drafts. If not set, fall back to matching any page whose name contains "wip", "in progress", "draft", "proposal", or "archive" (case-insensitive).
- `components` — the current registry (component name → storyPath / figmaLink)
- `threshold`
- Any `approvedGaps` entries

---

## Step 2 — Dispatch

### `status` → Read-only audit

Report sync status across all sources without changing anything:

```
## Drift Sync Status — <date>

Storybook: <storybookUrl>
  Last successful sync: <date if known, else "unknown">
  Reachable: ✅ / ❌

Figma: figma.com/design/<figmaFileKey>
  FIGMA_API_TOKEN: ✅ set / ❌ missing
  Reachable: ✅ / ❌

Config: drift.config.ts
  Components registered: N
  Missing storyPath: N
  Missing figmaLink: N
  Approved gaps: N

AI rules files:
  CLAUDE.md: ✅ / ❌ (stale — last component: <X>)
  .cursorrules: ✅ / ❌
  .windsurfrules: ✅ / ❌
```

---

### `tokens` or no args → sync tokens from Figma

Run:
```bash
npm run figma-sync
```

Requires `FIGMA_API_TOKEN`. If missing:
```
export FIGMA_API_TOKEN=your-token
npm run figma-sync

Get token: figma.com → Profile → Settings → Security → Personal access tokens
```

After running, report which token categories updated (colors added/changed, typography changes, spacing changes).

---

### `storybook` or no args → re-discover from Storybook

Fetch `{storybookUrl}/index.json`. The response has a flat map of all stories
across all story files. Parse it to get unique component names and story paths.

If Storybook isn't reachable, try the deployed URL (`chromaticUrl`) from config. If
neither is reachable, report:
```
⚠️  Storybook not reachable at <url>
Run `npm run storybook` first, or provide your deployed Storybook URL in drift.config.ts:
  chromaticUrl: 'https://main--abc123.chromatic.com'
```

Compare against `config.components` and report:

```
## Storybook sync

New (in Storybook, not in config):
  + DataTable    → story: data-table--default
  + FilterBar    → story: filters-filter-bar--default

Removed (in config, no matching story):
  - OldWidget

Unchanged: 34 components
```

Ask for each new/removed component before changing config. For removed components,
ask whether to delete from config or keep with a `deprecated: true` flag.

---

### `figma` or no args → pull all published components from Figma

**Key:** Figma components live on different pages. Use the dedicated
`/components` endpoint — it returns ALL published components across ALL pages
with page metadata included. Do NOT try to walk the file tree page by page.

Make this API call:
```
GET https://api.figma.com/v1/files/{figmaFileKey}/components
Headers: X-Figma-Token: {FIGMA_API_TOKEN}
```

Each component in the response has:
- `name` — full path e.g. `"Button/Primary/Default"` or `"Forms/Input/Filled"`
- `node_id` — unique ID for building the figmaLink URL
- `containing_frame.name` — the frame it lives in
- `containing_frame.pageName` — **the Figma page it's on**
- `description` — designer's notes (preserve this — use as component description in config)

Group and display results by page:
```
## Figma components found (across all pages)

📄 Primitives (12 components)
  ✅ Button         → in config
  ✅ Input          → in config
  ❌ Toggle         → NOT in config  (node: 123:456)
  ❌ Checkbox       → NOT in config  (node: 123:789)

📄 Navigation (4 components)
  ✅ Navbar         → in config
  ✅ Sidebar        → in config

📄 Patterns (8 components)
  ✅ TenantsTable   → in config
  ❌ DataGrid       → NOT in config  (node: 456:123)

📄 🚧 In Progress (3 components)
  ⚠️  SearchBar     → not in config (may not be ready)
  ⚠️  FilterChip    → not in config (may not be ready)
```

For components whose page name matches any entry in `figmaWIPPages` (or the fallback heuristic if not set):
- Flag them as drafts — do NOT add to config automatically
- Show them in a separate "Drafts — not ready" section so the team can monitor progress
- Include the page name next to each so it's clear why they were skipped

For each component NOT in config (excluding draft pages), ask:
```
Add these to drift.config.ts?
  - Toggle   (Primitives page)
  - Checkbox (Primitives page)
  - DataGrid (Patterns page)

For each, I'll also add the figmaLink pointing to that node.
Reply with which ones to add, or "all" / "none".
```

When adding, build the figmaLink URL:
```
https://www.figma.com/design/{figmaFileKey}?node-id={node_id}
```

Also report components in the codebase (from static scan of `src/`) that exist
in Storybook but have NO matching Figma component — these are code-first gaps:
```
In code but not in Figma (consider pushing to Figma):
  ⚡ OccupancyWidget  — used 1× — run /drift-push OccupancyWidget to add
  ⚡ FMKPIRow         — used 1×
```

---

## Step 3 — Update files

After confirmation (or immediately if `--dry-run` was NOT passed), update:

1. **`drift.config.ts`** — add components with storyPath + figmaLink where available; mark removed with `deprecated: true` rather than deleting (preserves history)
2. **`CLAUDE.md`** — regenerate only the components table (preserve all other content — rules, workflow, etc.)
3. **`.cursorrules`** — same regeneration (Cursor reads this automatically)
4. **`.windsurfrules`** — same regeneration (Windsurf reads this automatically); create if it doesn't exist

For AI rules files, regenerate ONLY the component table section, bounded by these markers:
```
<!-- drift:components-start -->
...
<!-- drift:components-end -->
```
If markers don't exist, append the table at the end of the file.

Report:
```
## Sync complete — <date>

drift.config.ts   — +3 added, 0 deprecated (37 total)
CLAUDE.md         — components table updated (37 components)
.cursorrules      — components table updated
.windsurfrules    — created (37 components)

New figmaLinks added: Toggle, Checkbox, DataGrid
New storyPaths added: DataTable, FilterBar

Storybook links: 37/37 ✅
Figma links: 31/37 (6 missing — run /drift-push gaps to add them)

Next: npm run dev and press D to see the updated overlay.
```

If `--dry-run` was passed, show what would change without writing anything.
