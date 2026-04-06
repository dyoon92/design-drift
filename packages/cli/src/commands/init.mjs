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
  writeEnvLocal,
  writeAIRulesFiles,
  writeClaudeSkills,
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

  // ── Storybook nudge — fire whenever Storybook isn't in the setup ─────────────
  const storybookNeeded = !sources.includes('storybook') && !storybook.found
  if (storybookNeeded && sources.length > 0) {
    p.log.warn(
      'Storybook is needed to close the design → code loop.\n' +
      '  It lets Drift identify which components are from your DS vs. custom-built.\n' +
      '  Without it, coverage will show 0% until you manually list components.'
    )
    const setupSB = await p.confirm({
      message: 'Set up Storybook now?',
      initialValue: true,
    })
    if (p.isCancel(setupSB)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }

    if (setupSB) {
      console.log(pc.dim('\n  Running npx storybook@latest init — follow the prompts:\n'))
      try {
        // Use inherit so the user can interact with Storybook's framework prompts
        execSync('npx storybook@latest init', { cwd, stdio: 'inherit' })
        p.log.success('Storybook installed — run `npm run storybook` to start it on :6006')
        sources.push('storybook')
      } catch {
        p.log.warn('Storybook install failed or was cancelled. Run `npx storybook@latest init` manually when ready.')
      }
    } else {
      p.log.info('Skipping Storybook. Run `npx storybook@latest init` when ready, then re-run `npx catchdrift init`.')
    }
  }

  // ── If user selected Storybook but it wasn't detected, offer to install ──────
  if (sources.includes('storybook') && !storybook.found) {
    const installNow = await p.confirm({
      message: 'Storybook wasn\'t detected in this project. Install it now?',
      initialValue: true,
    })
    if (p.isCancel(installNow)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }

    if (installNow) {
      console.log(pc.dim('\n  Running npx storybook@latest init — follow the prompts:\n'))
      try {
        execSync('npx storybook@latest init', { cwd, stdio: 'inherit' })
        p.log.success('Storybook installed — run `npm run storybook` to start it on :6006')
      } catch {
        p.log.warn('Storybook install failed or was cancelled. Run `npx storybook@latest init` manually when ready.')
        // Remove storybook from sources so we don't ask for a URL that doesn't exist yet
        sources.splice(sources.indexOf('storybook'), 1)
      }
    } else {
      // User declined — remove from sources so the URL step is skipped
      sources.splice(sources.indexOf('storybook'), 1)
      p.log.info('Skipping Storybook setup. Re-run `npx catchdrift init` after installing it.')
    }
  }

  // ── Step 3a: Figma ───────────────────────────────────────────────────────────
  // figmaFiles: [{ key: string, componentPages?: string[] }]
  let figmaToken
  const figmaFiles = []

  if (sources.includes('figma')) {
    // Token — ask once, reused for all files
    console.log('')
    p.log.step('Create a Figma access token — takes about 60 seconds:')
    console.log(`
  1. Open ${pc.cyan('figma.com')} → click your avatar (top-left) → ${pc.bold('Settings')}
  2. Go to the ${pc.bold('Security')} tab → click ${pc.bold('Generate new token')}
  3. Give it a name (e.g. "Drift") and set an expiry
  4. Enable these scopes:
       ${pc.green('✓')} file_content:read       (Files → File content)
       ${pc.green('✓')} library_content:read    (Design systems → Library content)
       ${pc.green('✓')} file_comments:write     (Files → File comments)
  5. Click ${pc.bold('Generate token')} and copy it — ${pc.yellow("you won't be able to see it again")}
`)

    // Token input + immediate validation
    let tokenValid = false
    while (!tokenValid) {
      figmaToken = await p.text({
        message: 'Paste your Figma token here',
        placeholder: 'figd_...',
        hint: 'Stored in your local FIGMA_API_TOKEN env var — never committed to git',
        validate: v => (!v?.trim() ? 'Required — paste the token you just generated' : undefined),
      })
      if (p.isCancel(figmaToken)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }
      figmaToken = figmaToken?.trim()

      spinner.start('Validating token...')
      const valid = await validateFigmaToken(figmaToken)
      if (valid) {
        spinner.stop(pc.green('Token valid ✓'))
        tokenValid = true
      } else {
        spinner.stop(pc.red('Token invalid — check the scopes and try again'))
        figmaToken = undefined
      }
    }

    // Loop: add one file at a time
    let addingFiles = true
    while (addingFiles) {
      const fileLabel = figmaFiles.length === 0 ? 'Paste your Figma file URL (or just the file key)' : 'Add another Figma file URL (or key)'
      const figmaInput = await p.text({
        message: fileLabel,
        placeholder: 'https://www.figma.com/design/ABC123.../My-Design-File',
        hint: figmaFiles.length === 0
          ? 'Open your Figma file in a browser and copy the full URL from the address bar'
          : 'Add files for each area where DS components live (e.g. Core DS, Icons, Patterns)',
        validate: v => (!v?.trim() ? 'Required' : undefined),
      })
      if (p.isCancel(figmaInput)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }

      let fileKey = extractFigmaFileKey(figmaInput.trim())
      if (!fileKey) {
        p.log.warn(`Could not extract a file key — using as-is.`)
        fileKey = figmaInput.trim()
      }

      // Fetch pages and ask which ones contain the master/ready components
      let componentPages
      spinner.start('Fetching pages...')
      const pages = await fetchFigmaPages(fileKey, figmaToken)
      spinner.stop(pages
        ? pc.green(`Found ${pages.length} pages`)
        : pc.yellow('Could not reach Figma — skipping page selection for this file.')
      )

      if (pages?.length) {
        const selected = await p.multiselect({
          message: 'Which pages contain your published DS components?',
          hint: 'Only components on these pages will be added to the registry',
          options: pages.map(name => ({ value: name, label: name })),
          required: false,
        })
        if (p.isCancel(selected)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }
        componentPages = Array.isArray(selected) && selected.length ? selected : undefined

        if (!componentPages) {
          p.log.info('No pages selected — all pages will be included. You can refine this later in drift.config.ts.')
        }
      }

      figmaFiles.push({ key: fileKey, componentPages })

      // Ask whether to add another
      const another = await p.confirm({
        message: `${figmaFiles.length} file${figmaFiles.length > 1 ? 's' : ''} added. Add another Figma file?`,
        initialValue: false,
      })
      if (p.isCancel(another)) { p.cancel('Setup cancelled.'); process.exit(EXIT_CANCELED) }
      addingFiles = another
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
    figmaFiles:    figmaFiles.length ? figmaFiles : undefined,
    dsPackages,
    threshold:     Number(threshold) || 80,
    components,
    framework,
  })
  if (figmaToken) writeEnvLocal(cwd, { figmaToken })
  spinner.stop('drift.config.ts written')

  // ── Step 7: Write AI rules files ─────────────────────────────────────────────
  spinner.start('Writing AI rules files...')
  const rulesFiles = writeAIRulesFiles(cwd, {
    tools:        Array.isArray(aiToolsSelected) ? aiToolsSelected : [],
    components,
    storybookUrl: storybookUrl || '',
    figmaFiles:   figmaFiles.length ? figmaFiles : undefined,
  })
  const skillFiles = writeClaudeSkills(cwd)
  spinner.stop(`Written: ${rulesFiles.join(', ')}${skillFiles.length ? ` + ${skillFiles.length} Claude skills` : ''}`)

  // ── Step 8: Install @catchdrift/overlay ──────────────────────────────────────
  const pkgJson = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
  const alreadyInstalled = !!(
    pkgJson.dependencies?.['@catchdrift/overlay'] ||
    pkgJson.devDependencies?.['@catchdrift/overlay']
  )

  if (!alreadyInstalled) {
    spinner.start('Installing @catchdrift/overlay...')
    const pkgManager =
      existsSync(join(cwd, 'pnpm-lock.yaml')) ? 'pnpm add' :
      existsSync(join(cwd, 'yarn.lock'))      ? 'yarn add' : 'npm install'
    try {
      execSync(`${pkgManager} @catchdrift/overlay`, { cwd, stdio: 'ignore' })
      spinner.stop('@catchdrift/overlay installed')
    } catch {
      spinner.stop(pc.yellow('@catchdrift/overlay install failed — run manually: npm install @catchdrift/overlay'))
    }
  }

  // ── Step 9: Patch app entry point ────────────────────────────────────────────
  spinner.start('Adding DriftOverlay to app entry...')
  const patched = patchAppEntry(cwd, framework)
  spinner.stop(patched
    ? `Patched ${patched}`
    : 'Could not auto-patch — see manual step below')

  // ── Step 10: GitHub Actions ──────────────────────────────────────────────────
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

  // ── Step 11: Summary ─────────────────────────────────────────────────────────
  console.log('')
  p.outro(pc.green('Drift is set up ✓'))

  // ── What was set up (human-readable) ────────────────────────────────────────
  const patchedShort = patched ? patched.replace(cwd + '/', '').replace(cwd, '') : null
  console.log(`
${pc.bold('What was set up:')}
  ${pc.green('✓')} Overlay added to your app ${patchedShort ? pc.dim('(' + patchedShort + ')') : pc.yellow('— see manual step below')}
  ${pc.green('✓')} AI rules written ${pc.dim('— your AI tools will use DS components by default')}
  ${pc.green('✓')} Claude skills added ${pc.dim('— /drift-sync, /drift-scaffold, /drift-context, ...')}
  ${addCI ? pc.green('✓') + ' GitHub check added ' + pc.dim('— every PR will show a coverage score') : pc.dim('○  GitHub check skipped')}`)

  // ── Immediate next step — specific to what was configured ───────────────────
  console.log(`\n${pc.bold('Do this now:')}`)

  if (figmaFiles.length > 0 && skillFiles.length > 0) {
    console.log(`
  Your components are in Figma. Pull them into the registry now:

  ${pc.cyan('1.')} Open ${pc.bold('Claude Code')} in this project folder
  ${pc.cyan('2.')} Run: ${pc.blue('/drift-sync figma')}
       This reads your Figma file and registers all your DS components.
  ${pc.cyan('3.')} Run: ${pc.bold('npm run dev')}  →  press ${pc.bold('D')}  →  see live coverage
`)
  } else if (sources.includes('storybook') && Object.keys(components).length > 0) {
    console.log(`
  Your components were imported from Storybook ✓

  ${pc.cyan('1.')} Run: ${pc.bold('npm run dev')}
  ${pc.cyan('2.')} Press ${pc.bold('D')} to open the Drift overlay — you should see real coverage.
`)
  } else if (dsPackages?.length) {
    console.log(`
  ${pc.cyan('1.')} Run: ${pc.bold('npx catchdrift sync')}
       Scans your codebase for imports from ${dsPackages.join(', ')} and registers them.
  ${pc.cyan('2.')} Run: ${pc.bold('npm run dev')}  →  press ${pc.bold('D')}  →  see live coverage
`)
  } else {
    console.log(`
  ${pc.cyan('1.')} Run: ${pc.bold('npm run dev')}  →  press ${pc.bold('D')}  →  the overlay opens
       Coverage will show 0% until you register your DS components.
  ${pc.cyan('2.')} Add your components to ${pc.bold('drift.config.ts')} or connect a source:
       • Figma:  re-run ${pc.bold('npx catchdrift init')} and select Figma
       • npm:    add ${pc.bold('dsPackages')} to drift.config.ts, then run ${pc.bold('npx catchdrift sync')}
`)
  }

  // ── Ongoing daily commands ───────────────────────────────────────────────────
  console.log(`${pc.bold('Daily workflow (Claude Code):')}
  ${pc.blue('/drift-context')}     Check DS health — run this before starting work
  ${pc.blue('/drift-scaffold')}    Build a new screen using only DS components
  ${pc.blue('/drift-sync')}        Update registry after Figma or Storybook changes
  ${pc.blue('npx catchdrift check')}   Check coverage before submitting a PR
`)

  if (!sources.includes('storybook') && !storybook.found) {
    console.log(`${pc.yellow('Note:')} Storybook isn't set up yet. Run ${pc.bold('npx storybook@latest init')} when ready,`)
    console.log(`  then re-run ${pc.bold('npx catchdrift init')} to complete the coverage loop.\n`)
  }

  if (!patchedShort) {
    console.log(`${pc.yellow('Manual step needed')} — add the overlay to your app entry point:`)
    console.log(`  import { DriftOverlay } from '@catchdrift/overlay'`)
    console.log(`  import driftConfig from './drift.config'`)
    console.log(`  // inside your root render, as the last child:`)
    console.log(`  {import.meta.env.DEV && <DriftOverlay config={driftConfig} />}\n`)
  }

  console.log(pc.dim('Docs: https://catchdrift.ai  ·  Issues: https://github.com/dyoon92/design-drift/issues'))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractFigmaFileKey(input) {
  // Matches: figma.com/design/KEY/... or figma.com/file/KEY/...
  const match = input.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

async function validateFigmaToken(token) {
  try {
    // /me requires current_user:read which we don't ask for, so we expect a 403
    // with a scope error message — that still means the token itself is valid.
    // A 401 means the token is completely invalid.
    const res = await fetch('https://api.figma.com/v1/me', {
      headers: { 'X-Figma-Token': token },
    })
    return res.status !== 401
  } catch {
    return false
  }
}

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
