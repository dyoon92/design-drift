#!/usr/bin/env node
/**
 * Drift MCP Server
 * ────────────────
 * Exposes design-system drift analysis as MCP tools so any Claude-powered
 * IDE (Claude Code, Cursor, Windsurf, etc.) can query DS coverage, inspect
 * gaps, and get AI-assisted migration suggestions without leaving the editor.
 *
 * Setup (Claude Code):
 *   Add to ~/.claude.json or .claude/settings.json:
 *   {
 *     "mcpServers": {
 *       "drift": {
 *         "command": "node",
 *         "args": ["scripts/drift-mcp.mjs"],
 *         "cwd": "<absolute-path-to-your-project>"
 *       }
 *     }
 *   }
 *
 * Setup (Cursor):
 *   Settings → MCP → Add Server → command: node scripts/drift-mcp.mjs
 *
 * Tools exposed:
 *   drift_manifest       List all registered DS components
 *   drift_analyze        Analyze a file for DS vs custom component usage
 *   drift_gaps           Show the most-used custom components across the codebase
 *   drift_suggest        Suggest a DS replacement for a custom component
 *   drift_report         Run the full headless Playwright drift scan
 */

import { Server }               from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, relative, extname } from 'path'
import { execSync, spawnSync } from 'child_process'

const ROOT = process.cwd()

// ─── Config reader ────────────────────────────────────────────────────────────
// Parses config.ts statically (regex) so we don't need to transpile TS.

function readConfig() {
  const configPath = join(ROOT, 'src/ds-coverage/config.ts')
  if (!existsSync(configPath)) {
    return { components: {}, threshold: 80, storybookUrl: null, figmaFileKey: null }
  }
  const src = readFileSync(configPath, 'utf8')

  // Extract component block keys
  const componentNames = []
  const storyPaths = {}
  const figmaLinks = {}

  // Match each top-level key in `components: { ... }`
  const blockMatch = src.match(/components:\s*\{([\s\S]*?)\n  \}/)
  if (blockMatch) {
    const block = blockMatch[1]
    // Each entry: ComponentName: { storyPath: '...', figmaLink: '...' }
    const entryRe = /^\s{4}(\w+):\s*\{([^}]*)\}/gm
    let m
    while ((m = entryRe.exec(block)) !== null) {
      const name = m[1]
      const body = m[2]
      componentNames.push(name)
      const sp = body.match(/storyPath:\s*['"]([^'"]+)['"]/)
      const fl = body.match(/figmaLink:\s*['"]([^'"]+)['"]/)
      if (sp) storyPaths[name] = sp[1]
      if (fl) figmaLinks[name] = fl[1]
    }
  }

  const threshold = parseInt((src.match(/threshold:\s*(\d+)/) || [])[1] ?? '80', 10)
  const storybookUrl = (src.match(/storybookUrl:\s*['"]([^'"]+)['"]/) || [])[1] ?? null
  const figmaFileKey = (src.match(/figmaFileKey:\s*['"]([^'"]+)['"]/) || [])[1] ?? null

  return { components: componentNames, storyPaths, figmaLinks, threshold, storybookUrl, figmaFileKey }
}

// ─── File scanner ─────────────────────────────────────────────────────────────
// Statically extracts JSX component usage from .tsx / .jsx files.

function scanFile(filePath) {
  if (!existsSync(filePath)) return { error: `File not found: ${filePath}` }
  const src = readFileSync(filePath, 'utf8')
  const config = readConfig()
  const dsSet = new Set(config.components)

  // Match <ComponentName and <ComponentName/ but not HTML tags (lowercase)
  const re = /<([A-Z][A-Za-z0-9]*)/g
  const counts = {}
  let m
  while ((m = re.exec(src)) !== null) {
    const name = m[1]
    counts[name] = (counts[name] || 0) + 1
  }

  const ds = [], custom = []
  for (const [name, count] of Object.entries(counts)) {
    if (dsSet.has(name)) ds.push({ name, count })
    else custom.push({ name, count })
  }

  ds.sort((a, b) => b.count - a.count)
  custom.sort((a, b) => b.count - a.count)

  const dsTotal = ds.reduce((s, c) => s + c.count, 0)
  const customTotal = custom.reduce((s, c) => s + c.count, 0)
  const total = dsTotal + customTotal
  const pct = total ? Math.round((dsTotal / total) * 100) : 0

  return {
    file: relative(ROOT, filePath),
    dsComponents: ds,
    customComponents: custom,
    coverage: pct,
    total,
    threshold: config.threshold,
    passed: pct >= config.threshold,
  }
}

// ─── Codebase-wide gap map ────────────────────────────────────────────────────

function walkTsx(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walkTsx(full, out)
    else if (['.tsx', '.jsx'].includes(extname(entry.name))) out.push(full)
  }
  return out
}

function buildGapMap() {
  const config = readConfig()
  const dsSet  = new Set(config.components)
  const srcDir = join(ROOT, 'src')
  const files  = walkTsx(srcDir)

  const gapMap = {}  // customName → total count
  const dsMap  = {}  // dsName → total count
  let dsTotal = 0, customTotal = 0

  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    const re = /<([A-Z][A-Za-z0-9]*)/g
    let m
    while ((m = re.exec(src)) !== null) {
      const name = m[1]
      if (dsSet.has(name)) {
        dsMap[name] = (dsMap[name] || 0) + 1
        dsTotal++
      } else {
        gapMap[name] = (gapMap[name] || 0) + 1
        customTotal++
      }
    }
  }

  const total = dsTotal + customTotal
  const pct = total ? Math.round((dsTotal / total) * 100) : 0

  return {
    coverage: pct,
    threshold: config.threshold,
    passed: pct >= config.threshold,
    dsTotal,
    customTotal,
    total,
    topGaps: Object.entries(gapMap).sort((a, b) => b[1] - a[1]).slice(0, 20),
    topDS:   Object.entries(dsMap).sort((a, b) => b[1] - a[1]).slice(0, 10),
  }
}

// ─── DS component API reader ──────────────────────────────────────────────────

function getDSComponentAPI(componentName) {
  const storyFile = join(ROOT, `src/stories/${componentName}.tsx`)
  if (!existsSync(storyFile)) return null
  const src = readFileSync(storyFile, 'utf8')

  // Extract props interface / type
  const ifaceRe = new RegExp(`interface\\s+${componentName}Props[\\s\\S]*?\\n\\}`, 'g')
  const typeRe  = new RegExp(`type\\s+${componentName}Props[\\s\\S]*?\\n\\}`, 'g')
  const iface = (src.match(ifaceRe) || [])[0] || ''
  const type  = (src.match(typeRe)  || [])[0] || ''
  return (iface || type || '').trim() || null
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'drift', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'drift_manifest',
      description: 'List all registered design system components with their story paths and Figma links.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'drift_analyze',
      description: 'Analyze a single file for DS vs custom component usage and return a coverage report.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the .tsx/.jsx file to analyze (relative to project root or absolute)' },
        },
        required: ['path'],
      },
    },
    {
      name: 'drift_gaps',
      description: 'Show the most-used custom (non-DS) components across the entire codebase. Use this to find the highest-impact migration targets.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'drift_suggest',
      description: 'Given a custom component name, suggest which DS component could replace it and show the props API of the DS component.',
      inputSchema: {
        type: 'object',
        properties: {
          component: { type: 'string', description: 'Name of the custom component to find a DS replacement for' },
        },
        required: ['component'],
      },
    },
    {
      name: 'drift_report',
      description: 'Run the full headless Playwright drift scan against the built app and return a JSON coverage report. Requires the app to be built first.',
      inputSchema: {
        type: 'object',
        properties: {
          url:    { type: 'string',  description: 'URL of the running app (default: http://localhost:5173)' },
          routes: { type: 'string',  description: 'Comma-separated routes to scan (default: /)' },
          build:  { type: 'boolean', description: 'Whether to run npm run build first (default: false)' },
        },
        required: [],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params

  // ── drift_manifest ──────────────────────────────────────────────────────────
  if (name === 'drift_manifest') {
    const config = readConfig()
    const rows = config.components.map(c => {
      const story  = config.storyPaths[c] ? `✅ ${config.storyPaths[c]}` : '—'
      const figma  = config.figmaLinks[c] ? `✅` : '—'
      return `| ${c} | ${story} | ${figma} |`
    })
    return {
      content: [{
        type: 'text',
        text: [
          `## DS Component Registry (${config.components.length} components)`,
          '',
          `**Storybook:** ${config.storybookUrl ?? 'not configured'}`,
          `**Figma file:** ${config.figmaFileKey ?? 'not configured'}`,
          `**Coverage threshold:** ${config.threshold}%`,
          '',
          '| Component | Story Path | Figma |',
          '|-----------|------------|-------|',
          ...rows,
        ].join('\n'),
      }],
    }
  }

  // ── drift_analyze ───────────────────────────────────────────────────────────
  if (name === 'drift_analyze') {
    const filePath = resolve(ROOT, args.path)
    const result = scanFile(filePath)
    if (result.error) return { content: [{ type: 'text', text: result.error }] }

    const lines = [
      `## Drift Analysis — \`${result.file}\``,
      '',
      `**Coverage:** ${result.coverage}% (threshold: ${result.threshold}%) ${result.passed ? '✅ PASS' : '🔴 FAIL'}`,
      `**Total component uses:** ${result.total} (${result.dsTotal ?? result.dsComponents.reduce((s,c)=>s+c.count,0)} DS, ${result.customTotal ?? result.customComponents.reduce((s,c)=>s+c.count,0)} custom)`,
      '',
    ]

    if (result.dsComponents.length) {
      lines.push('### DS components used')
      lines.push('| Component | Uses |')
      lines.push('|-----------|------|')
      for (const { name: n, count } of result.dsComponents) lines.push(`| ${n} | ${count} |`)
      lines.push('')
    }

    if (result.customComponents.length) {
      lines.push('### Custom (non-DS) components')
      lines.push('| Component | Uses |')
      lines.push('|-----------|------|')
      for (const { name: n, count } of result.customComponents) lines.push(`| ${n} | ${count} |`)
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }

  // ── drift_gaps ──────────────────────────────────────────────────────────────
  if (name === 'drift_gaps') {
    const result = buildGapMap()
    const lines = [
      `## Codebase-wide Drift Report`,
      '',
      `**Overall coverage:** ${result.coverage}% (threshold: ${result.threshold}%) ${result.passed ? '✅ PASS' : '🔴 FAIL'}`,
      `**Total component uses:** ${result.total} (${result.dsTotal} DS, ${result.customTotal} custom)`,
      '',
      '### Top custom components (highest migration impact)',
      '| Component | Uses | Est. coverage gain if migrated |',
      '|-----------|------|-------------------------------|',
    ]
    for (const [name, count] of result.topGaps) {
      const gain = result.total ? Math.round((count / result.total) * 100) : 0
      lines.push(`| ${name} | ${count} | +${gain}% |`)
    }

    lines.push('')
    lines.push('### Most-used DS components')
    lines.push('| Component | Uses |')
    lines.push('|-----------|------|')
    for (const [name, count] of result.topDS) lines.push(`| ${name} | ${count} |`)

    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }

  // ── drift_suggest ───────────────────────────────────────────────────────────
  if (name === 'drift_suggest') {
    const custom = args.component
    const config = readConfig()
    const dsSet  = new Set(config.components)

    // Simple heuristic name matching
    const suggestions = config.components.filter(ds => {
      const dl = ds.toLowerCase(), cl = custom.toLowerCase()
      return dl.includes(cl) || cl.includes(dl) ||
        // common synonyms
        (cl.includes('btn') && dl.includes('button')) ||
        (cl.includes('button') && dl.includes('button')) ||
        (cl.includes('tab') && dl.includes('tab')) ||
        (cl.includes('badge') && dl.includes('badge')) ||
        (cl.includes('input') && dl.includes('input')) ||
        (cl.includes('modal') && dl.includes('modal')) ||
        (cl.includes('dropdown') && dl.includes('dropdown')) ||
        (cl.includes('select') && dl.includes('dropdown')) ||
        (cl.includes('toast') && dl.includes('toast')) ||
        (cl.includes('alert') && dl.includes('toast'))
    })

    const lines = [`## DS replacement suggestion for \`${custom}\``, '']

    if (suggestions.length === 0) {
      lines.push(`No direct DS equivalent found for \`${custom}\`.`)
      lines.push('')
      lines.push('Available DS components:')
      lines.push(config.components.map(c => `- \`${c}\``).join('\n'))
    } else {
      lines.push(`**Suggested DS replacement(s):** ${suggestions.map(s => `\`${s}\``).join(', ')}`)
      lines.push('')
      for (const ds of suggestions) {
        const api = getDSComponentAPI(ds)
        const story = config.storyPaths[ds]
        lines.push(`### \`${ds}\``)
        if (story) lines.push(`Storybook: \`${config.storybookUrl ?? 'http://localhost:6006'}/story/${story}\``)
        if (api) {
          lines.push('')
          lines.push('**Props API:**')
          lines.push('```typescript')
          lines.push(api)
          lines.push('```')
        }
        lines.push('')
      }
    }

    // Find usages of the custom component in the codebase
    try {
      const grepResult = spawnSync('grep', ['-rn', `<${custom}`, join(ROOT, 'src')], { encoding: 'utf8' })
      if (grepResult.stdout) {
        const usageLines = grepResult.stdout.trim().split('\n').slice(0, 10)
        lines.push(`### Usages of \`${custom}\` in codebase (first 10)`)
        lines.push('```')
        lines.push(usageLines.join('\n'))
        lines.push('```')
      }
    } catch {}

    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }

  // ── drift_report ────────────────────────────────────────────────────────────
  if (name === 'drift_report') {
    const url    = args.url    ?? 'http://localhost:5173'
    const routes = args.routes ?? '/'
    const doBuild = args.build ?? false

    const lines = ['## Drift Report (headless scan)', '']

    try {
      if (doBuild) {
        lines.push('Running `npm run build`...')
        execSync('npm run build', { cwd: ROOT, stdio: 'pipe' })
        lines.push('Build complete.\n')
      }

      const result = spawnSync(
        'node',
        ['scripts/drift-check.mjs', '--url', url, '--routes', routes, '--json'],
        { cwd: ROOT, encoding: 'utf8', timeout: 60_000 },
      )

      if (result.error) throw result.error

      // The script may mix stdout with status text; find the JSON block
      const jsonMatch = (result.stdout || '').match(/\{[\s\S]+\}/)
      if (!jsonMatch) {
        lines.push('Could not parse JSON from drift-check output.')
        lines.push('```')
        lines.push(result.stdout || result.stderr || 'No output')
        lines.push('```')
      } else {
        const report = JSON.parse(jsonMatch[0])
        lines.push(`**Overall:** ${report.passed ? '✅ PASS' : '🔴 FAIL'}`)
        lines.push('')
        for (const r of report.routes ?? []) {
          if (r.error) {
            lines.push(`### \`${r.route}\` — ❌ Error: ${r.error}`)
          } else {
            const icon = r.pct >= (report.threshold ?? 80) ? '✅' : '🔴'
            lines.push(`### \`${r.route}\` — ${icon} ${r.pct}% coverage`)
            lines.push(`DS: ${r.ds}  Custom: ${r.total - r.ds}  Total: ${r.total}`)
            if (r.tokenViolations?.length) {
              lines.push(`Token violations: ${r.tokenViolations.length}`)
            }
            if (r.gapMap) {
              const gaps = Object.entries(r.gapMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
              if (gaps.length) {
                lines.push('Top gaps: ' + gaps.map(([n, c]) => `\`${n}\`×${c}`).join(', '))
              }
            }
          }
          lines.push('')
        }
      }
    } catch (err) {
      lines.push(`Error running drift check: ${err.message}`)
      lines.push('Make sure the app is running at ' + url)
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }

  return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] }
})

// ─── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport()
await server.connect(transport)
// Server is now listening on stdio — IDE connects via MCP protocol
