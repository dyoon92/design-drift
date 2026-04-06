/**
 * catchdrift check
 * ────────────────
 * Thin wrapper around drift-check.mjs that ships with the CLI.
 * Allows: npx @catchdrift/cli check --url http://localhost:4173 --threshold 80
 *
 * All flags pass through to drift-check.mjs:
 *   --url <url>         App URL (default: http://localhost:5173)
 *   --threshold <n>     Min DS coverage % (default: 80, or from drift.config.ts)
 *   --routes <r1,r2>    Routes to scan (default: /)
 *   --strict            Exit 1 on any violation
 *   --json              Output JSON
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'
import { spawn } from 'child_process'
import pc from 'picocolors'

const __dirname = dirname(fileURLToPath(import.meta.url))

// drift-check.mjs ships in the CLI package under scripts/
const CHECKER = resolve(__dirname, '../../scripts/drift-check.mjs')

export async function check(argv) {
  // Warn if running via npx (ephemeral cache) — Playwright browser reinstalls on every npx clear
  const isNpx = process.env.npm_execpath?.includes('_npx') || process.argv[1]?.includes('_npx')
  if (isNpx) {
    console.log(pc.dim(
      'Tip: install locally for faster runs and persistent Playwright cache:\n' +
      '  npm install -D catchdrift\n' +
      '  npx catchdrift check  (uses local install)\n'
    ))
  }

  // Read threshold from drift.config.ts if not passed as flag
  const hasThreshold = argv.includes('--threshold')
  if (!hasThreshold) {
    const configThreshold = readConfigThreshold(process.cwd())
    if (configThreshold) argv = ['--threshold', String(configThreshold), ...argv]
  }

  if (!existsSync(CHECKER)) {
    console.error(pc.red('drift-check script not found. This is a bug — please report it.'))
    console.error(pc.dim('https://github.com/dyoon92/design-drift/issues'))
    process.exit(1)
  }

  // Spawn as a child process so it inherits stdio (spinner, color output)
  const child = spawn('node', [CHECKER, ...argv], {
    stdio: 'inherit',
    env: process.env,
  })

  child.on('exit', code => process.exit(code ?? 0))
  child.on('error', err => {
    console.error(pc.red('Failed to run drift check: ' + err.message))
    process.exit(1)
  })
}

function readConfigThreshold(cwd) {
  // Quick regex parse — avoids a full TS import
  const candidates = [
    resolve(cwd, 'drift.config.ts'),
    resolve(cwd, 'src/ds-coverage/config.ts'),
  ]
  for (const f of candidates) {
    if (!existsSync(f)) continue
    const src = readFileSync(f, 'utf8')
    const m = src.match(/threshold:\s*(\d+)/)
    if (m) return Number(m[1])
  }
  return null
}
