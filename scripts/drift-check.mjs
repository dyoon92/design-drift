#!/usr/bin/env node
/**
 * drift-check.mjs
 * ───────────────
 * CI-safe design drift checker using Playwright headless browser.
 * Navigates to a running app URL, injects the fiber scanner + token checker,
 * prints a coverage report, and exits non-zero if coverage < threshold.
 *
 * Usage:
 *   node scripts/drift-check.mjs [options]
 *
 * Options:
 *   --url <url>          App URL to scan (default: http://localhost:5173)
 *   --threshold <n>      Minimum DS coverage % to pass (default: 80)
 *   --routes <r1,r2>     Comma-separated routes to scan (default: /)
 *   --strict             Exit 1 on any violation (overrides --threshold)
 *   --json               Output JSON instead of human-readable text
 *   --help               Show this help
 *
 * Example (GitHub Actions):
 *   npx vite build && npx vite preview &
 *   node scripts/drift-check.mjs --url http://localhost:4173 --threshold 85
 */

import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null }
const has = (flag) => args.includes(flag)

if (has('--help')) {
  console.log(`
  drift-check — Design Drift CI checker

  Usage: node scripts/drift-check.mjs [options]

  Options:
    --url <url>        App URL to scan (default: http://localhost:5173)
    --threshold <n>    Minimum DS coverage % to pass (default: 80)
    --routes <list>    Comma-separated routes, e.g. /,/tenants (default: /)
    --strict           Fail on any gap or drift violation
    --json             Output machine-readable JSON
    --help             Show this help
  `)
  process.exit(0)
}

const BASE_URL  = get('--url')       ?? 'http://localhost:5173'
const THRESHOLD = parseInt(get('--threshold') ?? '80', 10)
const ROUTES    = (get('--routes') ?? '/').split(',').map(r => r.trim())
const STRICT    = has('--strict')
const JSON_OUT  = has('--json')

// ─── Load config for component list ──────────────────────────────────────────

let DS_COMPONENTS_LIST = []

// Try to load from built manifest (ts-node free approach: read config.ts as text)
const configPath = resolve(ROOT, 'src/ds-coverage/config.ts')
if (existsSync(configPath)) {
  const src = readFileSync(configPath, 'utf8')
  // Extract component names from the object keys — simple regex, no AST needed
  const matches = src.match(/^\s{4}(\w+):\s*\{/gm) ?? []
  DS_COMPONENTS_LIST = matches.map(m => m.trim().replace(/:\s*\{.*/, ''))
}

if (DS_COMPONENTS_LIST.length === 0) {
  console.warn('⚠  Could not read component list from src/ds-coverage/config.ts — using empty set')
}

// ─── Serialisable scanner (injected into the page via page.evaluate) ──────────
// Must be a self-contained string — no imports, no closures over Node vars.

const DS_SET_JSON = JSON.stringify(DS_COMPONENTS_LIST)

const INJECTED_SCANNER = `
(function() {
  const DS_COMPONENTS = new Set(${DS_SET_JSON});

  // React internals to skip
  const REACT_INTERNALS = new Set([
    'StrictMode','Suspense','SuspenseList','Fragment','Profiler',
    'ConcurrentMode','ContextConsumer','ContextProvider',
    'ForwardRef','Memo','LazyComponent',
  ]);
  const OVERLAY_NAMES = new Set([
    'DSCoverageOverlay','OverlayBox','SummaryPanel','PropsPanel',
    'ToggleButton','CoverageBar','MiniBar','TabBar','ScanIcon','ThemeCtx',
  ]);

  function resolveName(fiber) {
    const type = fiber.type;
    if (!type || typeof type === 'string') return null;
    const name = type.displayName || type.name ||
      (typeof type === 'object' && (type.render?.displayName ?? type.render?.name)) || '';
    if (!name) return null;
    if (name.startsWith('_')) return null;
    const first = name.charCodeAt(0);
    if (first < 65 || first > 90) return null;
    if (REACT_INTERNALS.has(name)) return null;
    if (OVERLAY_NAMES.has(name)) return null;
    if (name.includes('Provider') || name.includes('Consumer')) return null;
    return name;
  }

  function findFiberOnElement(el) {
    const props = Object.getOwnPropertyNames(el);
    for (const key of props) {
      if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
        const fiber = el[key];
        if (fiber) return fiber;
      }
    }
    return null;
  }

  function walkToRoot(fiber) {
    let f = fiber;
    while (f.return) f = f.return;
    return f;
  }

  function walkDown(rootFiber) {
    const stack = [rootFiber];
    const out = [];
    while (stack.length > 0) {
      const fiber = stack.pop();
      if (!fiber) continue;
      const name = resolveName(fiber);
      if (name) {
        out.push({ name, inDS: DS_COMPONENTS.has(name) });
        if (DS_COMPONENTS.has(name)) {
          if (fiber.sibling) stack.push(fiber.sibling);
          continue;
        }
      }
      if (fiber.sibling) stack.push(fiber.sibling);
      if (fiber.child)   stack.push(fiber.child);
    }
    return out;
  }

  // Find root fiber
  let startFiber = null;
  const rootEl = document.getElementById('root');
  if (rootEl) {
    startFiber = findFiberOnElement(rootEl);
    if (!startFiber) {
      for (const el of Array.from(rootEl.querySelectorAll('*')).slice(0, 50)) {
        startFiber = findFiberOnElement(el);
        if (startFiber) break;
      }
    }
  }
  if (!startFiber) {
    for (const el of Array.from(document.querySelectorAll('div,main,nav,header')).slice(0, 30)) {
      startFiber = findFiberOnElement(el);
      if (startFiber) break;
    }
  }
  if (!startFiber) return { error: 'Could not find React fiber root' };

  const rootFiber = walkToRoot(startFiber);
  const components = walkDown(rootFiber);

  // Count
  const total = components.length;
  const ds    = components.filter(c => c.inDS).length;
  const gaps  = components.filter(c => !c.inDS);
  const pct   = total ? Math.round((ds / total) * 100) : 0;

  // Gap frequency map
  const gapMap = {};
  gaps.forEach(c => { gapMap[c.name] = (gapMap[c.name] || 0) + 1; });

  // Token violations (inline hardcoded colors)
  const HEX_RE  = /#[0-9a-fA-F]{3,8}\\b/;
  const RGB_RE  = /rgba?\\s*\\(/i;
  const COLOR_PROPS = new Set([
    'color','background','background-color','backgroundColor',
    'border-color','borderColor',
  ]);
  const tally = {};
  document.querySelectorAll('[style]').forEach(el => {
    const style = el.style;
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      if (!COLOR_PROPS.has(prop)) continue;
      const value = style.getPropertyValue(prop).trim();
      if (!value || value.startsWith('var(')) continue;
      if (!HEX_RE.test(value) && !RGB_RE.test(value)) continue;
      const key = prop + '||' + value;
      tally[key] = (tally[key] || 0) + 1;
    }
  });
  const tokenViolations = Object.entries(tally)
    .map(([key, count]) => { const [prop, value] = key.split('||'); return { prop, value, count }; })
    .sort((a, b) => b.count - a.count);

  return { pct, total, ds, gapMap, tokenViolations };
})()
`

// ─── Report formatter ─────────────────────────────────────────────────────────

function formatReport(route, result) {
  const lines = []
  const { pct, total, ds, gapMap, tokenViolations, error } = result

  if (error) {
    lines.push(`  ❌ ${route} — ${error}`)
    return lines.join('\n')
  }

  const icon = pct >= THRESHOLD ? '✅' : '⚠️ '
  lines.push(`  ${icon} ${route} — ${pct}% DS coverage (${ds}/${total} components)`)

  if (Object.keys(gapMap).length > 0) {
    lines.push('     Gaps:')
    Object.entries(gapMap).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([name, count]) => {
      lines.push(`       • ${name} ×${count}`)
    })
  }

  if (tokenViolations.length > 0) {
    lines.push(`     Token violations: ${tokenViolations.length} hardcoded colors`)
    tokenViolations.slice(0, 5).forEach(v => {
      lines.push(`       • ${v.prop}: ${v.value} (×${v.count})`)
    })
  }

  return lines.join('\n')
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page    = await browser.newPage()

  const allResults = []
  let passed = true

  if (!JSON_OUT) {
    console.log(`\n🔍 DesignDrift CI Check`)
    console.log(`   URL:       ${BASE_URL}`)
    console.log(`   Routes:    ${ROUTES.join(', ')}`)
    console.log(`   Threshold: ${THRESHOLD}%`)
    console.log(`   DS components in manifest: ${DS_COMPONENTS_LIST.length}`)
    console.log()
  }

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route}`
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
      // Give React a moment to finish rendering
      await page.waitForTimeout(500)

      const result = await page.evaluate(INJECTED_SCANNER)
      allResults.push({ route, ...result })

      if (!JSON_OUT) {
        console.log(formatReport(route, result))
      }

      if (result.error) {
        passed = false
      } else if (STRICT && (Object.keys(result.gapMap ?? {}).length > 0 || result.tokenViolations?.length > 0)) {
        passed = false
      } else if (result.pct < THRESHOLD) {
        passed = false
      }
    } catch (err) {
      allResults.push({ route, error: String(err) })
      if (!JSON_OUT) console.log(`  ❌ ${route} — ${err.message}`)
      passed = false
    }
  }

  await browser.close()

  if (JSON_OUT) {
    console.log(JSON.stringify({ threshold: THRESHOLD, passed, routes: allResults }, null, 2))
  } else {
    console.log()
    if (passed) {
      console.log('✅ Drift check passed.\n')
    } else {
      console.log(`❌ Drift check failed — coverage below ${THRESHOLD}% or violations found.\n`)
    }
  }

  process.exit(passed ? 0 : 1)
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
