#!/usr/bin/env node
/**
 * drift-sync
 * ─────────────────────────────────────────────────────────────────────────────
 * Scans your codebase for import statements from your DS package(s) and
 * auto-populates config.components — so you never have to register components
 * manually.
 *
 * How it works:
 *   1. Reads `dsPackages` from src/ds-coverage/config.ts
 *   2. Walks src/ looking for `import { Button, Modal } from '@your/package'`
 *   3. Collects every PascalCase name (React components)
 *   4. Writes them into the `components: {}` block in config.ts
 *
 * Run this whenever you add or remove components from your DS package:
 *   npm run drift-sync
 *
 * The generated storyPath values are best-guess slugs. If you have a Storybook
 * site, update them to point to real story IDs — or leave them blank and Drift
 * will skip the "Open in Storybook" link for that component.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dir = fileURLToPath(new URL('.', import.meta.url))
const ROOT  = resolve(__dir, '..')

// ─── Read config ─────────────────────────────────────────────────────────────

const configPath = join(ROOT, 'src/ds-coverage/config.ts')
let configSrc

try {
  configSrc = readFileSync(configPath, 'utf8')
} catch {
  console.error('[drift-sync] Could not read src/ds-coverage/config.ts. Make sure you\'re running this from the project root.')
  process.exit(1)
}

// Extract dsPackages array from config source
const pkgMatch = configSrc.match(/dsPackages\s*:\s*\[([\s\S]*?)\]/)
const dsPackages = pkgMatch
  ? [...pkgMatch[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map(m => m[1])
  : []

if (dsPackages.length === 0) {
  console.log(`
[drift-sync] No dsPackages found in config.ts.

Add this to src/ds-coverage/config.ts:

  dsPackages: ['@your/component-library'],

Then run npm run drift-sync again.
  `.trim())
  process.exit(0)
}

console.log(`[drift-sync] Looking for components imported from: ${dsPackages.join(', ')}`)

// ─── Walk source files ────────────────────────────────────────────────────────

function walk(dir, files = []) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return files }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', '.next', 'out'].includes(entry.name)) continue
      walk(full, files)
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      // Skip stories, tests, and the config itself
      if (entry.name.includes('.stories.') || entry.name.includes('.test.') || entry.name.includes('.spec.')) continue
      if (full === configPath) continue
      files.push(full)
    }
  }
  return files
}

const srcDir = join(ROOT, 'src')
const files  = walk(srcDir)

console.log(`[drift-sync] Scanning ${files.length} source files…`)

// ─── Extract component names from imports ─────────────────────────────────────

const found = new Map() // name → Set of files it appears in

for (const file of files) {
  let src
  try { src = readFileSync(file, 'utf8') } catch { continue }

  for (const pkg of dsPackages) {
    // Escape special regex chars in package name (e.g. dots in paths)
    const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match: import { Button, Modal as Foo, type X } from 'pkg'
    const importRe = new RegExp(
      `import\\s+(?:type\\s+)?\\{([^}]+)\\}\\s+from\\s+['"\`]${escaped}['"\`]`,
      'g'
    )
    for (const match of src.matchAll(importRe)) {
      const names = match[1]
        .split(',')
        .map(s => {
          // "type Button" → skip type-only imports
          if (/^\s*type\s+/.test(s)) return null
          // "Button as Btn" → take the local alias (Btn)
          const asPart = s.match(/\bas\s+(\w+)/)
          return asPart ? asPart[1].trim() : s.trim()
        })
        .filter(n => n && /^[A-Z]/.test(n)) // only PascalCase = React components

      for (const name of names) {
        if (!found.has(name)) found.set(name, new Set())
        found.get(name).add(file.replace(ROOT + '/', ''))
      }
    }
  }
}

if (found.size === 0) {
  console.log(`
[drift-sync] No components found.

Check that your dsPackages value matches exactly what appears in your imports:
  import { Button } from '@acme/ui'  →  dsPackages: ['@acme/ui']
  import { Button } from '../components'  →  dsPackages: ['../components']
  `.trim())
  process.exit(0)
}

const sortedNames = [...found.keys()].sort()
console.log(`[drift-sync] Found ${sortedNames.length} components: ${sortedNames.join(', ')}`)

// ─── Build the new components block ──────────────────────────────────────────

// Preserve any existing storyPath / figmaLink values the user has set
const existingPaths = {}
for (const [, entry, id] of configSrc.matchAll(/(\w+)\s*:\s*\{[^}]*storyPath\s*:\s*['"`]([^'"`]+)['"`]/g)) {
  existingPaths[entry] = id
}

const compLines = sortedNames
  .map(name => {
    const existing = existingPaths[name]
    const storyPath = existing
      ? `storyPath: '${existing}'`
      : null
    const meta = storyPath ? `{ ${storyPath} }` : '{}'
    return `    ${name}: ${meta},`
  })
  .join('\n')

const newBlock = `  components: {\n    // Auto-generated by drift-sync — run npm run drift-sync to refresh\n${compLines}\n  },`

// Replace the existing components block (handles both empty and populated)
const updated = configSrc.replace(
  /components\s*:\s*\{[\s\S]*?\},(?=\s*\n\s*(?:\/\/|approvedGaps|\}))/,
  newBlock
)

if (updated === configSrc) {
  console.warn('[drift-sync] Could not locate the components block in config.ts. Make sure it ends with `},` on its own line.')
  process.exit(1)
}

writeFileSync(configPath, updated, 'utf8')

console.log(`
[drift-sync] Done. Updated src/ds-coverage/config.ts with ${sortedNames.length} components.

Next steps:
  • If you have a Storybook site, add storyPath values to get "Open in Storybook" links
  • Run npm run dev and press D to see your coverage score
  • Run npm run drift-check to test your CI threshold
`.trim())
