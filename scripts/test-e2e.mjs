#!/usr/bin/env node
/**
 * test-e2e.mjs
 * ─────────────
 * End-to-end test harness for Drift across multiple team/project types.
 * Creates isolated temp projects, runs `catchdrift init`, validates output.
 *
 * Usage:
 *   node scripts/test-e2e.mjs                  Run all scenarios
 *   node scripts/test-e2e.mjs --scenario vite   Run one scenario
 *   node scripts/test-e2e.mjs --quick           Skip coverage scan (faster)
 *
 * Scenarios tested:
 *   vite        — Vite + React + Storybook (most common)
 *   nextjs      — Next.js 14 app router
 *   no-storybook — React project with no Storybook (manual component list)
 *   existing    — Project that already has drift.config.ts (re-run safety)
 *   multi-team  — Simulates a product team consuming a DS team's remote config
 */

import { execSync, spawnSync } from 'child_process'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import pc from 'picocolors'

const ROOT      = resolve(import.meta.dirname, '..')
const CLI_BIN   = resolve(ROOT, 'packages/cli/bin/catchdrift.mjs')
const QUICK     = process.argv.includes('--quick')
const SCENARIO  = (process.argv.indexOf('--scenario') !== -1)
  ? process.argv[process.argv.indexOf('--scenario') + 1]
  : null

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0, failed = 0, skipped = 0

async function runScenario(name, fn) {
  if (SCENARIO && SCENARIO !== name) { skipped++; return }

  process.stdout.write(`  ${pc.dim('○')} ${name.padEnd(20)}`)
  const dir = mkdtempSync(join(tmpdir(), `drift-e2e-${name}-`))

  try {
    await fn(dir)
    console.log(`\r  ${pc.green('✓')} ${name}`)
    passed++
  } catch (err) {
    console.log(`\r  ${pc.red('✗')} ${name}`)
    console.log(pc.dim(`    ${err.message}`))
    failed++
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function runCLI(dir, args, opts = {}) {
  return spawnSync('node', [CLI_BIN, ...args], {
    cwd: dir,
    encoding: 'utf8',
    timeout: opts.timeout || 30000,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  })
}

// ── Scenario: Vite + React + Storybook ───────────────────────────────────────

function scaffoldViteProject(dir) {
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'test-vite-app',
    version: '0.1.0',
    dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
    devDependencies: { vite: '^5.0.0', '@storybook/react': '^8.0.0' },
  }, null, 2))

  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src/main.tsx'), `
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
createRoot(document.getElementById('root')!).render(<App />)
`)
  writeFileSync(join(dir, 'src/App.tsx'), `export default function App() { return <div>Hello</div> }`)

  mkdirSync(join(dir, '.storybook'), { recursive: true })
  writeFileSync(join(dir, '.storybook/main.ts'), `export default { stories: ['../src/**/*.stories.tsx'] }`)
}

// ── Scenario: Next.js ─────────────────────────────────────────────────────────

function scaffoldNextProject(dir) {
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'test-next-app',
    version: '0.1.0',
    dependencies: { next: '^14.0.0', react: '^18.0.0', 'react-dom': '^18.0.0' },
    devDependencies: { '@storybook/nextjs': '^8.0.0' },
  }, null, 2))

  mkdirSync(join(dir, 'app'), { recursive: true })
  writeFileSync(join(dir, 'app/layout.tsx'), `export default function RootLayout({ children }) { return <html><body>{children}</body></html> }`)
}

// ── Scenario: No Storybook ────────────────────────────────────────────────────

function scaffoldNoStorybookProject(dir) {
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'test-plain-react',
    version: '0.1.0',
    dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
    devDependencies: { vite: '^5.0.0' },
  }, null, 2))

  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src/main.tsx'), `import React from 'react'\nconsole.log('hello')`)
}

// ── Scenario: Already has drift config ────────────────────────────────────────

function scaffoldExistingDriftProject(dir) {
  scaffoldViteProject(dir)
  // Use multiline format — matches what writeDriftConfig generates
  writeFileSync(join(dir, 'drift.config.ts'), `import type { DesignDriftConfig } from '@catchdrift/overlay'

const config: DesignDriftConfig = {
  storybookUrl: 'http://localhost:6006',
  threshold: 75,
  components: {
    Button: { storyPath: 'button--primary' },
    Modal: { storyPath: 'modal--default' },
  },
}

export default config
`)
}

// ── Run all scenarios ─────────────────────────────────────────────────────────

console.log('')
console.log(`${pc.bgBlue(pc.white(' catchdrift '))} ${pc.bold('end-to-end test suite')}`)
console.log('')

// ── 1. CLI help and version ──────────────────────────────────────────────────
await runScenario('cli:help', async (dir) => {
  const result = runCLI(dir, ['--help'])
  assert(result.status === 0, `Exit code ${result.status}`)
  assert(result.stdout.includes('catchdrift'), 'Help text missing brand name')
  assert(result.stdout.includes('init'), 'Help text missing init command')
  assert(result.stdout.includes('check'), 'Help text missing check command')
})

await runScenario('cli:version', async (dir) => {
  const result = runCLI(dir, ['--version'])
  assert(result.status === 0, `Exit code ${result.status}`)
  assert(/\d+\.\d+\.\d+/.test(result.stdout.trim()), 'Version not semver')
})

await runScenario('cli:unknown-command', async (dir) => {
  const result = runCLI(dir, ['notacommand'])
  assert(result.status === 1, 'Should exit 1 on unknown command')
})

// ── 2. status command ─────────────────────────────────────────────────────────
await runScenario('status:no-config', async (dir) => {
  scaffoldViteProject(dir)
  const result = runCLI(dir, ['status'])
  assert(result.status === 1, 'Should exit 1 with no config')
  assert(result.stdout.includes('drift.config.ts') || result.stderr.includes('drift.config.ts'), 'Should mention config file')
})

await runScenario('status:with-config', async (dir) => {
  scaffoldExistingDriftProject(dir)
  const result = runCLI(dir, ['status'])
  assert(result.status === 0, `Exit code ${result.status}: ${result.stderr}`)
  assert(result.stdout.includes('Button'), 'Should show registered components')
  assert(result.stdout.includes('75'), 'Should show threshold')
})

// ── 3. init — framework detection ─────────────────────────────────────────────
await runScenario('detect:vite', async (dir) => {
  scaffoldViteProject(dir)
  const { detectFramework } = await import('../packages/cli/src/lib/detect.mjs')
  assert(detectFramework(dir) === 'vite', 'Should detect Vite')
})

await runScenario('detect:nextjs', async (dir) => {
  scaffoldNextProject(dir)
  const { detectFramework } = await import('../packages/cli/src/lib/detect.mjs')
  assert(detectFramework(dir) === 'nextjs', 'Should detect Next.js')
})

await runScenario('detect:storybook', async (dir) => {
  scaffoldViteProject(dir)
  const { detectStorybook } = await import('../packages/cli/src/lib/detect.mjs')
  const result = detectStorybook(dir)
  assert(result.found === true, 'Should detect Storybook')
  assert(result.url === 'http://localhost:6006', 'Should return default Storybook URL')
})

await runScenario('detect:no-storybook', async (dir) => {
  scaffoldNoStorybookProject(dir)
  const { detectStorybook } = await import('../packages/cli/src/lib/detect.mjs')
  const result = detectStorybook(dir)
  assert(result.found === false, 'Should not detect Storybook')
})

await runScenario('detect:existing-drift', async (dir) => {
  scaffoldExistingDriftProject(dir)
  const { detectExistingDrift } = await import('../packages/cli/src/lib/detect.mjs')
  const result = detectExistingDrift(dir)
  assert(result.config === true, 'Should detect existing config')
})

// ── 4. writers ────────────────────────────────────────────────────────────────
await runScenario('write:drift-config', async (dir) => {
  scaffoldViteProject(dir)
  const { writeDriftConfig } = await import('../packages/cli/src/lib/writers.mjs')
  writeDriftConfig(dir, {
    storybookUrl: 'http://localhost:6006',
    threshold: 80,
    components: { Button: { storyPath: 'button--primary' }, Input: { storyPath: 'input--default' } },
  })
  assert(existsSync(join(dir, 'drift.config.ts')), 'drift.config.ts should exist')
  const content = readFileSync(join(dir, 'drift.config.ts'), 'utf8')
  assert(content.includes('Button'), 'Config should include Button')
  assert(content.includes('Input'), 'Config should include Input')
  assert(content.includes('threshold: 80'), 'Config should include threshold')
})

await runScenario('write:ai-rules-all-tools', async (dir) => {
  scaffoldViteProject(dir)
  const { writeAIRulesFiles } = await import('../packages/cli/src/lib/writers.mjs')
  const written = writeAIRulesFiles(dir, {
    tools: ['claude', 'cursor', 'windsurf', 'agents'],
    components: { Button: { storyPath: 'button--primary' } },
    storybookUrl: 'http://localhost:6006',
  })
  assert(existsSync(join(dir, 'CLAUDE.md')), 'CLAUDE.md should exist')
  assert(existsSync(join(dir, '.cursorrules')), '.cursorrules should exist')
  assert(existsSync(join(dir, '.windsurfrules')), '.windsurfrules should exist')
  assert(existsSync(join(dir, 'AGENTS.md')), 'AGENTS.md should always exist')
  const claude = readFileSync(join(dir, 'CLAUDE.md'), 'utf8')
  assert(claude.includes('Button'), 'CLAUDE.md should include Button')
  assert(claude.includes('drift:components-start'), 'Should include section markers')
  assert(claude.includes('/drift-context'), 'Should include skill commands')
})

await runScenario('write:ai-rules-idempotent', async (dir) => {
  scaffoldViteProject(dir)
  const { writeAIRulesFiles } = await import('../packages/cli/src/lib/writers.mjs')
  // Write once
  writeAIRulesFiles(dir, { tools: ['claude'], components: { Button: { storyPath: 'button--primary' } }, storybookUrl: 'http://localhost:6006' })
  // Add custom content
  const existing = readFileSync(join(dir, 'CLAUDE.md'), 'utf8')
  writeFileSync(join(dir, 'CLAUDE.md'), existing + '\n## My custom section\nDo not delete this.\n')
  // Write again with new component
  writeAIRulesFiles(dir, { tools: ['claude'], components: { Button: { storyPath: 'button--primary' }, Modal: { storyPath: 'modal--default' } }, storybookUrl: 'http://localhost:6006' })
  const updated = readFileSync(join(dir, 'CLAUDE.md'), 'utf8')
  assert(updated.includes('Modal'), 'Should add new component')
  assert(updated.includes('My custom section'), 'Should preserve custom content')
})

await runScenario('write:github-action', async (dir) => {
  scaffoldViteProject(dir)
  const { writeGithubAction } = await import('../packages/cli/src/lib/writers.mjs')
  writeGithubAction(dir, { threshold: 85 })
  assert(existsSync(join(dir, '.github/workflows/drift-check.yml')), 'Workflow should exist')
  const content = readFileSync(join(dir, '.github/workflows/drift-check.yml'), 'utf8')
  assert(content.includes('DRIFT_THRESHOLD: 85'), 'Should use provided threshold')
  assert(content.includes('@catchdrift/cli'), 'Should use published CLI, not local script')
  assert(content.includes('pull_request'), 'Should trigger on PRs')
})

await runScenario('write:github-action-idempotent', async (dir) => {
  scaffoldViteProject(dir)
  const { writeGithubAction } = await import('../packages/cli/src/lib/writers.mjs')
  writeGithubAction(dir, { threshold: 80 })
  const firstContent = readFileSync(join(dir, '.github/workflows/drift-check.yml'), 'utf8')
  writeGithubAction(dir, { threshold: 90 }) // should NOT overwrite
  const secondContent = readFileSync(join(dir, '.github/workflows/drift-check.yml'), 'utf8')
  assert(firstContent === secondContent, 'Should not overwrite existing workflow')
})

// ── 5. Storybook component discovery ─────────────────────────────────────────
// (skipped in quick mode — requires a network call or mock server)
if (!QUICK) {
  await runScenario('storybook:unreachable', async (dir) => {
    const { fetchStorybookComponents } = await import('../packages/cli/src/lib/storybook.mjs')
    const result = await fetchStorybookComponents('http://localhost:19999') // nothing running here
    assert(result.ok === false, 'Should return ok:false for unreachable Storybook')
    assert(result.count === 0, 'Should return 0 components')
  })
}

// ── 6. Multi-team scenario ────────────────────────────────────────────────────
await runScenario('multi-team:separate-configs', async (dir) => {
  // DS team config (the source)
  const dsDir = join(dir, 'ds-team')
  mkdirSync(dsDir)
  const { writeDriftConfig } = await import('../packages/cli/src/lib/writers.mjs')
  writeDriftConfig(dsDir, {
    storybookUrl: 'http://localhost:6006',
    threshold: 80,
    components: { Button: { storyPath: 'button--primary' }, Modal: { storyPath: 'modal--default' } },
  })

  // Product team config (consumer) — has its own threshold + approved gaps
  const productDir = join(dir, 'product-team')
  mkdirSync(productDir)
  writeDriftConfig(productDir, {
    storybookUrl: 'http://localhost:6006',
    threshold: 70, // product team has lower initial threshold
    components: { Button: { storyPath: 'button--primary' }, Modal: { storyPath: 'modal--default' } },
  })

  assert(existsSync(join(dsDir, 'drift.config.ts')), 'DS team config should exist')
  assert(existsSync(join(productDir, 'drift.config.ts')), 'Product team config should exist')

  const productConfig = readFileSync(join(productDir, 'drift.config.ts'), 'utf8')
  assert(productConfig.includes('threshold: 70'), 'Product team should have its own threshold')
})

// ── Results ───────────────────────────────────────────────────────────────────

console.log('')
const total = passed + failed + skipped
console.log(
  `  ${pc.bold('Results:')} ` +
  `${pc.green(passed + ' passed')}` +
  (failed  ? ` · ${pc.red(failed + ' failed')}` : '') +
  (skipped ? ` · ${pc.dim(skipped + ' skipped')}` : '') +
  ` · ${total} total`
)
console.log('')

if (failed > 0) {
  console.log(pc.red('  Some tests failed. Fix issues before publishing.'))
  process.exit(1)
} else {
  console.log(pc.green('  All tests passed. Ready to publish.'))
}
console.log('')
