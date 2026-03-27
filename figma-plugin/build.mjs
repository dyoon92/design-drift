#!/usr/bin/env node
/**
 * build.mjs — builds the Figma plugin to figma-plugin/dist/
 *
 * Usage:
 *   node figma-plugin/build.mjs
 *
 * Requires esbuild (already in devDependencies after running npm install).
 * Output:
 *   figma-plugin/dist/code.js   — plugin main thread
 *   figma-plugin/dist/ui.html  — plugin UI
 *   figma-plugin/manifest.json — already in root (Figma reads from plugin folder)
 */

import { build } from 'esbuild'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLUGIN = __dirname
const DIST   = resolve(PLUGIN, 'dist')

mkdirSync(DIST, { recursive: true })

// Bundle code.ts → dist/code.js
await build({
  entryPoints: [resolve(PLUGIN, 'src/code.ts')],
  bundle:      true,
  outfile:     resolve(DIST, 'code.js'),
  platform:    'browser',
  target:      'es2017',
  format:      'iife',
  // Figma's plugin sandbox exposes figma as a global — don't bundle it
  external:    [],
  define:      { '__html__': '"ui.html"' },
})

// Copy ui.html → dist/ui.html
copyFileSync(resolve(PLUGIN, 'src/ui.html'), resolve(DIST, 'ui.html'))

// Write a dist-level manifest.json that points to dist/ files
const manifest = JSON.parse(readFileSync(resolve(PLUGIN, 'manifest.json'), 'utf8'))
manifest.main = 'code.js'
manifest.ui   = 'ui.html'
writeFileSync(resolve(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2))

console.log('✅ Figma plugin built → ' + DIST)
console.log('   Load in Figma: Plugins → Development → Import plugin from manifest → select dist/manifest.json')
