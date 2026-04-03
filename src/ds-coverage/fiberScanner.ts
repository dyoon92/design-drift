/**
 * Fiber Tree Scanner
 * ─────────────────
 * Walks the live React fiber tree and classifies every rendered component as
 * a known DS component or a custom gap.
 *
 * Accesses React internals via the __reactFiber$ key React attaches to DOM
 * nodes. Dev-only — intentionally fragile is fine.
 */

import { DS_COMPONENTS, APPROVED_GAPS, APPROVED_GAPS_DESCEND } from './manifest'
import type { DriftViolation } from './tokenChecker'

export interface ScannedComponent {
  name: string
  inDS: boolean
  drifted: boolean
  driftViolations: DriftViolation[]
  rect: DOMRect
  element: Element
  fiber: any
}

// React-internal names to skip
const REACT_INTERNALS = new Set([
  'StrictMode', 'Suspense', 'SuspenseList', 'Fragment',
  'Profiler', 'ConcurrentMode',
  'ContextConsumer', 'ContextProvider',
  'ForwardRef', 'Memo', 'LazyComponent',
])

// Overlay root selector — any component whose DOM element lives inside here is excluded.
// Robust against component renames; no manual name list to maintain.
const OVERLAY_SELECTOR = '[data-ds-overlay]'

/** Resolve a component name from a fiber, or null if it should be skipped. */
function resolveName(fiber: any): string | null {
  const type = fiber.type
  if (!type || typeof type === 'string') return null // host element

  const name: string =
    type.displayName ||
    type.name ||
    (typeof type === 'object' &&
      (type.render?.displayName ?? type.render?.name)) ||
    ''

  if (!name) return null
  if (name.startsWith('_')) return null
  // Must start with uppercase A-Z
  const first = name.charCodeAt(0)
  if (first < 65 || first > 90) return null
  // Filter out minified names from third-party libraries (e.g. "Ut", "Kt").
  // No real component has a name shorter than 3 characters.
  if (name.length < 3) return null
  if (REACT_INTERNALS.has(name)) return null
  if (name.includes('Provider') || name.includes('Consumer')) return null

  return name
}

/**
 * Walk down this fiber's children to find the first real DOM Element.
 * Function-component fibers don't own DOM nodes directly — we descend.
 */
function findDOMElement(fiber: any): Element | null {
  let child = fiber.child
  while (child) {
    if (typeof child.type === 'string' && child.stateNode instanceof Element) {
      return child.stateNode
    }
    const deeper = findDOMElement(child)
    if (deeper) return deeper
    child = child.sibling
  }
  return null
}

/** Iterative pre-order walk (avoids call-stack overflow).
 *  surfaceMode: stop descending into DS components (hides internal helpers). */
function walkDown(rootFiber: any, out: ScannedComponent[], surfaceMode: boolean): void {
  const stack: any[] = [rootFiber]
  while (stack.length > 0) {
    const fiber = stack.pop()
    if (!fiber) continue

    const name = resolveName(fiber)
    if (name) {
      const element = findDOMElement(fiber)
      if (element) {
        // Skip anything rendered inside the Drift overlay itself
        if (element.closest(OVERLAY_SELECTOR)) {
          if (fiber.sibling) stack.push(fiber.sibling)
          continue
        }
        const rect = element.getBoundingClientRect()
        if (rect.width > 0 || rect.height > 0) {
          const inDS = DS_COMPONENTS.has(name)
          // Approved gaps are excluded from coverage — never pushed to results.
          // descendInto=true (view wrappers): skip the component but keep
          //   walking children so DS components inside are still detected.
          // descendInto=false/unset (marketing surfaces, tooling): stop here,
          //   children are also excluded.
          if (APPROVED_GAPS.has(name)) {
            if (fiber.sibling) stack.push(fiber.sibling)
            if (APPROVED_GAPS_DESCEND.has(name) && fiber.child) stack.push(fiber.child)
            continue
          }
          out.push({ name, inDS, drifted: false, driftViolations: [], rect, element, fiber })
          if (surfaceMode && inDS) {
            // Don't descend into DS component internals
            if (fiber.sibling) stack.push(fiber.sibling)
            continue
          }
        }
      }
    }

    // Push sibling before child — LIFO gives child-first traversal
    if (fiber.sibling) stack.push(fiber.sibling)
    if (fiber.child)   stack.push(fiber.child)
  }
}

/**
 * Find any React fiber attached to a DOM element.
 * React attaches __reactFiber$<hash> to every element it manages.
 */
function findFiberOnElement(el: Element): any | null {
  // getOwnPropertyNames is more reliable than Object.keys on DOM elements
  const props = Object.getOwnPropertyNames(el)
  for (const key of props) {
    if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
      const fiber = (el as any)[key]
      if (fiber) return fiber
    }
  }
  return null
}

/** Walk UP the fiber tree to find the root (return === null). */
function walkToRoot(fiber: any): any {
  let f = fiber
  while (f.return) f = f.return
  return f
}

/**
 * Compute a lightweight hash of a scanned component list.
 * Used for cache-key comparison — if the hash matches the previous scan for
 * this route, we can skip the expensive drift-violation analysis pass.
 */
export function hashComponents(components: ScannedComponent[]): string {
  return components.map(c => c.name).sort().join(',')
}

/** Scan the live React fiber tree and return all visible component instances.
 *  surfaceMode (default true): stops descending into known DS components so
 *  internal helpers don't appear as red "gaps" inside green DS components. */
export function scanFiberTree(surfaceMode = true): ScannedComponent[] {
  // Strategy 1: find fiber on #root container (where React's createRoot attaches it)
  let startFiber: any = null

  const rootEl = document.getElementById('root')
  if (rootEl) {
    startFiber = findFiberOnElement(rootEl)
  }

  // Strategy 2: scan child elements of #root for any React fiber
  if (!startFiber && rootEl) {
    for (const el of Array.from(rootEl.querySelectorAll('*')).slice(0, 50)) {
      startFiber = findFiberOnElement(el)
      if (startFiber) break
    }
  }

  // Strategy 3: scan the whole document
  if (!startFiber) {
    for (const el of Array.from(document.querySelectorAll('div,main,nav,header,aside,section')).slice(0, 30)) {
      startFiber = findFiberOnElement(el)
      if (startFiber) break
    }
  }

  if (!startFiber) {
    console.warn('[DS Coverage] Could not find React fiber on any DOM element. Is React 19 running?')
    return []
  }

  // Walk up to the HostRoot fiber and then do a full downward walk
  const rootFiber = walkToRoot(startFiber)

  const results: ScannedComponent[] = []
  walkDown(rootFiber, results, surfaceMode)

  console.debug(`[DS Coverage] Scanned ${results.length} components (${results.filter(r => r.inDS).length} DS, ${results.filter(r => !r.inDS).length} custom)`)
  return results
}
