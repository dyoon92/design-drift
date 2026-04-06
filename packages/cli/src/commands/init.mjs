/**
 * catchdrift init
 * ───────────────
 * Interactive setup wizard. Installs Drift into any React project.
 * Uses @clack/prompts for a polished terminal experience.
 *
 * Flow:
 *  1. Detect framework + existing setup
 *  2. Ask where the DS lives (Figma / Storybook / npm package / manual)
 *  3. Ask follow-up questions per source
 *  4. Write drift.config.ts
 *  5. Write AI rules files (CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules)
 *  6. Patch app entry point with DriftOverlay
 *  7. Write GitHub Actions workflow
 *  8. Print summary + next steps
 */

import * as p from '@clack/prompts'
import pc from 'picocolors'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import { execSync } from 'child_process'
import {
  detectFramework,
  detectStorybook,
  detectAITools,
  detectExistingDrift,
} from '../lib/detect.mjs'
import {
  fetchStorybookComponents,
} from '../lib/storybook.mjs'
import {
  writeDriftConfig,
  writeAIRulesFiles,
  patchAppEntry,
  writeGithubAction,
} from '../lib/writers.mjs'

const EXIT_CANCELED = 1

export async function init(argv) {
  const cwd = process.cwd()

  // ── Verify this is a React project ──────────────────────────────────────────
  if (!existsSync(join(cwd, 'package.json'))) {
    console.error(pc.red('No package.json found. Run this inside a React project.'))
    process.exit(1)
  }

  p.intro(`${pc.bgBlue(pc.white(' catchdrift '))} ${pc.dim('Design system setup')}`)

  // ── Step 1: Detect existing state ───────────────────────────────────────────
  const spinner = p.spinner()
  spinner.start('Scanning project...')

  const framework = detectFramework(cwd)
  const storybook = detectStorybook(cwd)
  const aiTools   = detectAITools(cwd)
  const existing  = detectExistingDrift(cwd)

  spinner.stop('Project scanned')

  const frameworkLabel =
    framework === 'nextjs' ? 'Next.js' :
    framework === 'vite'   ? 'Vite'    :
    framework === 'remix'  ? 'Remix'   : 'React (CRA/other)'

  console.log('')
  console.log(`  ${pc.dim('Framework:')}    ${pc.bold(frameworkLabel)}`)
  console.log(`  ${pc.dim('Storybook:')}    ${storybook.found ? pc.green('✓ ' + storybook.url) : pc.dim('not detected')}`)
  console.log(`  ${pc.dim('Drift config:')} ${existing.config ? pc.green('✓ already set up') : pc.dim('not found')}`)
  console.log(`  ${pc.dim('AI tools:')}     ${aiTools.length ? aiTools.join(', ') : pc.dim('none detected')}`)
  console.log('')

  if (existing.config) {
    const cont = await p.confirm({
      message: 'Drift is already configured. Re-run setup and overwrite?',
      initialValue: false,
    })
    if (p.isCancel(cont) || !cont) {
      p.outro(pc.dim('Setup cancelled. Run again anytime.'))
      process.exit(EXIT_CANCELED)
    }
  }

  // ── Step 2: Where does the DS live? ─────────────────────────────────────────
  console.log('')
  p.log.step('Where does your design system live? Select all that apply.')
  console.log('')

  const dsSources = await p.multiselect({
    message: 'DS source (you can pick more than one)',
    options: [
      { value: 'figma',     label: 'Figma',            hint: 'components published in a Figma file' },
      { value: 'storybook', label: 'Storybook',         hint: 'stories at a URL' },
      { value: 'package',   label: 'npm package / path', hint: 'e.g. @acme/ui or ./src/components' },
      { value: 'manual',    label: 'I\'ll type component names myself', hint: 'you can always run /drift-sync later' },
    ],
    required: false,
  })
  if (p.isCancel(dsSources)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }

  const sources = Array.isArray(dsSources) ? dsSources : []

  // ── Storybook nudge — needed to close the Figma → code loop ─────────────────
  if (sources.includes('figma') && !sources.includes('storybook') && !storybook.found) {
    p.log.warn(
      'Storybook is needed to complete the loop.\n' +
      '  Without it, the overlay has no way to identify which components are from your DS.\n' +
      '  Figma tells Drift what exists in design — Storybook tells it what exists in code.'
    )
    const setupSB = await p.confirm({
      message: 'Set up Storybook now? (runs npx storybook@latest init)',
      initialValue: true,
    })
    if (p.isCancel(setupSB)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }

    if (setupSB) {
      spinner.start('Running npx storybook@latest init...')
      try {
        execSync('npx storybook@latest init --yes', { cwd, stdio: 'ignore' })
        spinner.stop('Storybook installed — it will be available at http://localhost:6006')
        sources.push('storybook')
      } catch {
        spinner.stop('Storybook install failed — run `npx storybook@latest init` manually, then re-run `npx catchdrift init`')
      }
    } else {
      p.log.info('Continuing without Storybook. Add it later and re-run `npx catchdrift init` to complete the loop.')
    }
  }

  // ── Step 3a: Figma ───────────────────────────────────────────────────────────
  let figmaFileKey, figmaToken, figmaWIPPages
  if (sources.includes('figma')) {
    figmaFileKey = await p.text({
      message: 'Figma file key',
      placeholder: 'Found in figma.com/design/THIS_KEY/...  (paste just the key)',
      validate: v => (!v?.trim() ? 'Required — paste the key from your Figma URL' : undefined),
    })
    if (p.isCancel(figmaFileKey)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }
    figmaFileKey = figmaFileKey?.trim() || undefined

    figmaToken = await p.text({
      message: 'Figma personal access token',
      placeholder: 'figd_...  (figma.com → Profile → Settings → Security → Personal access tokens)',
      hint: 'Used to fetch your real page list. Store in FIGMA_API_TOKEN env var — not committed to git.',
    })
    if (p.isCancel(figmaToken)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }
    figmaToken = figmaToken?.trim() || undefined

    // Fetch actual pages from Figma so the user picks from real names
    if (figmaToken && figmaFileKey) {
      spinner.start('Fetching pages from Figma...')
      const pages = await fetchFigmaPages(figmaFileKey, figmaToken)
      spinner.stop(pages ? `Found ${pages.length} pages` : 'Could not reach Figma — skipping page selection')

      if (pages?.length) {
        const selected = await p.multiselect({
          message: 'Which pages hold in-progress / not-yet-ready components? (drafts — won\'t be added to registry)',
          options: pages.map(name => ({ value: name, label: name })),
          required: false,
        })
        if (p.isCancel(selected)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }
        figmaWIPPages = Array.isArray(selected) && selected.length ? selected : undefined
      }
    }
  }

  // ── Step 3b: Storybook ───────────────────────────────────────────────────────
  let storybookUrl, chromaticUrl, sbComponents = {}

  if (sources.includes('storybook')) {
    storybookUrl = await p.text({
      message: 'Local Storybook URL',
      placeholder: 'http://localhost:6006',
      defaultValue: storybook.url || 'http://localhost:6006',
    })
    if (p.isCancel(storybookUrl)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }
    storybookUrl = String(storybookUrl).trim()

    chromaticUrl = await p.text({
      message: 'Deployed Storybook URL (Chromatic / Vercel / Netlify)',
      placeholder: 'https://main--abc123.chromatic.com  (skip if not deployed yet)',
    })
    if (p.isCancel(chromaticUrl)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }
    chromaticUrl = chromaticUrl?.trim() || undefined

    // Try to fetch components from Storybook
    spinner.start('Fetching components from Storybook...')
    const sbResult = await fetchStorybookComponents(storybookUrl)
    spinner.stop(sbResult.ok ? `Found ${sbResult.count} components in Storybook` : 'Storybook not reachable — will skip auto-discovery')

    if (sbResult.ok && sbResult.count > 0) {
      const useAll = await p.confirm({
        message: `Register all ${sbResult.count} Storybook components as DS? (refine anytime with /drift-sync)`,
        initialValue: true,
      })
      if (p.isCancel(useAll)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }
      sbComponents = useAll ? sbResult.components : {}
    }
  }

  // ── Step 3c: npm package or path ─────────────────────────────────────────────
  let dsPackages
  if (sources.includes('package')) {
    const pkgInput = await p.text({
      message: 'Package name(s) or path prefix(es) — comma-separated',
      placeholder: '@acme/ui  or  ./src/components  or  @acme/ui, @acme/icons',
      validate: v => (!v?.trim() ? 'Enter at least one package or path' : undefined),
    })
    if (p.isCancel(pkgInput)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }
    dsPackages = pkgInput?.trim().split(',').map(s => s.trim()).filter(Boolean)
  }

  // ── Step 4: Coverage threshold ───────────────────────────────────────────────
  const threshold = await p.text({
    message: 'Coverage threshold — CI fails below this %',
    placeholder: '80',
    defaultValue: '80',
    validate: v => {
      const n = Number(v)
      return (isNaN(n) || n < 0 || n > 100) ? 'Enter a number 0–100' : undefined
    },
  })
  if (p.isCancel(threshold)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }

  // ── Step 5: AI tools ─────────────────────────────────────────────────────────
  const aiToolsSelected = await p.multiselect({
    message: 'AI tools your team uses (select all that apply)',
    options: [
      { value: 'claude',   label: 'Claude Code',              hint: 'writes CLAUDE.md' },
      { value: 'cursor',   label: 'Cursor',                   hint: 'writes .cursorrules' },
      { value: 'windsurf', label: 'Windsurf',                 hint: 'writes .windsurfrules' },
      { value: 'agents',   label: 'Other (Copilot, GPT, etc.)', hint: 'writes AGENTS.md' },
    ],
    required: false,
    initialValues: aiTools,
  })
  if (p.isCancel(aiToolsSelected)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }

  // ── Step 6: Write drift.config.ts ────────────────────────────────────────────
  const components = { ...sbComponents }

  spinner.start('Writing drift.config.ts...')
  writeDriftConfig(cwd, {
    storybookUrl:  storybookUrl || (storybook.found ? storybook.url : undefined),
    chromaticUrl,
    figmaFileKey,
    figmaWIPPages,
    dsPackages,
    threshold:     Number(threshold) || 80,
    components,
  })
  spinner.stop('drift.config.ts written')

  // ── Step 7: Write AI rules files ─────────────────────────────────────────────
  spinner.start('Writing AI rules files...')
  const rulesFiles = writeAIRulesFiles(cwd, {
    tools:        Array.isArray(aiToolsSelected) ? aiToolsSelected : [],
    components,
    storybookUrl: storybookUrl || '',
    figmaFileKey,
  })
  spinner.stop(`Written: ${rulesFiles.join(', ')}`)

  // ── Step 8: Patch app entry point ────────────────────────────────────────────
  spinner.start('Adding DriftOverlay to app entry...')
  const patched = patchAppEntry(cwd, framework)
  spinner.stop(patched
    ? `Patched ${patched}`
    : 'Could not auto-patch — see manual step below')

  // ── Step 9: GitHub Actions ───────────────────────────────────────────────────
  const addCI = await p.confirm({
    message: 'Add GitHub Actions drift check (posts coverage delta on every PR)?',
    initialValue: true,
  })
  if (p.isCancel(addCI)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }

  if (addCI) {
    spinner.start('Writing .github/workflows/drift-check.yml...')
    writeGithubAction(cwd, { threshold: Number(threshold) || 80 })
    spinner.stop('.github/workflows/drift-check.yml written')
  }

  // ── Step 10: Summary ─────────────────────────────────────────────────────────
  console.log('')
  p.outro(pc.green('Drift is set up ✓'))

  const syncHint = dsPackages?.length
    ? `\n  ${pc.cyan('npx catchdrift sync')}                 Auto-discover components from ${dsPackages.join(', ')}`
    : ''

  console.log(`
${pc.bold('What was created:')}
  drift.config.ts                    ${pc.dim('DS component registry')}
  ${rulesFiles.map(f => f.padEnd(34)).join('\n  ')}${pc.dim('AI constraints')}
  ${addCI ? '.github/workflows/drift-check.yml  ' + pc.dim('CI drift check on every PR') : ''}
  ${patched ? patched.padEnd(34) + pc.dim('DriftOverlay added (dev-only)') : ''}

${pc.bold('Next steps:')}
  ${pc.cyan('npm run dev')}                          Open your app, press ${pc.bold('D')} to see Drift${syncHint}
  ${pc.cyan('npx catchdrift check')}                Run a coverage scan (requires running app)
  ${pc.cyan('git push')}                            First PR will show a drift delta comment

${pc.bold('Your team\'s daily commands (Claude Code):')}
  ${pc.blue('/drift-context')}    ${pc.dim('See DS state at a glance — run this first')}
  ${pc.blue('/drift-prd')}        ${pc.dim('Generate a component inventory for a PRD')}
  ${pc.blue('/drift-scaffold')}   ${pc.dim('Scaffold a new screen using only DS components')}
  ${pc.blue('/drift check')}      ${pc.dim('Verify coverage before submitting a PR')}
  ${pc.blue('/drift-sync')}       ${pc.dim('Re-sync registry after adding DS components')}
  ${pc.blue('/drift fix <X>')}    ${pc.dim('Migrate a custom component to its DS equivalent')}

${pc.dim('Docs: https://catchdrift.ai  ·  Issues: https://github.com/dyoon92/design-drift/issues')}
`)

  if (!patched) {
    console.log(`${pc.yellow('Manual step needed')} — add DriftOverlay to your app entry point:
`)
    console.log(`  ${pc.dim('// src/main.tsx')}`)
    console.log(`  import { DriftOverlay } from '@catchdrift/overlay'`)
    console.log(`  import driftConfig from '../drift.config'`)
    console.log('')
    console.log(`  ${pc.dim('// Last child in your root render:')}`)
    console.log(`  {import.meta.env.DEV && <DriftOverlay config={driftConfig} />}`)
    console.log('')
  }

  if (dsPackages?.length) {
    console.log(`${pc.blue('Tip:')} Run ${pc.bold('npx catchdrift sync')} to auto-populate your component registry from ${dsPackages.join(', ')}.`)
    console.log('')
  }

  if (figmaFileKey) {
    console.log(`${pc.blue('Tip:')} Open the Drift overlay (press D), go to Settings, and paste your Figma personal access token to enable Figma component sync.`)
    console.log('')
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchFigmaPages(fileKey, token) {
  try {
    const res = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=1`, {
      headers: { 'X-Figma-Token': token },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.document?.children?.map(page => page.name) ?? null
  } catch {
    return null
  }
}
