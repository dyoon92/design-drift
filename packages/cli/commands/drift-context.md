---
description: "Show a full DS snapshot — registry, static coverage, recent gaps, and prioritized next actions. Run this first to orient before any session involving the design system."
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[quick | file <path> | --export]"
---

# /drift-context — Instant DS snapshot for your current session

Gives you a complete picture of the design system state in one shot — no grepping,
no file hunting. Run this at the start of any session to orient yourself before
building, reviewing, or planning.

Designed for every persona:
- **PdMs/Designers** — "what components exist right now?"
- **Developers joining a project** — "what's the DS state before I touch anything?"
- **Code reviewers** — "what does drift look like for this file/feature?"
- **AI tools** — load this context before scaffolding or fixing

## Arguments: `$ARGUMENTS`
- *(no args)* — full snapshot: registry + coverage + gaps + recent drift
- `quick`     — registry only (component list, no coverage scan)
- `file <path>` — DS coverage for a specific file only
- `--export`  — output as markdown block suitable for pasting into a PRD, Jira ticket, or AI prompt

---

## Step 1 — Find the config

Look for config in this order:
1. `drift.config.ts` at project root
2. `src/ds-coverage/config.ts`
3. If neither exists, stop:
   ```
   No drift config found. Run /drift-setup to get started.
   ```

Read the config and extract:
- Component registry (names, storyPaths, figmaLinks)
- `storybookUrl` / `chromaticUrl`
- `figmaFileKey`
- `threshold`
- `approvedGaps` (if any)

---

## Step 2 — Dispatch

### No args → Full snapshot

**A. Registry summary** (read from config — no network call needed)

```
## DS Context — <project name from package.json> — <date>

### Component Registry (<N> components)
| Component          | Story | Figma | Status        |
|--------------------|-------|-------|---------------|
| Button             | ✅    | ✅    | stable        |
| Input              | ✅    | —     | needs figma   |
| TenantsTable       | ✅    | ✅    | stable        |
| ...                |       |       |               |

Missing storyPaths: N  →  run /drift-sync storybook to fill
Missing figmaLinks: N  →  run /drift-push gaps to fill

Approved exceptions: N
  • <ComponentName> — "<rationale>" (approved by <name>)
```

**B. Static coverage scan** (grep src/ — fast, no build needed)

Glob all `.tsx` files in `src/` (excluding stories, tests, tokens, node_modules).
For each file, count DS vs custom component usage.

```
### Coverage (static scan)
Overall: XX% DS  (threshold: XX%)
Status: ✅ PASS / 🔴 FAIL

Top 5 files by custom usage:
  src/features/dashboard/KPIRow.tsx     — 3 custom, 2 DS  (40%)
  src/features/tenants/BulkActions.tsx  — 2 custom, 5 DS  (71%)
  ...

Top gaps (custom components not in DS):
  CustomCard  — 8×   → no DS equivalent  (promote candidate)
  IconBtn     — 5×   → use Button variant="ghost"
  StatusPill  — 4×   → use Badge variant="status"
```

**C. Recent drift summary** (from git log — no build needed)

```bash
git log --oneline --since="7 days ago" -- "src/**/*.tsx"
```

Show files changed in the last 7 days, and for each, show whether DS coverage
went up or down based on static diff (add/remove DS vs custom components).

```
### Recent changes (last 7 days)
  src/features/payments/PaymentForm.tsx  — modified — DS coverage: stable
  src/features/dashboard/NewWidget.tsx   — added    — 2 custom components (⚠️ check drift)
```

**D. Session recommendations**

Based on the snapshot, output 1-3 prioritized actions:
```
### What to do next
1. 🔴 CustomCard used 8× — biggest coverage win: /drift fix CustomCard
2. ⚠️  src/features/dashboard/NewWidget.tsx added recently — run /drift file src/features/dashboard/NewWidget.tsx
3. 📎  6 components missing figmaLinks — run /drift-push gaps
```

---

### `quick` → Registry only

Skip the coverage scan and git log. Just output the component table and approved gaps.
Fast — reads only config.ts. Use this when you just need to know what's available.

```
## DS Components — <N> registered

Primitives: Button, Input, Badge, Modal, Toast, Dropdown, Tabs, Icon
Navigation: Navbar, Sidebar, Breadcrumb
Patterns: TenantsTable, UnitDetailsCard, PaymentBanner, CommunicationsPanel, PinnedNotes

Approved gaps (N): <list>
Missing stories (N): <list>

Storybook: <storybookUrl>
Figma: https://figma.com/design/<figmaFileKey>
```

---

### `file <path>` → Single-file coverage

Read the specified file and classify every JSX component:

```
## Coverage: src/features/dashboard/NewWidget.tsx

DS components (4):     Button, Badge, Tabs, Input
Custom components (2): KPICard, TrendArrow

Coverage: 67% (threshold: 80%) — 🔴 below threshold

Gaps:
  KPICard   — used 1× — no DS equivalent  → /drift promote KPICard
  TrendArrow — used 1× — check Badge for icon variant  → /drift fix TrendArrow

Token violations:
  Line 34: color: '#3b82f6'  → use var(--ds-color-brand-500)
```

---

### `--export` → Paste-ready block

Formats the full snapshot as a clean markdown block for:
- Pasting into a PRD / Linear issue (`/drift-prd` uses this internally)
- Adding to a Jira ticket
- Loading into an AI prompt as system context

```markdown
---
drift-context: <project> — <date>
threshold: XX%
coverage: XX% (static)
---

## Design System: <N> components
[component table]

## Coverage snapshot
[coverage summary]

## Active gaps
[gap list]

## Approved exceptions
[approved list]
---
```

---

## Performance notes

- **No build required** — reads config and source files directly
- **No network calls** in `quick` mode — instant
- **Static scan only** — grep-based, not fiber-tree (for fiber-tree accuracy, run `/drift check`)
- For large codebases (500+ files), the static scan may take a few seconds — this is expected
- The `file <path>` mode is always instant regardless of codebase size

## Why this exists

Without this command, getting oriented in a new session requires:
- Reading drift.config.ts manually
- Grepping src/ for component usage
- Running git log to see what changed
- Cross-referencing all of it mentally

`/drift-context` does all of that in one pass and surfaces the most important next action.
It is designed to be the **first command you run** in any session involving the design system.
