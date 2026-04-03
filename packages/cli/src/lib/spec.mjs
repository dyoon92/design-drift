/**
 * drift-spec utilities
 * ─────────────────────
 * Reads, validates, and enforces .drift-spec.md files.
 * A spec declares which DS components a screen *intends* to use —
 * CI then validates the implementation matches the intent.
 *
 * Spec format: YAML frontmatter + Markdown body
 *
 *   ---
 *   drift-spec: "1.0"
 *   screen: BulkPaymentScreen
 *   feature: bulk-payment-processing
 *   owner: payments-team
 *   created: 2026-04-02
 *   components:
 *     required: [Button, Modal, Toast, TenantsTable]
 *     optional: [PinnedNotes]
 *     gaps:
 *       - name: BulkActionBar
 *         description: "Multi-select action toolbar"
 *         priority: high
 *         approved: false
 *   threshold: 85
 *   status: draft
 *   ---
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import { execSync } from 'child_process'

// ── YAML frontmatter parser (zero deps) ──────────────────────────────────────
// Handles the subset of YAML Drift specs use: strings, arrays, nested objects, booleans
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return { meta: null, body: content }
  const raw  = match[1]
  const body = content.slice(match[0].length).trim()
  try {
    return { meta: parseYamlSubset(raw), body }
  } catch {
    return { meta: null, body }
  }
}

function parseYamlSubset(raw) {
  const lines = raw.split('\n')
  const result = {}
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.match(/^\s+\S/) || line.trim() === '') { i++; continue }

    const keyMatch = line.match(/^([\w-]+):\s*(.*)/)
    if (!keyMatch) { i++; continue }

    const key = keyMatch[1]
    const val = keyMatch[2].trim()

    if (val === '|') {
      // Block scalar — join lines as a plain string
      const nested = []
      i++
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
        nested.push(lines[i].replace(/^  /, ''))
        i++
      }
      result[key] = nested.join('\n').trim()
    } else if (val === '') {
      // Nested object/list
      const nested = []
      i++
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
        nested.push(lines[i])
        i++
      }
      result[key] = parseNestedYaml(nested)
    } else if (val.startsWith('[') && val.endsWith(']')) {
      result[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
      i++
    } else {
      result[key] = parseScalar(val)
      i++
    }
  }
  return result
}

function parseNestedYaml(lines) {
  const trimmed = lines.map(l => l.replace(/^  /, ''))
  const firstContent = trimmed.find(l => l.trim())
  if (firstContent?.trimStart().startsWith('-')) return parseYamlList(trimmed)
  return parseYamlSubset(trimmed.join('\n'))
}

function parseYamlList(lines) {
  const items = []
  let current = null

  for (const line of lines) {
    if (line.trimStart().startsWith('- ')) {
      if (current !== null) items.push(current)
      const val = line.trimStart().slice(2).trim()
      current = val.includes(':') ? parseYamlSubset(val) : parseScalar(val)
    } else if (current !== null && typeof current === 'object' && line.trim()) {
      const nested = parseYamlSubset(line.trim())
      Object.assign(current, nested)
    }
  }
  if (current !== null) items.push(current)
  return items
}

function parseScalar(val) {
  if (val === 'true')  return true
  if (val === 'false') return false
  if (val === 'null' || val === '~') return null
  if (!isNaN(Number(val)) && val !== '') return Number(val)
  return val.replace(/^['"]|['"]$/g, '')
}

// ── Spec reader ───────────────────────────────────────────────────────────────

export function readSpec(specPath) {
  if (!existsSync(specPath)) return null
  const content = readFileSync(specPath, 'utf8')
  const { meta, body } = parseFrontmatter(content)
  if (!meta) return null
  return { ...meta, _body: body, _path: specPath }
}

export function findSpecs(cwd) {
  const specs = []
  const dirs  = ['specs', '.specs', 'src/specs', 'docs/specs', '.drift']

  for (const dir of dirs) {
    const full = join(cwd, dir)
    if (!existsSync(full)) continue
    for (const file of readdirSync(full)) {
      if (file.endsWith('.drift-spec.md') || file.endsWith('.spec.md')) {
        specs.push(join(full, file))
      }
    }
  }

  const rootSpec = join(cwd, 'drift-spec.md')
  if (existsSync(rootSpec)) specs.push(rootSpec)

  return specs
}

// ── Spec writer ───────────────────────────────────────────────────────────────

export function writeSpec(cwd, {
  screen,
  feature,
  owner,
  intent,
  requiredComponents = [],
  optionalComponents = [],
  gaps = [],
  threshold = 80,
  status = 'draft',
  tokens = [],
}) {
  const today = new Date().toISOString().split('T')[0]

  const gapsYaml = gaps.length
    ? gaps.map(g => [
        `    - name: ${g.name}`,
        `      description: "${g.description || 'Pending design spec'}"`,
        `      priority: ${g.priority || 'normal'}`,
        `      approved: ${g.approved === true ? 'true' : 'false'}`,
        g.figmaRequest ? `      figma-request: ${g.figmaRequest}` : null,
      ].filter(Boolean).join('\n')).join('\n')
    : null

  const tokensYaml = tokens.length
    ? tokens.map(t => `  - "${t}"`).join('\n')
    : null

  const frontmatter = [
    `---`,
    `drift-spec: "1.0"`,
    `screen: ${screen}`,
    feature ? `feature: ${feature}` : null,
    owner   ? `owner: ${owner}`   : null,
    `created: ${today}`,
    `updated: ${today}`,
    intent  ? `intent: |\n  ${intent.trim().replace(/\n/g, '\n  ')}` : null,
    `components:`,
    `  required: [${requiredComponents.join(', ')}]`,
    optionalComponents.length ? `  optional: [${optionalComponents.join(', ')}]` : null,
    gapsYaml ? `  gaps:\n${gapsYaml}` : `  gaps: []`,
    tokensYaml ? `tokens-required:\n${tokensYaml}` : null,
    `threshold: ${threshold}`,
    `status: ${status}`,
    `---`,
  ].filter(l => l !== null).join('\n')

  const body = [
    ``,
    `## Feature: ${screen}`,
    ``,
    intent || 'Add feature description here.',
    ``,
    `### User actions`,
    `- (describe what the user can do)`,
    ``,
    `### Screens in scope`,
    `- ${screen}`,
    ``,
  ].join('\n')

  const specFileName = `${(feature || screen.toLowerCase().replace(/\s+/g, '-'))}.drift-spec.md`
  const specsDir     = join(cwd, 'specs')
  mkdirSync(specsDir, { recursive: true })

  const outPath = join(specsDir, specFileName)
  writeFileSync(outPath, frontmatter + body, 'utf8')
  return outPath
}

// ── Static spec validator ─────────────────────────────────────────────────────
// Checks whether required components appear in the src directory.
// No build required — pure grep.

export function validateSpec(spec, srcDir) {
  const required = (spec.components?.required || []).filter(Boolean)
  const gaps     = spec.components?.gaps || []

  if (required.length === 0) {
    return { ok: true, violations: [], coverage: 100, found: [], missing: [] }
  }

  const found   = []
  const missing = []

  for (const name of required) {
    try {
      // Match <ComponentName followed by space, newline, /, or > (multiline-safe)
      const result = execSync(
        `grep -rl "<${name}[[:space:]/>]\\|<${name}$" "${srcDir}" --include="*.tsx" --include="*.jsx" 2>/dev/null || true`,
        { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }
      ).trim()
      if (result) found.push(name)
      else missing.push(name)
    } catch {
      missing.push(name)
    }
  }

  const unapprovedGaps = gaps.filter(g => !g.approved)

  const violations = [
    ...missing.map(name => ({
      type:      'missing-required',
      component: name,
      message:   `Spec declares <${name}> as required but it was not found in the implementation`,
      severity:  'error',
    })),
    ...unapprovedGaps.map(g => ({
      type:      'unapproved-gap',
      component: g.name,
      message:   `Gap <${g.name}> is not approved. Add approved: true in the spec gaps list, or run /drift approve ${g.name}.`,
      severity:  'warning',
    })),
  ]

  const coverage = Math.round((found.length / required.length) * 100)

  return {
    ok:         violations.filter(v => v.severity === 'error').length === 0,
    violations,
    warnings:   violations.filter(v => v.severity === 'warning'),
    coverage,
    found,
    missing,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatSpecSummary(spec) {
  const required = spec.components?.required || []
  const gaps     = spec.components?.gaps || []
  return {
    screen:    spec.screen || basename(spec._path, '.drift-spec.md'),
    required:  required.length,
    gaps:      gaps.length,
    approved:  gaps.filter(g => g.approved).length,
    pending:   gaps.filter(g => !g.approved).length,
    status:    spec.status || 'draft',
    threshold: spec.threshold || 80,
  }
}
