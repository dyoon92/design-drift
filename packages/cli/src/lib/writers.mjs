/**
 * File writers for catchdrift init
 * All writers are idempotent — safe to re-run.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, join, dirname, relative, posix } from 'path'
import { buildComponentRegistry } from './storybook.mjs'
import { findAppEntry } from './detect.mjs'

// ── drift.config.ts ───────────────────────────────────────────────────────────

export function writeDriftConfig(cwd, { storybookUrl, chromaticUrl, figmaFiles, dsPackages, threshold, components }) {
  const registry = buildComponentRegistry(components)

  const dsPackagesLine = dsPackages?.length
    ? `  dsPackages: [${dsPackages.map(p => `'${p}'`).join(', ')}],`
    : null

  // Build figmaFiles block — single file gets a compact shape, multiple get an array
  let figmaFilesBlock = null
  if (figmaFiles?.length === 1) {
    const f = figmaFiles[0]
    figmaFilesBlock = `  figmaFileKey: '${f.key}',`
    if (f.wipPages?.length) {
      figmaFilesBlock += `\n  figmaWIPPages: [${f.wipPages.map(p => `'${p}'`).join(', ')}], // components on these pages are drafts — not added to registry`
    }
  } else if (figmaFiles?.length > 1) {
    const entries = figmaFiles.map(f => {
      const wipLine = f.wipPages?.length
        ? `, wipPages: [${f.wipPages.map(p => `'${p}'`).join(', ')}]`
        : ''
      return `    { key: '${f.key}'${wipLine} },`
    }).join('\n')
    figmaFilesBlock = `  figmaFiles: [\n${entries}\n  ],`
  }

  const lines = [
    `import type { DesignDriftConfig } from '@catchdrift/overlay'`,
    ``,
    `const config: DesignDriftConfig = {`,
    storybookUrl ? `  storybookUrl: '${storybookUrl}',` : null,
    chromaticUrl ? `  chromaticUrl: '${chromaticUrl}',` : null,
    figmaFilesBlock,
    `  threshold: ${threshold},`,
    dsPackagesLine,
    `  components: {`,
    registry || `    // Auto-populated by \`npx catchdrift sync\` — or add manually:`,
    `    // Button: { storyPath: 'primitives-button--primary' },`,
    `  },`,
    `  // approvedGaps: {},`,
    `}`,
    ``,
    `export default config`,
  ].filter(l => l !== null).join('\n')

  writeFileSync(join(cwd, 'drift.config.ts'), lines, 'utf8')
}

// ── AI rules files ────────────────────────────────────────────────────────────

const COMPONENT_TABLE_START = '<!-- drift:components-start -->'
const COMPONENT_TABLE_END   = '<!-- drift:components-end -->'

function buildComponentTable(components, storybookUrl) {
  const rows = Object.entries(components).map(([name, meta]) => {
    const story = meta.storyPath ? `[Story](${storybookUrl}/iframe.html?id=${meta.storyPath})` : '—'
    return `| ${name.padEnd(20)} | ${story} |`
  })

  return [
    COMPONENT_TABLE_START,
    `## Available DS components`,
    `| Component             | Story |`,
    `|-----------------------|-------|`,
    ...rows,
    COMPONENT_TABLE_END,
  ].join('\n')
}

function buildAIRulesContent(components, storybookUrl, figmaFiles) {
  const figmaLines = figmaFiles?.length
    ? figmaFiles.map(f => `- Figma: https://figma.com/design/${f.key}`).join('\n') + '\n'
    : ''
  return `# Design System Rules

## Source of truth
- Storybook: ${storybookUrl}
${figmaLines}- Tokens: src/tokens/variables.css — use CSS variables only

## The #1 rule: never invent UI from scratch
Only use components from the table below. If a component you need is missing:
1. Use \`<Placeholder label="ComponentName" />\` as a stand-in
2. Output this message:
   ⚠️  Missing component: [ComponentName]
   This needs to be designed in Figma first.
3. Run: /drift-push request [ComponentName] "[what it needs to do]"
   This files a design request directly in Figma for the DS team.

## Approved exceptions
To use a non-DS component intentionally, wrap it with a rationale comment:
  {/* drift:ignore reason="<why no DS component covers this>" approvedBy="<name>" */}
These are tracked in drift.config.ts and excluded from coverage metrics.

${buildComponentTable(components, storybookUrl)}

## Style rules
- Colors: var(--ds-color-*) — never hardcode hex or rgb
- Spacing: var(--ds-spacing-*) — never hardcode px or rem
- No CSS files — inline styles only
- Font: Inter, system-ui, sans-serif

## The full design loop
1. Vibe code using only the components above
2. Missing a component? → /drift-push request Name "description" → lands in Figma
3. Designer builds it in Figma
4. /drift-sync figma → pulls it into drift.config.ts + updates these rules
5. Built a custom component and want it in the DS? → /drift-push ComponentName → pushes props, token usage, and examples to Figma
6. /drift check → verify coverage before a PR

## Drift commands (Claude Code)
- /drift-context   — see DS state at a glance (run this first)
- /drift-prd       — generate component inventory for a PRD
- /drift-scaffold  — scaffold a screen with only DS components
- /drift check     — verify coverage before a PR
- /drift-sync      — re-sync after adding DS components
- /drift fix <X>   — migrate custom component X to its DS equivalent
- /drift-push <X>  — push a built component back to Figma
- /drift-push gaps — push all high-frequency custom components to Figma at once
`
}

export function writeAIRulesFiles(cwd, { tools, components, storybookUrl, figmaFiles }) {
  const content = buildAIRulesContent(components, storybookUrl, figmaFiles)
  const written = []

  const toolFileMap = {
    claude:    'CLAUDE.md',
    cursor:    '.cursorrules',
    windsurf:  '.windsurfrules',
    agents:    'AGENTS.md',
  }

  // Always write AGENTS.md — it's the cross-tool standard (Claude Code, Cursor, Windsurf, Copilot, OpenAI)
  const filesToWrite = new Set([...tools.map(t => toolFileMap[t]).filter(Boolean), 'AGENTS.md'])

  for (const filename of filesToWrite) {
    const filepath = join(cwd, filename)

    if (existsSync(filepath)) {
      // Regenerate only the component table section, preserve the rest
      const existing = readFileSync(filepath, 'utf8')
      const startIdx = existing.indexOf(COMPONENT_TABLE_START)
      const endIdx   = existing.indexOf(COMPONENT_TABLE_END)

      if (startIdx !== -1 && endIdx !== -1) {
        const updated = existing.slice(0, startIdx) +
          buildComponentTable(components, storybookUrl) +
          existing.slice(endIdx + COMPONENT_TABLE_END.length)
        writeFileSync(filepath, updated, 'utf8')
        written.push(filename + ' (updated)')
        continue
      }
    }

    writeFileSync(filepath, content, 'utf8')
    written.push(filename)
  }

  return written
}

// ── App entry point patching ──────────────────────────────────────────────────

export function patchAppEntry(cwd, framework) {
  const entryPath = findAppEntry(cwd)
  if (!entryPath) return null

  const src = readFileSync(entryPath, 'utf8')

  // Skip if already patched
  if (src.includes('DriftOverlay') || src.includes('@catchdrift/overlay')) return entryPath

  const isNext   = framework === 'nextjs'
  const envCheck = isNext ? `process.env.NODE_ENV === 'development'` : `import.meta.env.DEV`

  // Compute relative path from the entry file's directory back to drift.config.ts at project root
  const entryDir = dirname(entryPath)
  const configRelPath = posix.join(
    ...relative(entryDir, cwd).split('/').map(s => s || '.'),
    'drift.config'
  ).replace(/^(?!\.)/, './')

  const importLine = `import { DriftOverlay } from '@catchdrift/overlay'\nimport driftConfig from '${configRelPath}'\n`

  // Add import after the last existing import line
  const lastImportIdx = [...src.matchAll(/^import .+$/gm)].pop()
  if (!lastImportIdx) return null

  const insertAt = lastImportIdx.index + lastImportIdx[0].length
  const withImport = src.slice(0, insertAt) + '\n' + importLine + src.slice(insertAt)

  // Add overlay before the closing </> or </div> or </body> of the root render
  const overlayJsx = `\n      {${envCheck} && <DriftOverlay config={driftConfig} />}`
  const patched = withImport.replace(
    /(<\/(?:React\.StrictMode|StrictMode|React\.Fragment|Fragment|div|body|main)[^>]*>|<\/>)/,
    `${overlayJsx}\n    $1`
  )

  if (patched === withImport) return null // pattern not found, skip auto-patch

  writeFileSync(entryPath, patched, 'utf8')
  return entryPath.replace(cwd + '/', '')
}

// ── GitHub Actions workflow ───────────────────────────────────────────────────

export function writeGithubAction(cwd, { threshold }) {
  const dir = join(cwd, '.github/workflows')
  mkdirSync(dir, { recursive: true })

  const filepath = join(dir, 'drift-check.yml')
  if (existsSync(filepath)) return // don't overwrite existing workflow

  const yaml = `name: Drift Check
on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]

env:
  DRIFT_THRESHOLD: ${threshold}
  DRIFT_ROUTES: /
  DRIFT_STRICT: false

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
      - name: Validate specs (static — no build needed)
        run: npx @catchdrift/cli spec validate
        continue-on-error: true
        id: spec-validate
      - run: npx playwright install chromium --with-deps
      - name: Restore drift baseline
        uses: actions/cache/restore@v4
        with:
          path: drift-baseline.json
          key: drift-baseline-\${{ github.base_ref || github.ref_name }}
      - run: npm run build
      - run: npx vite preview --port 4173 &
      - run: npx wait-on http://localhost:4173 --timeout 30000
      - name: Run drift check
        run: |
          npx @catchdrift/cli check \\
            --url http://localhost:4173 \\
            --threshold \${{ env.DRIFT_THRESHOLD }} \\
            --routes "\${{ env.DRIFT_ROUTES }}" \\
            --json > drift-report.json
        continue-on-error: true
      - name: Post PR comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs')
            const report = JSON.parse(fs.readFileSync('drift-report.json', 'utf8'))
            const pct = report.coverage ?? report.pct ?? 0
            const threshold = \${{ env.DRIFT_THRESHOLD }}
            const status = pct >= threshold ? '✅' : '🔴'
            const specOutcome = '\${{ steps.spec-validate.outcome }}'
            const specLine = specOutcome === 'success'
              ? '| Spec validation | ✅ All specs satisfied |'
              : specOutcome === 'failure'
                ? '| Spec validation | ⚠️ Spec gaps detected — run \`catchdrift spec validate\` |'
                : ''
            const body = [
              '## ' + status + ' Drift Report',
              '',
              '| Metric | Value |',
              '|--------|-------|',
              '| DS Coverage | ' + pct + '% (threshold: ' + threshold + '%) |',
              '| Custom components | ' + (report.gapCount ?? 0) + ' |',
              '| Token violations | ' + (report.tokenViolations ?? 0) + ' |',
              specLine,
              '',
              pct < threshold ? '**Coverage is below threshold.** Migrate custom components with \`/drift fix <ComponentName>\`.' : '_All good._',
            ].filter(Boolean).join('\\n')
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner, repo: context.repo.repo, issue_number: context.issue.number
            })
            const existing = comments.find(c => c.body.includes('Drift Report'))
            if (existing) {
              await github.rest.issues.updateComment({ owner: context.repo.owner, repo: context.repo.repo, comment_id: existing.id, body })
            } else {
              await github.rest.issues.createComment({ owner: context.repo.owner, repo: context.repo.repo, issue_number: context.issue.number, body })
            }
      - name: Save baseline
        if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
        uses: actions/cache/save@v4
        with:
          path: drift-report.json
          key: drift-baseline-\${{ github.ref_name }}-\${{ github.run_id }}
      - uses: actions/upload-artifact@v4
        with:
          name: drift-report
          path: drift-report.json
          retention-days: 90
      - name: Enforce threshold
        run: |
          PCT=\$(node -e "const r=require('./drift-report.json'); console.log(r.coverage ?? r.pct ?? 0)")
          if [ "\$PCT" -lt "\${{ env.DRIFT_THRESHOLD }}" ]; then
            echo "Coverage \$PCT% is below threshold \${{ env.DRIFT_THRESHOLD }}%"
            exit 1
          fi
`

  writeFileSync(filepath, yaml, 'utf8')
}
