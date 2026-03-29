#!/usr/bin/env node
/**
 * Drift Fix Server — http://localhost:7779
 *
 * Receives fix requests from the browser overlay and queues them in
 * .drift-fixes.json. Claude Code reads the queue via the drift MCP server
 * (drift_get_pending_fix / drift_clear_fixes tools) and applies them directly.
 *
 * Usage:
 *   npm run drift-fix-server
 *   # or: node scripts/drift-fix-server.mjs
 *
 * Routes:
 *   POST   /drift-fix  — queue a fix (JSON body)
 *   DELETE /drift-fix  — clear all queued fixes
 *   GET    /health     — { ok: true, pending: N }
 */

import { createServer }                               from 'http'
import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs'
import { resolve }                                    from 'path'

const PORT       = 7779
const ROOT       = process.cwd()
const FIXES_PATH = resolve(ROOT, '.drift-fixes.json')

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function readFixes() {
  try { return JSON.parse(readFileSync(FIXES_PATH, 'utf8')) } catch { return [] }
}

function writeFixes(arr) {
  const tmp = FIXES_PATH + '.tmp'
  writeFileSync(tmp, JSON.stringify(arr, null, 2), 'utf8')
  renameSync(tmp, FIXES_PATH)
}

createServer((req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const path = new URL(req.url, `http://localhost:${PORT}`).pathname

  // ── GET /health ─────────────────────────────────────────────────────────────
  if (path === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, pending: readFixes().length }))
    return
  }

  // ── POST /drift-fix ─────────────────────────────────────────────────────────
  if (path === '/drift-fix' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const entry = JSON.parse(body)
        entry.id  = entry.id  ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
        entry.ts  = entry.ts  ?? new Date().toISOString()
        const fixes = readFixes()
        fixes.push(entry)
        writeFixes(fixes)
        console.error(`[drift-fix-server] queued fix for ${entry.component ?? '?'} (${fixes.length} pending)`)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, id: entry.id, pending: fixes.length }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'invalid JSON body' }))
      }
    })
    return
  }

  // ── DELETE /drift-fix ───────────────────────────────────────────────────────
  if (path === '/drift-fix' && req.method === 'DELETE') {
    writeFixes([])
    console.error('[drift-fix-server] queue cleared')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  res.writeHead(404); res.end()
}).listen(PORT, () => {
  console.error(`[drift-fix-server] ready on http://localhost:${PORT}`)
  console.error(`[drift-fix-server] fixes queued to: ${FIXES_PATH}`)
  console.error(`[drift-fix-server] in Claude Code: drift_get_pending_fix → apply → drift_clear_fixes`)
})
