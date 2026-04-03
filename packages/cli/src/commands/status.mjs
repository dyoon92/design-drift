/**
 * catchdrift status
 * ─────────────────
 * Quick read-only snapshot from drift.config.ts — no build, no network.
 * Shows: component count, threshold, Storybook URL, gaps vs. registry.
 */

import pc from 'picocolors'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

export async function status(_argv) {
  const cwd = process.cwd()

  const candidates = [
    resolve(cwd, 'drift.config.ts'),
    resolve(cwd, 'src/ds-coverage/config.ts'),
  ]

  let configPath = candidates.find(f => existsSync(f))
  if (!configPath) {
    console.error(pc.yellow('No drift.config.ts found.'))
    console.log(`Run ${pc.bold('npx catchdrift init')} to set up Drift.`)
    process.exit(1)
  }

  const src = readFileSync(configPath, 'utf8')

  // Quick regex parse for display (not a full TS eval)
  const storybookUrl = (src.match(/storybookUrl:\s*['"]([^'"]+)['"]/) || [])[1] || 'not set'
  const chromaticUrl = (src.match(/chromaticUrl:\s*['"]([^'"]+)['"]/) || [])[1] || null
  const figmaFileKey = (src.match(/figmaFileKey:\s*['"]([^'"]+)['"]/) || [])[1] || null
  const threshold    = (src.match(/threshold:\s*(\d+)/) || [])[1] || '80'

  // Count component entries
  const RESERVED = new Set(['config', 'components', 'approvedGaps'])
  const componentMatches = [...src.matchAll(/^\s{2,4}(\w+):\s*\{/gm)]
  const componentCount = componentMatches.filter(m => !RESERVED.has(m[1])).length

  // Count approved gaps — count top-level keys inside approvedGaps block
  // Use approvedAt as a reliable per-entry marker (one per gap entry)
  const approvedCount = (src.match(/approvedAt:/g) || []).length

  // Count missing storyPaths (no storyPath key)
  const missingStory = [...src.matchAll(/(\w+):\s*\{\s*\}/g)].length

  console.log('')
  console.log(`${pc.bgBlue(pc.white(' catchdrift '))} ${pc.dim('status')}`)
  console.log('')
  console.log(`  ${pc.dim('Config:')}       ${configPath.replace(cwd, '.')}`)
  console.log(`  ${pc.dim('Storybook:')}    ${storybookUrl}`)
  if (chromaticUrl) console.log(`  ${pc.dim('Chromatic:')}    ${chromaticUrl}`)
  if (figmaFileKey) console.log(`  ${pc.dim('Figma:')}        figma.com/design/${figmaFileKey}`)
  console.log(`  ${pc.dim('Threshold:')}    ${threshold}%`)
  console.log('')
  // Extract component names for display
  const componentNames = componentMatches.map(m => m[1]).filter(n => !RESERVED.has(n))
  const displayNames = componentNames.slice(0, 8).join(', ') + (componentNames.length > 8 ? ` +${componentNames.length - 8} more` : '')

  console.log(`  ${pc.green('✓')} ${pc.bold(componentCount)} DS components: ${pc.dim(displayNames)}`)
  if (approvedCount) console.log(`  ${pc.dim('○')} ${approvedCount} approved exceptions`)
  if (missingStory)  console.log(`  ${pc.yellow('!')} ${missingStory} components missing storyPath`)
  console.log('')

  if (missingStory) {
    console.log(pc.dim('  Run `npx catchdrift init` or /drift-sync to fill missing story paths.'))
    console.log('')
  }

  console.log(pc.dim('  Run `npx catchdrift check` to measure live coverage (requires running app).'))
  console.log('')
}
