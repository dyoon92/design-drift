# Drift — Backend Engineer Guide

## What is Drift?

Drift is a developer tool that measures how consistently a product UI uses its design system. It runs as a floating overlay in any React app — press `D` in the browser and you see every component on screen classified as either a design-system component (green) or a custom one-off (red), with a live coverage percentage.

The current version is **100% client-side**. There is no backend. This document describes what the backend needs to do and how to get started.

---

## What the backend needs to do

Everything the overlay computes today lives in localStorage and is lost on refresh. The backend's job is to persist it, share it, and make it actionable across teams.

### Phase 1 — Persistence (highest priority)

| Endpoint | What it does |
|---|---|
| `POST /api/scans` | Save a coverage scan result (route, score, component list, timestamp) |
| `GET /api/scans?projectId=&route=` | Fetch scan history for a project/route |
| `GET /api/projects/:id/trend` | Return coverage % over time (used by the overlay history graph) |

A scan payload looks like this:
```json
{
  "projectId": "abc123",
  "route": "/dashboard",
  "score": 84,
  "ds": 18,
  "custom": 3,
  "gaps": ["QuickActionsBar", "DateRangePicker"],
  "timestamp": "2026-04-03T14:22:00Z"
}
```

### Phase 2 — Teams & sharing

| Endpoint | What it does |
|---|---|
| `POST /api/projects` | Create a project (ties scans to an org/repo) |
| `GET /api/projects/:id/report` | Public shareable report URL |
| `POST /api/waitlist` | Store waitlist sign-ups (currently hits a Cloudflare Pages Function at `/count`) |

### Phase 3 — Integrations

| Endpoint | What it does |
|---|---|
| `POST /api/webhooks/github` | Receive GitHub PR events → post drift delta as PR comment |
| `POST /api/ai/suggest` | Proxy to Claude API for "suggest DS replacement" in the overlay |
| `POST /api/ai/fix` | Proxy to Claude API for "generate fix" in the overlay |

The Claude API calls already exist in the overlay but call a local `drift-fix-server` (`npm run drift-fix-server`). These should move to proper API endpoints with auth.

---

## Current architecture

```
Browser (React app)
  └── DSCoverageOverlay.tsx     ← the overlay UI (360px panel, floating)
       ├── fiberScanner.ts       ← walks live React fiber tree, classifies components
       ├── tokenChecker.ts       ← finds hardcoded colors/spacing in inline styles
       ├── manifest.ts           ← derives DS component set from config
       └── config.ts             ← team's DS registry (which components are "DS")

scripts/
  ├── drift-check.mjs           ← CI headless check (exits 1 if below threshold)
  ├── drift-sync.mjs            ← scans imports → auto-populates config.components
  └── drift-fix-server.mjs      ← local Express server that proxies to Claude API

api-proxy/
  └── server.mjs                ← CORS proxy for Figma API calls

packages/
  ├── overlay/                  ← npm package (@catchdrift/overlay) — the embeddable overlay
  └── cli/                      ← npm package (@catchdrift/cli) — drift-check for CI
```

---

## How to run locally

```bash
# Install dependencies
npm install

# Start the demo app (port 5173) — press D to open the overlay
npm run dev

# Start Storybook component catalog (port 6006)
npm run storybook

# Run the local AI fix server (needed for "fix gap" feature)
npm run drift-fix-server
# Requires ANTHROPIC_API_KEY in your environment

# Auto-discover DS components from imports (updates config.ts)
npm run drift-sync

# CI coverage check (exits 1 if below threshold)
npm run drift-check
```

---

## Key files to know

| File | What it is |
|---|---|
| `src/ds-coverage/config.ts` | The DS registry — which components count as "design system" |
| `src/ds-coverage/DSCoverageOverlay.tsx` | The entire overlay UI (~4000 lines) |
| `src/ds-coverage/fiberScanner.ts` | React fiber tree walker — the core scanning engine |
| `src/ds-coverage/manifest.ts` | Derives runtime data structures from config |
| `src/landing/LandingPage.tsx` | Marketing landing page (design-drift.pages.dev) |
| `src/App.tsx` | Demo app — the product the overlay runs on top of |

---

## Environment variables needed

```
ANTHROPIC_API_KEY=          # For the AI fix/suggest features
FIGMA_ACCESS_TOKEN=         # For Figma MCP and token sync
CHROMATIC_PROJECT_TOKEN=    # For publishing Storybook to Chromatic
```

---

## Questions?

The overlay codebase is intentionally self-contained (no backend deps) so you can start reading `fiberScanner.ts` and `DSCoverageOverlay.tsx` to understand what data is being produced and what shape it needs to be persisted in.

Start with Phase 1 (persistence). The overlay already computes everything — it just needs a `POST /api/scans` to send results to.
