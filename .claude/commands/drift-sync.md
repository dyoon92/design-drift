# /drift-sync — Sync Figma + Storybook → update manifest

Pull the latest component state from Figma and/or Storybook and keep
drift.config.ts, CLAUDE.md, and .cursorrules in sync.

## Arguments: `$ARGUMENTS`
- *(no args)* — sync from both Storybook and Figma
- `figma`     — pull component list from Figma only (all pages)
- `storybook` — re-discover components from Storybook index only
- `tokens`    — run figma-sync (tokens + icons only, no component changes)

---

## Step 1 — Read current state

Read `drift.config.ts` (or `src/ds-coverage/config.ts`) to get:
- `figmaFileKey`
- `storybookUrl`
- `components` — the current registry (component name → storyPath/figmaLink)

---

## Step 2 — Dispatch

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

Report which token categories updated.

---

### `storybook` or no args → re-discover from Storybook

Fetch `{storybookUrl}/index.json`. The response has a flat map of all stories
across all story files. Parse it to get unique component names and story paths.

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

Ask for each new/removed component before changing config.

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
- `description` — designer's notes

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

For components in "In Progress" / "WIP" / "Proposals" pages, flag them
as not ready — don't add them to config automatically.

For each component NOT in config (excluding WIP pages), ask:
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

Also report components in the codebase (from static scan of src/) that exist
in Storybook but have NO matching Figma component — these are code-first gaps:
```
In code but not in Figma (consider pushing to Figma):
  ⚡ OccupancyWidget  — used 1× — /drift-push OccupancyWidget to add to Figma
  ⚡ FMKPIRow         — used 1×
```

---

## Step 3 — Update files

After confirmation, update:
1. `drift.config.ts` — add components with storyPath + figmaLink where available
2. `CLAUDE.md` — regenerate only the components table (preserve everything else)
3. `.cursorrules` — same

Report:
```
## Sync complete

drift.config.ts  — +3 added, -1 removed (37 total)
CLAUDE.md        — components table updated
.cursorrules     — components table updated

New figmaLinks added: Toggle, Checkbox, DataGrid
Run `npm run dev` and press D to see updated coverage.
```
