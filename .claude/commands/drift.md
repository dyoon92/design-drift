# /drift — Design System Drift Analyzer

Analyze design system coverage for this codebase. Identify custom components that
drift from the DS, suggest replacements, and optionally migrate code.

## Arguments: `$ARGUMENTS`

Supported sub-commands:
- *(no args)* — full coverage report + top gap analysis
- `fix <ComponentName>` — migrate one custom component to its DS equivalent
- `manifest` — print the DS component registry with story links
- `check` — run the headless drift-check script and parse results

---

## Step 1 — Read the DS registry

Read `src/ds-coverage/config.ts` to understand every registered DS component,
its story path, and Figma link.

## Step 2 — Dispatch on $ARGUMENTS

### No arguments → Full Coverage Report

1. Glob `src/stories/prototypes/**/*.tsx` and `src/App.tsx` to find screens/views.
2. Grep each file for JSX component usage. Classify every component as:
   - **DS** — name is in `config.components`
   - **Custom** — name is not in `config.components`
3. Compute per-file and overall DS coverage %.
4. List the top custom components by frequency (the gap map).
5. For any custom component used ≥ 3 times, check whether a DS equivalent exists
   and explain the gap or suggest the replacement.
6. Print a report in this format:

```
## Drift Report — <date>

Overall DS coverage: XX% (threshold: 80%)
Status: ✅ PASS  or  🔴 FAIL

### By file
| File | DS | Custom | Coverage |
|------|-----|--------|----------|
| ...  | ... | ...    | ...%     |

### Top gaps (custom components not in DS)
| Component | Uses | Suggested DS replacement |
|-----------|------|--------------------------|
| BtnGrp    | 6    | Use `<Tabs>` (segmented variant) |
| LinkBtn   | 5    | Use `<Button variant="ghost">` |
| ...       | ...  | ...                       |

### Recommendations
1. ...
2. ...
```

### `fix <ComponentName>`

1. Find all usages of `<ComponentName>` across `src/`.
2. Read the DS equivalent component file (`src/stories/<DSName>.tsx`) to understand
   its props API.
3. For each usage, generate a code diff that replaces the custom component with the
   DS component, preserving behavior.
4. Ask for confirmation before applying changes.
5. After applying, re-run the coverage calculation to show the improvement.

### `manifest`

Print a formatted table of all DS components from `config.components`:

```
## DS Component Registry

| Component          | Story | Figma |
|--------------------|-------|-------|
| Button             | ✅    | —     |
| Tabs               | ✅    | —     |
| ...                | ...   | ...   |
```

Note any components missing story paths or Figma links.

### `check`

Run the headless drift check and parse results:

```bash
npm run build && npx vite preview --port 4173 &
npx wait-on http://localhost:4173 --timeout 30000
node scripts/drift-check.mjs --url http://localhost:4173 --json > /tmp/drift-report.json
```

Then read `/tmp/drift-report.json` and print the same report format as the
no-args path, including token violations.

---

## Style rules for output

- Be concise — lead with the numbers, follow with recommendations
- Use the component names exactly as they appear in the codebase (case-sensitive)
- When suggesting a DS replacement, always show a before/after code snippet
- If coverage is below 80%, flag the 3 highest-impact gaps (most frequent custom components)
  and estimate the coverage improvement if each was migrated
- Never suggest creating new components — only DS components from `config.components`
