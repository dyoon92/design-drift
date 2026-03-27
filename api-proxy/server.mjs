#!/usr/bin/env node
/**
 * api-proxy/server.mjs
 * ─────────────────────
 * Minimal HTTP proxy for Anthropic API calls.
 * Keeps the ANTHROPIC_API_KEY on the server — never exposed to the browser.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node api-proxy/server.mjs
 *   # or: npm run proxy
 *
 * The proxy exposes two endpoints:
 *   POST /api/ai/suggest    → ai replacement suggestion for gap components
 *   POST /api/ai/drift-fix  → token fix suggestion for drifted DS components
 *
 * Set VITE_AI_PROXY_URL=http://localhost:3001 in .env to route the overlay
 * through this proxy instead of calling Anthropic directly.
 *
 * CORS: only allows requests from localhost dev origins by default.
 * Set PROXY_ALLOWED_ORIGIN=https://yourapp.com for production.
 */

import { createServer } from 'http'

const PORT           = parseInt(process.env.PORT             ?? '3001', 10)
const API_KEY        = process.env.ANTHROPIC_API_KEY
const ALLOWED_ORIGIN = process.env.PROXY_ALLOWED_ORIGIN ?? 'http://localhost:5173'
const ANTHROPIC_URL  = 'https://api.anthropic.com/v1/messages'

if (!API_KEY) {
  console.error('❌  ANTHROPIC_API_KEY env var is required.')
  console.error('    Run: ANTHROPIC_API_KEY=sk-ant-... node api-proxy/server.mjs')
  process.exit(1)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end',  ()    => { try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON')) } })
    req.on('error', reject)
  })
}

function cors(res, origin) {
  const allowed = ALLOWED_ORIGIN.split(',').map(s => s.trim())
  if (allowed.includes(origin) || allowed.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowed[0])
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

async function callAnthropic(model, maxTokens, messages) {
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key':        API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':     'application/json',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data?.error?.message ?? `Anthropic API error ${resp.status}`)
  return data.content?.[0]?.text ?? ''
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleSuggest(body) {
  const { name, count, pages, props, dsComponents } = body
  if (!name) throw new Error('Missing "name" field')

  const propsStr = Object.entries(props ?? {})
    .filter(([k, v]) => k !== 'children' && typeof v !== 'function')
    .slice(0, 8)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(', ') || '(none)'

  const dsList = (dsComponents ?? []).join(', ')

  const prompt =
`You're a design system consultant reviewing a React component in a property management app (StorageOS).

UNKNOWN COMPONENT: "${name}"
- Renders ${count ?? 1} times across ${(pages ?? []).length} page(s): ${(pages ?? []).join(', ')}
- Current props: ${propsStr}

DESIGN SYSTEM AVAILABLE: ${dsList}

Respond in exactly 3 short sentences:
1. Can an existing DS component replace "${name}"? If yes, which one and how would you adapt it?
2. If no direct replacement: what is this component's pattern, and should it be promoted to the DS?
3. If promoting to DS: name 2-3 other places in a property management app where this pattern would be reused.
Be specific, concise, and actionable.`

  return callAnthropic('claude-haiku-4-5-20251001', 280, [{ role: 'user', content: prompt }])
}

async function handleDriftFix(body) {
  const { name, violations, tokens } = body
  if (!name || !violations) throw new Error('Missing "name" or "violations" fields')

  const tokenList = (tokens ?? [
    '--ds-border-radius-sm: 4px', '--ds-border-radius-md: 6px',
    '--ds-border-radius-lg: 8px', '--ds-border-radius-full: 999px',
    '--ds-color-primary: #7d52f7', '--ds-color-text-primary: #161616',
    '--ds-color-text-muted: #94a0b8', '--ds-color-border: #e1e5ef',
    '--ds-color-surface: #ffffff', '--ds-color-surface-subtle: #f7f9fb',
    '--ds-color-error: #e02c3b', '--ds-color-success: #08875c',
    '--ds-color-page-bg: #f1f3f9',
  ]).join('\n  ')

  const violationLines = violations
    .map(v => `  ${v.prop}: "${v.value}"  (type: ${v.type})`)
    .join('\n')

  const prompt =
`You are a design system engineer. A DS React component has hardcoded inline style overrides that must be replaced with design tokens.

COMPONENT: ${name}
HARDCODED OVERRIDES:
${violationLines}

AVAILABLE DS TOKENS:
  ${tokenList}

Return ONLY a JSON object mapping each CSS property (camelCase) to its correct token replacement.
If no exact token exists, pick the closest one and note it.
Example: {"borderRadius": "var(--ds-border-radius-lg)", "color": "var(--ds-color-text-primary)"}
JSON only, no explanation outside the object.`

  return callAnthropic('claude-haiku-4-5-20251001', 400, [{ role: 'user', content: prompt }])
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const origin = req.headers.origin ?? ''
  cors(res, origin)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  let text = ''
  try {
    const body = await readBody(req)

    if (req.url === '/api/ai/suggest') {
      text = await handleSuggest(body)
    } else if (req.url === '/api/ai/drift-fix') {
      text = await handleDriftFix(body)
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ text }))
  } catch (err) {
    console.error('[proxy]', err.message)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
})

server.listen(PORT, () => {
  console.log(`\n🔁  DesignDrift AI Proxy running on http://localhost:${PORT}`)
  console.log(`    Allowed origin: ${ALLOWED_ORIGIN}`)
  console.log(`    Set VITE_AI_PROXY_URL=http://localhost:${PORT} in .env\n`)
})
