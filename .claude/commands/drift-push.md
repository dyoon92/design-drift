# /drift-push — Push implemented components back to Figma

When a custom component has been built and approved, push evidence back to Figma:
screenshots, implementation notes, and coverage status. Closes the design→code loop.

## Arguments: `$ARGUMENTS`
- `<ComponentName>`  — push a specific component to Figma
- `gaps`             — push all components that appear ≥5× in the codebase but have no Figma node
- `coverage`         — post a coverage summary annotation to the Figma file's cover page

---

## Step 1 — Read config

Read `drift.config.ts` (or `src/ds-coverage/config.ts`) to get:
- `figmaFileKey` — required. If missing, stop:
  ```
  No figmaFileKey set in drift.config.ts.
  Add your Figma file key first:
    figmaFileKey: 'your-key-here'  // figma.com/design/THIS_PART/...
  ```
- `figmaProposalsPage` — optional. The Figma page where new component specs should land.
- `FIGMA_API_TOKEN` — check `process.env.FIGMA_API_TOKEN`. If missing when needed, prompt:
  ```
  export FIGMA_API_TOKEN=your-token
  Get token: figma.com → Profile → Settings → Security → Personal access tokens
  ```

---

## Step 2 — Resolve target Figma page

Before pushing any component, you need to know which Figma page to target.

### If `figmaProposalsPage` is set in config:
Use it directly. Report: `Target page: "<figmaProposalsPage>" (from config)`

### If `figmaProposalsPage` is NOT set:
Fetch the file's page list:
```
GET https://api.figma.com/v1/files/{figmaFileKey}?depth=1
Headers: X-Figma-Token: {FIGMA_API_TOKEN}
```

The response `document.children` is the array of pages. Extract their `name` fields and present:

```
No figmaProposalsPage set in drift.config.ts.
Available pages in your Figma file:

  1. Component Library
  2. Primitives
  3. Navigation
  4. Patterns
  5. 🚧 In Progress

Which page should new component specs land on? (enter number or name)
Or add to drift.config.ts:
  figmaProposalsPage: '🚧 In Progress'
```

Wait for the user's reply before continuing.

---

## Step 3 — Dispatch on $ARGUMENTS

### `<ComponentName>` — push one component

1. Find the component file: `src/stories/<ComponentName>.tsx` or search `src/`
2. Read the component's props interface
3. Check if it already has a `figmaLink` in `config.components` — if yes, ask to confirm before proceeding

4. Build a structured Figma brief:

```
## Component: <ComponentName>

**Source file:** src/stories/<ComponentName>.tsx
**Used:** <N>× in codebase
**DS status:** [registered in config / not yet registered]

**Props API:**
<extracted TypeScript interface>

**Variants / states:**
<extract from props union types, e.g. variant: 'primary' | 'secondary'>

**Token usage:**
<grep for var(--ds-*) references in the component file>

**Implementation notes:**
<any JSDoc comments from the file>
```

5. **If Figma MCP is connected:**
   - Use MCP to find or create a component frame on the target page
   - Post the brief as a Figma annotation/comment on the component node
   - Build and report the figmaLink URL: `https://www.figma.com/design/{figmaFileKey}?node-id={node_id}`
   - Ask: "Should I update drift.config.ts with this figmaLink?"
   - If yes, update config:
     ```ts
     <ComponentName>: {
       storyPath: '...',
       figmaLink: 'https://www.figma.com/design/{figmaFileKey}?node-id={node_id}',
     },
     ```

6. **If Figma MCP is NOT connected:**
   - Output the brief as formatted text
   - Instruct:
     ```
     Manual steps:
     1. Open Figma → <target page>
     2. Create a new frame named "<ComponentName>"
     3. Paste the brief above as a comment on that frame
     4. Copy the node URL (right-click frame → Copy link)
     5. Run: /drift-push <ComponentName>
        and paste the URL when asked
     ```
   - Ask: "Paste the Figma node URL here to save it to drift.config.ts (or skip):"
   - If provided, update config with the `figmaLink`
   - Show MCP setup snippet:
     ```
     To connect Figma MCP (enables automatic push):
     Add to ~/.claude.json mcpServers:
       "figma": {
         "command": "npx",
         "args": ["-y", "figma-developer-mcp", "--stdio"],
         "env": { "FIGMA_ACCESS_TOKEN": "<your-token>" }
       }
     ```

---

### `gaps` — push all high-frequency custom components

1. Statically scan `src/` (excluding `src/stories/`, `src/tokens/`, `node_modules/`) for JSX component usage
2. Cross-reference against `config.components` — find components NOT in config
3. Count occurrences of each, sort descending
4. Show the top 10:

```
## High-frequency components not in Figma

  1. OccupancyWidget    — used 12× — no figmaLink
  2. FMKPIRow           — used 8×  — no figmaLink
  3. LeaseExpiryBanner  — used 6×  — no figmaLink
  4. UnitStatusChip     — used 5×  — no figmaLink
  ...

Push these to Figma? Reply with:
  - "all" to push all of them
  - comma-separated names: "OccupancyWidget, FMKPIRow"
  - "none" to cancel
```

5. For each confirmed component, run the single-component push flow (Step 3 above)

---

### `coverage` — post coverage summary to Figma

1. Run `npm run drift-check --json` to get current coverage data
2. Build a coverage report card:

```
## Drift Coverage Report
Date: <today>

Overall DS coverage: <N>%
Threshold: <threshold>% — [✅ PASSING / ❌ FAILING]

By route:
  /           <N>% (<DS> DS, <custom> custom)
  /tenants    <N>%
  /dashboard  <N>%

Top gaps (most-used custom components):
  1. <Name> ×<count>
  2. <Name> ×<count>
  3. <Name> ×<count>

Token violations: <N> hardcoded colors
```

3. **If Figma MCP connected:**
   - Fetch `GET /files/{figmaFileKey}?depth=1` to find the first page (cover page)
   - Post as a comment on the cover frame node
   - Report: "Coverage report posted to Figma cover page"

4. **If Figma MCP NOT connected:**
   - Output the report card
   - Instruct: "Paste this as a comment on the cover page of your Figma file"
   - Show MCP setup snippet (same as above)

---

## Style notes

- Always confirm the target Figma page before writing anything
- Be specific about what was pushed to Figma vs. what needs manual action
- If Figma MCP isn't connected, always show the MCP setup snippet so they can easily connect it
- Never modify component source files — read only
- When building figmaLink URLs, always use the format:
  `https://www.figma.com/design/{figmaFileKey}?node-id={node_id}`
