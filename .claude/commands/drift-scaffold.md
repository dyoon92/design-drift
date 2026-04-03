---
description: "Scaffold a new screen using only registered DS components. Gaps become Placeholders with design request prompts. Generates .tsx + .stories.ts ready for Storybook."
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
argument-hint: "[\"<screen description>\" | template <name> | list]"
disable-model-invocation: true
---

# /drift-scaffold — Scaffold a new screen using only DS components

Generate a starter page or feature screen using exclusively components from the DS registry.
Designed for PdMs and designers doing vibe coding — the output is guardrailed from the start.

Any component need that can't be met by the DS is replaced with a `<Placeholder>` and a
logged design request. This enforces the DS-first rule before a single line of product code
is written.

## Arguments: `$ARGUMENTS`
- *(no args)* — interactive mode: asks what to build, then scaffolds
- `"<screen description>"` — scaffold from inline description
- `template <name>` — scaffold from a named page template (dashboard, list, detail, form, settings)
- `list` — show all available templates

---

## Step 1 — Read the DS registry

Read `drift.config.ts` (or `src/ds-coverage/config.ts`) to get:
- Every registered DS component and its story path (the component menu)
- `storybookUrl` for inline story links in comments
- Any scaffolded page templates in `src/stories/prototypes/`

If no config is found:
```
No drift.config.ts found. Run /drift-setup first.
```

---

## Step 2 — Dispatch on $ARGUMENTS

### `list` — show available templates

Glob `src/stories/prototypes/**/*.tsx` and list available templates:
```
## Available scaffold templates

Built-in templates (no Storybook file needed):
  dashboard   — KPI widgets, charts, activity feed, quick actions
  list        — filterable/sortable data table with search and pagination
  detail      — entity detail page with tabs, info cards, action buttons
  form        — multi-section form with validation states and submit flow
  settings    — settings page with sections, toggles, and save states

Custom templates (from your Storybook):
  TenantPage  — src/stories/prototypes/TenantPage.stories.ts
  Dashboard   — src/stories/prototypes/Dashboard.stories.ts

Usage:
  /drift-scaffold template dashboard
  /drift-scaffold template TenantPage
  /drift-scaffold "a filtered list of units with status badges and bulk actions"
```

---

### `template <name>` — scaffold from named template

Find the template in `src/stories/prototypes/` first. If found, read it and use it as
the structural reference. If not found, use the built-in template definition below.

Then proceed as if the user described the template's canonical use case:
- `dashboard` → "analytics dashboard with KPI cards, primary chart, and recent activity"
- `list` → "data list with search, filters, sortable columns, and row actions"
- `detail` → "detail page for a single entity with overview cards, tabbed sections, and actions"
- `form` → "multi-step form with field validation, section headers, and submit/cancel actions"
- `settings` → "settings page with grouped sections, toggle switches, and save confirmation"

---

### No args / description — interactive scaffold

If no args, ask in a single message:
```
What do you want to build? A few details help generate better output:

1. Screen name (e.g. "Unit Detail Page", "Bulk Payment Modal")
2. What does this screen show? (data, entities, actions)
3. Who uses it? (admin, end user, support agent)
4. Any screens in the app it's similar to?
5. Where does it live? (new file path, or add to existing file)

Answer in plain English — no component names needed.
```

---

## Step 3 — Plan the component tree

Based on the description, plan the layout before writing code:

```
## Scaffold plan: <Screen Name>

Layout:
  <Navbar />                    ← DS ✅
  <Sidebar />                   ← DS ✅
  <TenantPageHeader />          ← DS ✅ (closest match)
    <Tabs /> (Overview, Units, Payments)  ← DS ✅
  <main>
    <UnitDetailsCard />         ← DS ✅
    <PaymentBanner />           ← DS ✅
    <CommunicationsPanel />     ← DS ✅
    <DateRangePicker />         ← ⚠️ GAP — will use <Placeholder>

DS coverage: 7/8 components (87.5%)
Gaps requiring <Placeholder>: 1

Proceed with this plan? (yes / adjust / cancel)
```

Show the plan and wait for confirmation before generating code.

---

## Step 4 — Generate the scaffold file

### File location

Ask where to put the file if not specified:
```
Where should this file go?
  1. src/stories/prototypes/<ScreenName>.tsx  (Storybook prototype — recommended)
  2. src/<ScreenName>.tsx                     (app screen)
  3. Custom path: ___
```

Default to `src/stories/prototypes/<ScreenName>.tsx` — this keeps prototypes separate from
production code and makes them visible in Storybook.

### Code generation rules

**CRITICAL — enforce these absolutely:**

1. **Only use components from `config.components`**. No exceptions.
2. **All colors** via `var(--ds-color-*)`. No hardcoded hex, rgb, or hsl.
3. **All spacing** via `var(--ds-spacing-*)`. No hardcoded px, rem, or em.
4. **No CSS files or modules** — inline styles only.
5. **No new dependencies** — only what's already in package.json.
6. **Every `<Placeholder>` must have a name and design request note.**

### Placeholder pattern (for gap components)

```tsx
// For any component not in the DS registry, use this pattern:
<div
  style={{
    border: '2px dashed var(--ds-color-border-default)',
    borderRadius: 'var(--ds-border-radius-md)',
    padding: 'var(--ds-spacing-4)',
    background: 'var(--ds-color-surface-subtle)',
    color: 'var(--ds-color-text-subtle)',
    fontSize: '0.875rem',
    textAlign: 'center',
  }}
>
  ⚠️ Missing component: DateRangePicker
  <br />
  Needs Figma spec before it can be built.
  <br />
  Run: /drift-push request DateRangePicker "date range filter for unit list"
</div>
```

### Generated file structure

```tsx
/**
 * <ScreenName> — scaffolded by /drift-scaffold on <date>
 *
 * DS coverage: N/N components
 * Gaps: <list any placeholders>
 *
 * To check coverage: run /drift check
 * To fix gaps: run /drift-push request <ComponentName> "<description>"
 */

import React from 'react'
// Import DS components only — never import custom components
import { Navbar, Sidebar } from '../AppNav'
import { TenantPageHeader } from '../TenantPageHeader'
// ... other DS imports from src/stories/

export function <ScreenName>() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar /* ... */ />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar /* ... */ />
        <main style={{ flex: 1, padding: 'var(--ds-spacing-6)' }}>
          {/* DS components for this screen */}

          {/* PLACEHOLDER: DateRangePicker */}
          <div style={{ /* placeholder styles */ }}>
            ⚠️ Missing component: DateRangePicker
            ...
          </div>
        </main>
      </div>
    </div>
  )
}
```

---

## Step 5 — Generate the Storybook story file

If the scaffold is in `src/stories/prototypes/`, also generate a `.stories.ts` file:

```ts
// <ScreenName>.stories.ts
import type { Meta, StoryObj } from '@storybook/react'
import { <ScreenName> } from './<ScreenName>'

const meta: Meta<typeof <ScreenName>> = {
  title: 'Prototypes/<ScreenName>',
  component: <ScreenName>,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof <ScreenName>>

export const Default: Story = {}
```

---

## Step 6 — Post-scaffold report

After generating the file(s):

```
## Scaffold complete: <ScreenName>

Files created:
  src/stories/prototypes/<ScreenName>.tsx
  src/stories/prototypes/<ScreenName>.stories.ts

DS coverage: N/N components (XX%)
Placeholders: N gap(s) logged

Gaps to resolve:
  ⚠️ DateRangePicker — run /drift-push request DateRangePicker "..."
  ⚠️ StatusTimeline  — run /drift-push request StatusTimeline "..."

Next steps:
  1. npm run storybook — preview at Prototypes/<ScreenName>
  2. npm run dev      — press D to see live DS coverage overlay
  3. /drift check     — verify coverage before submitting PR
  4. Resolve gaps: run /drift-push request for each ⚠️ above

PR checklist (copy into your PR description):
  - [ ] /drift check passes (coverage ≥ threshold)
  - [ ] All placeholders either resolved or have a linked design request
  - [ ] No hardcoded colors or spacing (token violations = 0)
  - [ ] Michelle reviewed component usage
```

---

## Style rules for generated code

- Include prop stubs with realistic placeholder data so the screen renders meaningfully (not empty)
- Add a comment above each DS component usage with the Storybook story link: `{/* Story: <storyPath> */}`
- Comment blocks should explain *intent*, not mechanics — "Filter panel for active/inactive units" not "renders a Tabs component"
- Generated code should look like a real first draft, not boilerplate — use domain-appropriate labels, data, and copy
- Never suppress TypeScript errors with `// @ts-ignore` — if a prop is unknown, note it with a `// TODO:` comment
- If the feature description is ambiguous, generate the simpler interpretation and note the assumption
