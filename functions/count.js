/**
 * Cloudflare Pages Function — /count
 *
 * GET  /count → { value: N }   read current waitlist count
 * POST /count → { value: N }   increment + return new count
 *
 * Requires a KV namespace bound as WAITLIST_KV in the Pages project settings:
 *   Cloudflare Dashboard → Workers & Pages → design-drift → Settings
 *   → Functions → KV namespace bindings → Add:
 *       Variable name: WAITLIST_KV
 *       KV namespace:  drift-waitlist  (create it first under Storage → KV)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestGet({ env }) {
  if (!env.WAITLIST_KV) return Response.json({ value: null }, { headers: CORS })
  const val = await env.WAITLIST_KV.get('count')
  return Response.json({ value: parseInt(val || '0') }, { headers: CORS })
}

export async function onRequestPost({ env }) {
  if (!env.WAITLIST_KV) return Response.json({ value: null }, { headers: CORS })
  const current = parseInt((await env.WAITLIST_KV.get('count')) || '0')
  const next = current + 1
  await env.WAITLIST_KV.put('count', String(next))
  return Response.json({ value: next }, { headers: CORS })
}
