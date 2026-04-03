/**
 * catchdrift spec
 * ───────────────
 * Validate, list, and manage .drift-spec.md files.
 *
 * Usage:
 *   catchdrift spec                   List all specs in the project
 *   catchdrift spec validate          Validate all specs against implementation
 *   catchdrift spec validate <file>   Validate one spec file
 *   catchdrift spec show <file>       Show parsed spec details
 */

import pc from 'picocolors'
import { existsSync, readFileSync } from 'fs'
import { resolve, relative, basename } from 'path'
import { readSpec, findSpecs, validateSpec, formatSpecSummary } from '../lib/spec.mjs'

export async function spec(argv) {
  const cwd     = process.cwd()
  const sub     = argv[0]
  const srcDir  = resolve(cwd, 'src')

  if (!sub || sub === 'list') {
    return listSpecs(cwd)
  }

  if (sub === 'validate') {
    const target = argv[1]
    if (target) {
      return validateOne(resolve(cwd, target), srcDir, cwd)
    }
    return validateAll(cwd, srcDir)
  }

  if (sub === 'show') {
    const target = argv[1]
    if (!target) {
      console.error(pc.red('Usage: catchdrift spec show <file>'))
      process.exit(1)
    }
    return showSpec(resolve(cwd, target))
  }

  console.error(pc.red(`Unknown spec sub-command: ${sub}`))
  console.log(pc.dim('Usage: catchdrift spec [list|validate|show]'))
  process.exit(1)
}

// ── List ──────────────────────────────────────────────────────────────────────

function listSpecs(cwd) {
  const specs = findSpecs(cwd)

  console.log('')
  console.log(`${pc.bgBlue(pc.white(' catchdrift '))} ${pc.dim('specs')}`)
  console.log('')

  if (specs.length === 0) {
    console.log(pc.dim('  No .drift-spec.md files found.'))
    console.log('')
    console.log(`  Create one with ${pc.bold('/drift-prd "your feature description"')} (Claude Code)`)
    console.log(`  or run ${pc.bold('catchdrift spec validate')} to auto-generate from existing config.`)
    console.log('')
    return
  }

  const STATUS_ICON = { approved: pc.green('✓'), shipped: pc.green('✓'), draft: pc.yellow('○'), review: pc.blue('◑') }

  for (const path of specs) {
    const s = readSpec(path)
    if (!s) { console.log(pc.dim(`  ? ${relative(cwd, path)} (unparseable)`)); continue }
    const { screen, required, gaps, pending, status, threshold } = formatSpecSummary(s)
    const icon = STATUS_ICON[status] || pc.dim('○')
    const gapLabel = pending > 0 ? pc.yellow(` · ${pending} gap${pending !== 1 ? 's' : ''} unapproved`) : ''
    console.log(`  ${icon} ${pc.bold(screen.padEnd(28))} ${pc.dim(`${required} required · threshold ${threshold}%`)}${gapLabel}`)
    console.log(pc.dim(`     ${relative(cwd, path)}`))
  }

  console.log('')
  console.log(pc.dim(`  ${specs.length} spec${specs.length !== 1 ? 's' : ''} found.`))
  console.log(pc.dim('  Run `catchdrift spec validate` to check against implementation.'))
  console.log('')
}

// ── Validate one ──────────────────────────────────────────────────────────────

function validateOne(specPath, srcDir, cwd) {
  if (!existsSync(specPath)) {
    console.error(pc.red(`Spec not found: ${specPath}`))
    process.exit(1)
  }

  const spec = readSpec(specPath)
  if (!spec) {
    console.error(pc.red(`Could not parse spec: ${specPath}`))
    process.exit(1)
  }

  const summary = formatSpecSummary(spec)
  const result  = validateSpec(spec, srcDir)

  console.log('')
  console.log(`${pc.bgBlue(pc.white(' catchdrift '))} ${pc.dim('spec validate')}`)
  console.log('')
  console.log(`  ${pc.bold(summary.screen)}`)
  console.log(`  ${pc.dim(relative(cwd, specPath))}`)
  console.log(`  ${pc.dim('Status:')}    ${summary.status}  ·  threshold ${summary.threshold}%`)
  console.log('')

  const { required } = spec.components || {}
  if (!required?.length) {
    console.log(pc.dim('  No required components declared — nothing to validate.'))
    console.log('')
    return
  }

  // Show per-component status
  for (const name of required) {
    const found = result.found.includes(name)
    const icon  = found ? pc.green('✓') : pc.red('✗')
    console.log(`  ${icon} ${name}`)
  }

  if (result.warnings.length) {
    console.log('')
    for (const w of result.warnings) {
      console.log(`  ${pc.yellow('!')} ${w.message}`)
    }
  }

  console.log('')
  const pct = result.coverage
  const bar = buildBar(pct, 30)
  const pctColor = pct >= summary.threshold ? pc.green : pc.red
  console.log(`  Coverage: ${pctColor(pct + '%')} ${pc.dim(bar)} ${pc.dim('threshold ' + summary.threshold + '%')}`)
  console.log('')

  if (result.ok) {
    console.log(pc.green('  ✓ Spec satisfied — all required components found.'))
  } else {
    const errCount = result.violations.filter(v => v.severity === 'error').length
    console.log(pc.red(`  ✗ ${errCount} required component${errCount !== 1 ? 's' : ''} missing from implementation.`))
    console.log('')
    for (const v of result.violations.filter(v => v.severity === 'error')) {
      console.log(pc.dim(`    → ${v.message}`))
    }
  }

  console.log('')
  if (!result.ok) process.exit(1)
}

// ── Validate all ──────────────────────────────────────────────────────────────

function validateAll(cwd, srcDir) {
  const specs = findSpecs(cwd)

  console.log('')
  console.log(`${pc.bgBlue(pc.white(' catchdrift '))} ${pc.dim('spec validate — all specs')}`)
  console.log('')

  if (specs.length === 0) {
    console.log(pc.dim('  No specs found. Run /drift-prd to create one.'))
    console.log('')
    return
  }

  let passed = 0, failed = 0, warned = 0

  for (const path of specs) {
    const s = readSpec(path)
    if (!s) { console.log(pc.dim(`  ? ${relative(cwd, path)} — unparseable`)); continue }

    const summary = formatSpecSummary(s)
    const result  = validateSpec(s, srcDir)

    if (result.ok && result.warnings.length === 0) {
      console.log(`  ${pc.green('✓')} ${summary.screen.padEnd(30)} ${pc.dim(result.coverage + '%')}`)
      passed++
    } else if (result.ok && result.warnings.length > 0) {
      console.log(`  ${pc.yellow('!')} ${summary.screen.padEnd(30)} ${pc.yellow(result.coverage + '%')} ${pc.dim('· ' + result.warnings.length + ' warning(s)')}`)
      warned++
    } else {
      const errCount = result.violations.filter(v => v.severity === 'error').length
      console.log(`  ${pc.red('✗')} ${summary.screen.padEnd(30)} ${pc.red(result.coverage + '%')} ${pc.dim('· ' + errCount + ' missing')}`)
      for (const v of result.violations.filter(v => v.severity === 'error')) {
        console.log(pc.dim(`      Missing: <${v.component}>`))
      }
      failed++
    }
  }

  console.log('')
  console.log(
    `  ${pc.bold('Results:')} ` +
    `${pc.green(passed + ' passed')}` +
    (warned  ? ` · ${pc.yellow(warned + ' warned')}` : '') +
    (failed  ? ` · ${pc.red(failed + ' failed')}`  : '') +
    ` · ${specs.length} total`
  )
  console.log('')

  if (failed > 0) {
    console.log(pc.red('  Some specs failed. Fix gaps or approve them in the spec file.'))
    console.log('')
    process.exit(1)
  } else {
    console.log(pc.green('  All specs satisfied.'))
    console.log('')
  }
}

// ── Show ──────────────────────────────────────────────────────────────────────

function showSpec(specPath) {
  const s = readSpec(specPath)
  if (!s) { console.error(pc.red('Could not parse spec: ' + specPath)); process.exit(1) }

  const req  = s.components?.required || []
  const opt  = s.components?.optional || []
  const gaps = s.components?.gaps || []

  console.log('')
  console.log(`${pc.bgBlue(pc.white(' catchdrift '))} ${pc.dim('spec show')}`)
  console.log('')
  console.log(`  ${pc.bold(s.screen || 'Unnamed spec')}`)
  if (s.feature) console.log(`  ${pc.dim('Feature:')}   ${s.feature}`)
  if (s.owner)   console.log(`  ${pc.dim('Owner:')}     ${s.owner}`)
  console.log(`  ${pc.dim('Status:')}    ${s.status || 'draft'}`)
  console.log(`  ${pc.dim('Threshold:')} ${s.threshold || 80}%`)
  console.log(`  ${pc.dim('Version:')}   drift-spec ${s['drift-spec'] || '1.0'}`)
  console.log('')

  if (req.length) {
    console.log(`  ${pc.bold('Required components')} (${req.length}):`)
    req.forEach(n => console.log(`    ${pc.green('•')} ${n}`))
    console.log('')
  }

  if (opt.length) {
    console.log(`  ${pc.bold('Optional')} (${opt.length}):`)
    opt.forEach(n => console.log(`    ${pc.dim('•')} ${n}`))
    console.log('')
  }

  if (gaps.length) {
    console.log(`  ${pc.bold('Gaps')} (${gaps.length}):`)
    gaps.forEach(g => {
      const icon = g.approved ? pc.green('✓ approved') : pc.yellow('○ pending')
      console.log(`    ${icon}  ${g.name} — ${g.description || ''}`)
    })
    console.log('')
  }

  if (s.intent) {
    console.log(`  ${pc.bold('Intent:')}`)
    console.log(`  ${pc.dim(s.intent.trim())}`)
    console.log('')
  }
}

// ── Util ─────────────────────────────────────────────────────────────────────

function buildBar(pct, width) {
  const filled = Math.round((pct / 100) * width)
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']'
}
