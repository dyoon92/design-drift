---
description: "Analyze DS coverage across the codebase. Find gaps, suggest DS replacements, migrate components, approve exceptions, promote candidates. Sub-commands: fix, approve, promote, manifest, check, history, audit."
allowed-tools: Read, Glob, Grep, Bash, Edit
argument-hint: "[fix <ComponentName> | approve <Name> \"<reason>\" | promote <Name> | manifest | check | history | audit]"
---

# /drift — Design System Drift Analyzer

Analyze design system coverage for this codebase. Identify components that drift from
the DS, suggest replacements, and optionally migrate code. Works with any React
product team — property management, SaaS, fintech, e-commerce, etc.

## Arguments: `$ARGUMENTS`

Supported sub-commands:
- *(no args)* — full coverage report + top gap analysis
- `fix <ComponentName>` — migrate one custom component to its DS equivalent
- `approve <ComponentName> "<rationale>"` — approve a gap with documented rationale
- `promote <ComponentName>` — flag a high-frequency custom component for DS promotion
- `manifest` — print the DS component registry with story + Figma links
- `check` — run the headless drift-check script and parse results
- `history` — show coverage trend over last N scans (from saved reports)
- `audit` — full audit mode: coverage + token violations + rationale gaps + promotion candidates

---

## Step 1 — Read the DS registry

Read `src/ds-coverage/config.ts` (or `drift.config.ts` at project root) to understand:
- Every registered DS component, its story path, and Figma link
- `threshold` — the CI pass/fail threshold
- `storybookUrl` and `figmaFileKey`

---

## Step 2 — Dispatch on $ARGUMENTS

### No arguments → Full Coverage Report

1. Glob `src/**/*.tsx` (excluding `src/stories/`, `src/tokens/`, `node_modules/`, `*.stories.*`, `*.test.*`, `*.spec.*`) to find all screens, views, and feature files.
2. Grep each file for JSX component usage. Classify every component as:
   - **DS** — name is in `config.components`
   - **Approved gap** — custom, but has an approval entry (check for `// drift-approved:` comment or approval record)
   - **Custom** — name is not in `config.components` and not approved
3. Compute per-file and overall DS coverage %.
4. List the top custom components by frequency (the gap map).
5. For any custom component used ≥ 3 times:
   - Check whether a DS equivalent exists → suggest it
   - If used ≥ 5 times → flag as **promotion candidate**
6. Print a report in this format:

```
## Drift Report — <date>

Overall DS coverage: XX% (threshold: XX%)
Status: ✅ PASS  or  🔴 FAIL

### By file
| File | DS | Custom | Approved | Coverage |
|------|----|--------|----------|----------|
| ...  | .. | ...    | ...      | ...%     |

### Top gaps (custom components not in DS)
| Component | Uses | Status | Suggested DS replacement |
|-----------|------|--------|--------------------------|
| BtnGrp    | 6    | ⚠️ Gap  | Use `<Tabs>` (segmented variant) |
| LinkBtn   | 5    | 🔁 Promote candidate | Use `<Button variant="ghost">` |
| AvatarRow | 3    | ✅ Approved — "needed for nav micro-interaction" | — |

### Token violations
| File | Violation | Line |
|------|-----------|------|
| ... | Hardcoded `#3b82f6` — use `var(--ds-color-brand-500)` | 42 |

### Promotion candidates (used ≥5× with no DS equivalent)
These components appear frequently enough to justify adding to the DS:
1. <ComponentName> — used N× across N files
   → Run `/drift promote <ComponentName>` to create a promotion request

### Recommendations
1. Highest impact: migrate <X> → saves N% coverage across N files
2. ...
```

---

### `fix <ComponentName>`

1. Find all usages of `<ComponentName>` across `src/` (excluding stories and tests).
2. Read the DS equivalent component file to understand its props API.
3. For each usage, generate a code diff that replaces the custom component with the DS component, preserving existing behavior.
4. Show a summary first:
   ```
   Found 6 usages of <ComponentName> across 3 files.
   DS equivalent: <DSName> — props mapping:
     old.size="large"  → new.size="lg"
     old.color="red"   → new.variant="danger"

   Estimated coverage improvement: +2.3%

   Apply changes? (yes/no/preview)
   ```
5. After applying, re-run coverage calculation and show before/after.

---

### `approve <ComponentName> "<rationale>"`

Approve a custom component as an intentional exception to DS coverage rules.

Use this when a custom component is genuinely needed and cannot be replaced by a DS component. Rationale must include:
- Why no DS component covers this need
- Whether it should be proposed for DS inclusion in the future

1. Verify the component is actually used in the codebase.
2. Check it's not already approved.
3. Add an approval entry to `drift.config.ts`:
   ```ts
   approvedGaps: {
     '<ComponentName>': {
       rationale: '<rationale>',
       approvedBy: '<ask for name>',
       approvedAt: '<today ISO date>',
       promoteToDS: true/false,  // ask: "Should this be proposed for DS inclusion?"
     }
   }
   ```
4. Also add an inline comment convention to the usage site so rationale travels with the code:
   ```tsx
   {/* drift:ignore reason="<rationale>" approvedBy="<name>" */}
   <ComponentName ... />
   ```
   This is visible in code review without needing to cross-reference config.
5. Confirm: "Approved. This component will show as ✅ Approved in drift reports and will not count against coverage."

---

### `promote <ComponentName>`

Flag a high-frequency custom component as a DS promotion candidate.

1. Read the component file (or search for it if it's a one-off inline component).
2. Count its usage frequency and list the files it appears in.
3. Generate a promotion brief:
   ```
   ## DS Promotion Request: <ComponentName>

   **Usage:** N× across N files
   **Files:** list up to 5 most common locations

   **Props API (current):**
   <extracted interface or inferred from usage>

   **Suggested DS entry:**
   <ComponentName>: {
     storyPath: '<suggested-story-path>',
   }

   **Design request:** This component appears frequently enough to warrant a
   Figma design + DS review. Recommend filing a design request.

   Next steps:
   1. Designer creates the spec in Figma
   2. Run /drift-push <ComponentName> to attach implementation notes
   3. After Figma review, run /drift-sync to register it officially
   ```
4. Ask if user wants to open a Jira ticket (if `jiraBaseUrl` is configured).

---

### `manifest`

Print a formatted table of all DS components from `config.components`:

```
## DS Component Registry — <date>

| Component          | Story | Figma | Status |
|--------------------|-------|-------|--------|
| Button             | ✅    | ✅    | Stable |
| Tabs               | ✅    | —     | Needs Figma |
| ...                | ...   | ...   | ...    |

Approved gaps (N):
| Component    | Rationale | Approved by |
|--------------|-----------|-------------|
| CustomHeader | "..." | Michelle, 2026-01-15 |

Missing story paths: X components
Missing Figma links: X components
Run /drift-sync to fill gaps automatically.
```

---

### `check`

Run the headless drift check and parse results:

```bash
npm run build && npx vite preview --port 4173 &
npx wait-on http://localhost:4173 --timeout 30000
node scripts/drift-check.mjs --url http://localhost:4173 --json > /tmp/drift-report.json
```

Then read `/tmp/drift-report.json` and print the full report format including:
- Coverage % vs threshold
- Per-route breakdown
- Token violations (hardcoded colors, spacing)
- Gap map with promotion candidates

---

### `history`

Read any saved `drift-report-*.json` files or GitHub Actions artifacts from `.github/`.
Show coverage trend:

```
## Coverage History

Date         Coverage   Delta    Status
2026-03-30   78%        +2%      🔴 Below threshold
2026-03-23   76%        +1%      🔴 Below threshold
2026-03-16   75%        —        🔴 Below threshold

Trend: ↑ improving (+3% over 3 weeks)
At current rate, threshold (80%) reached in ~2 weeks.
```

---

### `audit`

Full audit combining all modes:
1. Run `check` (headless scan)
2. Run the static analysis (no-args path)
3. Cross-reference: flag any component approved as a gap that now has a DS equivalent
4. List components that have been custom for ≥ 30 days (from git log if available)
5. Output a single comprehensive report suitable for a DS quarterly review

---

## Style rules for output

- Lead with the numbers — coverage %, counts, file names
- Use exact component names from the codebase (case-sensitive)
- When suggesting a DS replacement, always show a before/after code snippet
- If coverage is below threshold, surface the 3 highest-impact gaps first with estimated improvement per fix
- Never suggest creating new components — only DS components from `config.components`
- For teams unfamiliar with the DS, always explain *why* a replacement is better, not just *what* to use
- Approved gaps always show ✅ and are excluded from failure calculations
