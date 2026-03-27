#!/usr/bin/env node
/**
 * build.mjs — bundles the VS Code extension to vscode-extension/dist/
 *
 * Usage:
 *   node vscode-extension/build.mjs            # production build
 *   node vscode-extension/build.mjs --watch    # watch mode for development
 *
 * To test the extension locally:
 *   1. Run this build script
 *   2. Open vscode-extension/ in VS Code
 *   3. Press F5 to launch the Extension Development Host
 *
 * To package for the marketplace:
 *   npm install -g @vscode/vsce
 *   cd vscode-extension && vsce package
 */

import { build, context } from 'esbuild'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WATCH     = process.argv.includes('--watch')

const buildOptions = {
  entryPoints: [resolve(__dirname, 'src/extension.ts')],
  bundle:      true,
  outfile:     resolve(__dirname, 'dist/extension.js'),
  platform:    'node',
  target:      'node16',
  format:      'cjs',
  external:    ['vscode'],   // vscode is provided by the host, never bundled
  sourcemap:   WATCH ? 'inline' : false,
  minify:      !WATCH,
}

if (WATCH) {
  const ctx = await context(buildOptions)
  await ctx.watch()
  console.log('👀 Watching vscode-extension/src for changes…')
} else {
  await build(buildOptions)
  console.log('✅ VS Code extension built → ' + resolve(__dirname, 'dist/extension.js'))
  console.log('   To test: open vscode-extension/ in VS Code and press F5')
}
