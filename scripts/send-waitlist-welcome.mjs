#!/usr/bin/env node
/**
 * send-waitlist-welcome.mjs
 * ─────────────────────────
 * One-time script to send the welcome email to existing waitlist signups.
 *
 * Usage:
 *   RESEND_API_KEY=re_xxxx node scripts/send-waitlist-welcome.mjs emails.txt
 *
 * emails.txt — one email per line (export from Formspree dashboard:
 *   Formspree → your form → Submissions → Export CSV, then extract the email column)
 *
 * Sends in batches of 10 with a 1s delay to stay inside Resend rate limits.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const API_KEY   = process.env.RESEND_API_KEY
const FROM      = process.env.FROM_EMAIL || 'Drift <onboarding@resend.dev>'
const FILE      = process.argv[2]
const DRY_RUN   = process.argv.includes('--dry-run')

if (!API_KEY) {
  console.error('Error: RESEND_API_KEY env var is required')
  console.error('  export RESEND_API_KEY=re_xxxxxxxxxxxx')
  process.exit(1)
}

if (!FILE) {
  console.error('Usage: node scripts/send-waitlist-welcome.mjs <emails.txt> [--dry-run]')
  process.exit(1)
}

const emails = readFileSync(resolve(FILE), 'utf8')
  .split('\n')
  .map(l => l.trim().toLowerCase())
  .filter(l => l && l.includes('@'))

console.log(`\n📬 Sending welcome email to ${emails.length} addresses${DRY_RUN ? ' (DRY RUN)' : ''}`)
console.log(`   From: ${FROM}\n`)

let sent = 0, failed = 0

for (let i = 0; i < emails.length; i += 10) {
  const batch = emails.slice(i, i + 10)

  await Promise.all(batch.map(async email => {
    if (DRY_RUN) {
      console.log(`  [dry] → ${email}`)
      sent++
      return
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: email,
          subject: "You're on the Drift waitlist",
          html: buildEmailHtml(),
          text: buildEmailText(),
        }),
      })

      if (res.ok) {
        console.log(`  ✓ ${email}`)
        sent++
      } else {
        const err = await res.json()
        console.error(`  ✗ ${email} — ${err.message || res.status}`)
        failed++
      }
    } catch (e) {
      console.error(`  ✗ ${email} — ${e.message}`)
      failed++
    }
  }))

  if (i + 10 < emails.length) await sleep(1000)
}

console.log(`\n${DRY_RUN ? 'Dry run complete' : 'Done'}: ${sent} sent, ${failed} failed\n`)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

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
                to open the overlay and see what drift looks like on a real product.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#4f8ef7;border-radius:8px;">
                    <a href="https://design-drift.pages.dev?demo=1"
                       style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Try the demo →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 4px;font-size:15px;line-height:1.8;color:#9999b0;">
                One question while you wait: what's the biggest way your UI has drifted from your design system?
                Hit reply — we read every one.
              </p>
              <p style="margin:28px 0 0;font-size:14px;color:#6b6b82;">— Dave @ Drift</p>
            </td>
          </tr>
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

In the meantime — the live demo is up. Press D on any screen to open the overlay and see what drift looks like on a real product.

Try the demo: https://design-drift.pages.dev?demo=1

One question while you wait: what's the biggest way your UI has drifted from your design system? Hit reply — we read every one.

— Dave @ Drift

---
You signed up at catchdrift.ai. No spam, ever.`
}
