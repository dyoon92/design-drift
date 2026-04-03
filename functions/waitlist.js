/**
 * Cloudflare Pages Function — /waitlist
 *
 * POST /waitlist  { email: string }
 *   → increments KV counter
 *   → stores email in KV (waitlist:emails list)
 *   → sends welcome email via Resend
 *   → returns { ok: true, count: N }
 *
 * Required environment variables (CF Pages → Settings → Environment Variables):
 *   RESEND_API_KEY   — from resend.com (free tier: 3,000 emails/month)
 *
 * Required KV binding (CF Pages → Settings → Functions → KV namespace bindings):
 *   WAITLIST_KV      — same namespace used by /count
 *
 * From address: uses dave@catchdrift.ai once domain is verified in Resend.
 * Until then, set FROM_EMAIL env var to your verified Resend address
 * (defaults to onboarding@resend.dev for testing).
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestPost({ request, env }) {
  let email
  try {
    const body = await request.json()
    email = (body.email || '').trim().toLowerCase()
  } catch {
    return Response.json({ ok: false, error: 'Invalid request body' }, { status: 400, headers: CORS })
  }

  if (!email || !email.includes('@')) {
    return Response.json({ ok: false, error: 'Invalid email' }, { status: 400, headers: CORS })
  }

  // ── Increment counter + store email ─────────────────────────────────────────
  let count = 0
  if (env.WAITLIST_KV) {
    const current = parseInt((await env.WAITLIST_KV.get('count')) || '0')
    count = current + 1
    await env.WAITLIST_KV.put('count', String(count))

    // Store email list as newline-separated string
    const existing = (await env.WAITLIST_KV.get('emails')) || ''
    const emails   = existing ? existing + '\n' + email : email
    await env.WAITLIST_KV.put('emails', emails)
  }

  // ── Send welcome email via Resend ────────────────────────────────────────────
  if (env.RESEND_API_KEY) {
    const from = env.FROM_EMAIL || 'Drift <onboarding@resend.dev>'
    await sendWelcomeEmail(env.RESEND_API_KEY, from, email)
  }

  return Response.json({ ok: true, count }, { headers: CORS })
}

// ── Email ─────────────────────────────────────────────────────────────────────

async function sendWelcomeEmail(apiKey, from, to) {
  const html = buildEmailHtml()
  const text = buildEmailText()

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: "You're on the Drift waitlist",
      html,
      text,
    }),
  })
}

function buildEmailHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the Drift waitlist</title>
</head>
<body style="margin:0;padding:0;background:#09090f;font-family:'Inter',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <svg width="28" height="28" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 9 Q4 5, 7 9 Q10 13, 13 9 Q16 5, 19 9"
                        stroke="#4f8ef7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M1 14 Q4 10, 7 14 Q10 18, 13 14 Q16 10, 19 14"
                        stroke="#4f8ef7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.45"/>
                    </svg>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:17px;font-weight:700;color:#eeeef4;letter-spacing:-0.3px;">Drift</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background:#0f0f18;border:1px solid #1e1e2e;border-radius:12px;padding:40px;">

              <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#eeeef4;font-weight:500;">
                You're on the list.
              </p>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#9999b0;">
                We'll reach out when early access opens — probably before you expect it.
              </p>

              <p style="margin:0 0 28px;font-size:15px;line-height:1.8;color:#9999b0;">
                In the meantime — the live demo is up. Press <strong style="color:#eeeef4;">D</strong> on any screen
                to open the overlay and see what drift actually looks like on a real product.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#4f8ef7;border-radius:8px;">
                    <a href="https://design-drift.pages.dev?demo=1"
                       style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.1px;">
                      Try the demo →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;font-size:15px;line-height:1.8;color:#9999b0;">
                One question while you wait: what's the biggest way your UI has drifted from your design system?
                Hit reply — we read every one.
              </p>

              <p style="margin:28px 0 0;font-size:14px;color:#6b6b82;">
                — Dave @ Drift
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#4a4a5a;line-height:1.6;">
                You signed up at <a href="https://catchdrift.ai" style="color:#4a4a5a;">catchdrift.ai</a>.
                No spam, ever.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildEmailText() {
  return `You're on the list.

We'll reach out when early access opens — probably before you expect it.

In the meantime — the live demo is up. Press D on any screen to open the overlay and see what drift actually looks like on a real product.

Try the demo: https://design-drift.pages.dev?demo=1

One question while you wait: what's the biggest way your UI has drifted from your design system? Hit reply — we read every one.

— Dave @ Drift

---
You signed up at catchdrift.ai. No spam, ever.`
}
