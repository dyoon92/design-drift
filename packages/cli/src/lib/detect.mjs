/**
 * Project detection utilities
 * All functions are sync, read-only, and work against any React project.
 */

import { existsSync, readFileSync } from 'fs'
import { resolve, join } from 'path'

export function detectFramework(cwd) {
  const pkg = safeReadJson(join(cwd, 'package.json'))
  if (!pkg) return 'unknown'
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  if (deps['next'])    return 'nextjs'
  if (deps['remix'] || deps['@remix-run/react']) return 'remix'
  if (deps['vite'])    return 'vite'
  if (deps['react-scripts']) return 'cra'
  return 'react'
}

export function detectStorybook(cwd) {
  const pkg = safeReadJson(join(cwd, 'package.json'))
  const deps = pkg ? { ...pkg.dependencies, ...pkg.devDependencies } : {}

  const hasStorybook = Object.keys(deps).some(k => k.startsWith('@storybook/'))
  if (!hasStorybook) return { found: false, url: null }

  // Check for custom port in .storybook/main.ts
  const mainTs = safeReadFile(join(cwd, '.storybook/main.ts')) || safeReadFile(join(cwd, '.storybook/main.js')) || ''
  const portMatch = mainTs.match(/port:\s*(\d+)/)
  const port = portMatch ? portMatch[1] : '6006'

  // Check for deployed URL in existing drift config
  const config = safeReadFile(join(cwd, 'drift.config.ts')) || safeReadFile(join(cwd, 'src/ds-coverage/config.ts')) || ''
  const chromaticMatch = config.match(/chromaticUrl:\s*['"]([^'"]+)['"]/)

  return {
    found: true,
    url: `http://localhost:${port}`,
    chromaticUrl: chromaticMatch ? chromaticMatch[1] : null,
  }
}

export function detectAITools(cwd) {
  const tools = []
  if (existsSync(join(cwd, 'CLAUDE.md')) || existsSync(join(cwd, '.claude'))) tools.push('claude')
  if (existsSync(join(cwd, '.cursorrules')) || existsSync(join(cwd, '.cursor'))) tools.push('cursor')
  if (existsSync(join(cwd, '.windsurfrules'))) tools.push('windsurf')
  if (existsSync(join(cwd, 'AGENTS.md'))) tools.push('agents')
  return tools
}

export function detectExistingDrift(cwd) {
  return {
    config: existsSync(join(cwd, 'drift.config.ts')) || existsSync(join(cwd, 'src/ds-coverage/config.ts')),
    action: existsSync(join(cwd, '.github/workflows/drift-check.yml')),
    overlay: (() => {
      const entry = findAppEntry(cwd)
      if (!entry) return false
      const src = safeReadFile(entry) || ''
      return src.includes('DriftOverlay') || src.includes('@catchdrift/overlay')
    })(),
  }
}

export function findAppEntry(cwd) {
  const candidates = [
    'src/main.tsx', 'src/main.ts', 'src/main.jsx', 'src/main.js',
    'src/index.tsx', 'src/index.ts',
    'pages/_app.tsx', 'pages/_app.ts', 'pages/_app.jsx',
    'app/layout.tsx', 'app/layout.ts',
    'app/root.tsx',
  ]
  for (const c of candidates) {
    const p = join(cwd, c)
    if (existsSync(p)) return p
  }
  return null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeReadJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return null }
}

function safeReadFile(path) {
  try { return readFileSync(path, 'utf8') } catch { return null }
}
