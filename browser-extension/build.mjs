#!/usr/bin/env node
/**
 * build.mjs — bundles the browser extension into /browser-extension/dist/
 *
 * Usage:
 *   node browser-extension/build.mjs
 *
 * Output: browser-extension/dist/ — load this folder in Chrome via
 *   chrome://extensions → "Load unpacked"
 *
 * No bundler needed — the extension uses plain ES5-compatible JS.
 * This script just copies files to dist/ in the right structure.
 */

import { cpSync, mkdirSync, copyFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const EXT = __dirname
const DIST = resolve(EXT, 'dist')

// Clean and recreate dist
mkdirSync(DIST, { recursive: true })
mkdirSync(resolve(DIST, 'src'), { recursive: true })
mkdirSync(resolve(DIST, 'icons'), { recursive: true })

// Copy manifests and HTML
;['manifest.json', 'popup.html', 'options.html'].forEach(f => {
  copyFileSync(resolve(EXT, f), resolve(DIST, f))
})

// Copy JS sources
;['src/content.js', 'src/background.js', 'src/popup.js', 'src/options.js', 'src/injected.js'].forEach(f => {
  copyFileSync(resolve(EXT, f), resolve(DIST, f))
})

// injected.js needs to be at the root of dist too (web_accessible_resources)
copyFileSync(resolve(EXT, 'src/injected.js'), resolve(DIST, 'injected.js'))

// Copy icons if they exist
const iconSizes = ['16', '48', '128']
iconSizes.forEach(size => {
  const src = resolve(EXT, `icons/icon${size}.png`)
  if (existsSync(src)) copyFileSync(src, resolve(DIST, `icons/icon${size}.png`))
})

console.log(`✅ Extension built → ${DIST}`)
console.log('   Load in Chrome: chrome://extensions → "Load unpacked" → select dist/')
