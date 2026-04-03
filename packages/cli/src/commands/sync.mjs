/**
 * catchdrift sync
 * ───────────────
 * Scans the project's imports for components from dsPackages and
 * auto-populates drift.config.ts — no manual component registration needed.
 *
 * Usage:
 *   npx catchdrift sync
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { spawn } from 'child_process'
import pc from 'picocolors'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SYNCER = resolve(__dirname, '../../../scripts/drift-sync.mjs')

export async function sync(_argv) {
  if (!existsSync(SYNCER)) {
    console.error(pc.red('drift-sync script not found. This is a bug — please report it.'))
    console.error(pc.dim('https://github.com/dyoon92/design-drift/issues'))
    process.exit(1)
  }

  const child = spawn('node', [SYNCER], {
    stdio: 'inherit',
    env: process.env,
    cwd: process.cwd(),
  })

  child.on('exit', code => process.exit(code ?? 0))
  child.on('error', err => {
    console.error(pc.red('Failed to run drift sync: ' + err.message))
    process.exit(1)
  })
}
