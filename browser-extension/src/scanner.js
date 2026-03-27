/**
 * scanner.js — shared fiber scanner logic
 * Runs in page context (injected via content script).
 * Must be self-contained: no imports, no module syntax.
 */

const REACT_INTERNALS = new Set([
  'StrictMode','Suspense','SuspenseList','Fragment','Profiler',
  'ConcurrentMode','ContextConsumer','ContextProvider',
  'ForwardRef','Memo','LazyComponent',
])

const OVERLAY_NAMES = new Set([
  'DSCoverageOverlay','OverlayBox','SummaryPanel','PropsPanel',
  'ToggleButton','CoverageBar','MiniBar','TabBar','ScanIcon','ThemeCtx',
  'DesignDriftExtension',
])

function resolveName(fiber) {
  const type = fiber.type
  if (!type || typeof type === 'string') return null
  const name = type.displayName || type.name ||
    (typeof type === 'object' && (type.render?.displayName ?? type.render?.name)) || ''
  if (!name) return null
  if (name.startsWith('_')) return null
  const first = name.charCodeAt(0)
  if (first < 65 || first > 90) return null
  if (REACT_INTERNALS.has(name)) return null
  if (OVERLAY_NAMES.has(name)) return null
  if (name.includes('Provider') || name.includes('Consumer')) return null
  return name
}

function findFiberOnElement(el) {
  const props = Object.getOwnPropertyNames(el)
  for (const key of props) {
    if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
      const fiber = el[key]
      if (fiber) return fiber
    }
  }
  return null
}

function walkToRoot(fiber) {
  let f = fiber
  while (f.return) f = f.return
  return f
}

function walkDown(rootFiber, dsComponents) {
  const stack = [rootFiber]
  const out = []
  while (stack.length > 0) {
    const fiber = stack.pop()
    if (!fiber) continue
    const name = resolveName(fiber)
    if (name) {
      const inDS = dsComponents.has(name)
      out.push({ name, inDS })
      if (inDS) {
        if (fiber.sibling) stack.push(fiber.sibling)
        continue
      }
    }
    if (fiber.sibling) stack.push(fiber.sibling)
    if (fiber.child)   stack.push(fiber.child)
  }
  return out
}

function findRootFiber() {
  let startFiber = null
  const rootEl = document.getElementById('root')
  if (rootEl) {
    startFiber = findFiberOnElement(rootEl)
    if (!startFiber) {
      for (const el of Array.from(rootEl.querySelectorAll('*')).slice(0, 50)) {
        startFiber = findFiberOnElement(el)
        if (startFiber) break
      }
    }
  }
  if (!startFiber) {
    for (const el of Array.from(document.querySelectorAll('div,main,nav,header,section')).slice(0, 30)) {
      startFiber = findFiberOnElement(el)
      if (startFiber) break
    }
  }
  return startFiber ? walkToRoot(startFiber) : null
}

function scanTokenViolations() {
  const COLOR_PROPS = new Set([
    'color','background','background-color','backgroundColor',
    'border-color','borderColor',
  ])
  const HEX_RE = /#[0-9a-fA-F]{3,8}\b/
  const RGB_RE = /rgba?\s*\(/i
  const tally = {}
  document.querySelectorAll('[style]').forEach(el => {
    const style = el.style
    for (let i = 0; i < style.length; i++) {
      const prop = style[i]
      if (!COLOR_PROPS.has(prop)) continue
      const value = style.getPropertyValue(prop).trim()
      if (!value || value.startsWith('var(')) continue
      if (!HEX_RE.test(value) && !RGB_RE.test(value)) continue
      const key = prop + '||' + value
      tally[key] = (tally[key] || 0) + 1
    }
  })
  return Object.entries(tally)
    .map(([key, count]) => { const [prop, value] = key.split('||'); return { prop, value, count } })
    .sort((a, b) => b.count - a.count)
}

// Exported as a global for content script to call
window.__DesignDriftScan = function(dsComponentsList) {
  const dsComponents = new Set(dsComponentsList)
  const rootFiber = findRootFiber()
  if (!rootFiber) return { error: 'React not found on this page', pct: 0, total: 0, ds: 0, gaps: [], tokenViolations: [] }

  const components = walkDown(rootFiber, dsComponents)
  const total = components.length
  const ds    = components.filter(c => c.inDS).length
  const pct   = total ? Math.round((ds / total) * 100) : 0

  const gapMap = {}
  components.filter(c => !c.inDS).forEach(c => { gapMap[c.name] = (gapMap[c.name] || 0) + 1 })
  const gaps = Object.entries(gapMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))

  const tokenViolations = scanTokenViolations()
  return { pct, total, ds, gaps, tokenViolations }
}
