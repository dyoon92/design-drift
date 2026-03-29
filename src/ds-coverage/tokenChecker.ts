/**
 * Token Violation Checker
 * ───────────────────────
 * Scans DOM elements for inline style properties that use hardcoded color
 * values instead of CSS custom properties (var(--ds-color-*)).
 *
 * Only checks inline styles (the `style` attribute) — not computed styles —
 * because CLAUDE.md mandates inline-only styling, so violations always appear
 * as inline style props.
 */

export interface TokenViolation {
  prop:     string          // CSS property name, e.g. "background"
  value:    string          // the offending value, e.g. "#1a1a2e"
  count:    number          // how many DOM elements have this exact prop+value
  elements: HTMLElement[]   // actual DOM nodes (empty when loaded from cache)
}

// ─── Patterns that identify a hardcoded color ─────────────────────────────────
const HEX_RE  = /#[0-9a-fA-F]{3,8}\b/
const RGB_RE  = /rgba?\s*\(/i
const HSL_RE  = /hsla?\s*\(/i

function isHardcodedColor(value: string): boolean {
  if (!value || value.startsWith('var(')) return false
  return HEX_RE.test(value) || RGB_RE.test(value) || HSL_RE.test(value)
}

// CSS properties considered "color" — violations here break the token contract
const COLOR_PROPS = new Set([
  'color', 'background', 'background-color', 'backgroundColor',
  'border-color', 'borderColor',
  'border-top-color', 'borderTopColor',
  'border-right-color', 'borderRightColor',
  'border-bottom-color', 'borderBottomColor',
  'border-left-color', 'borderLeftColor',
  'outline-color', 'outlineColor',
  'fill', 'stroke', 'caret-color', 'caretColor',
  'text-decoration-color', 'textDecorationColor',
  'column-rule-color', 'columnRuleColor',
  // box-shadow can contain colors but is noisier — skip for now
])

export type DriftViolationType = 'color' | 'radius' | 'spacing' | 'font-size' | 'font-weight'
export interface DriftViolation { prop: string; value: string; type: DriftViolationType }

// Border-radius properties that should use var(--ds-border-radius-*)
const RADIUS_PROPS = new Set([
  'border-radius', 'borderRadius',
  'border-top-left-radius',    'borderTopLeftRadius',
  'border-top-right-radius',   'borderTopRightRadius',
  'border-bottom-left-radius', 'borderBottomLeftRadius',
  'border-bottom-right-radius','borderBottomRightRadius',
])

const PX_RE = /^\d+(\.\d+)?px$/

function isHardcodedRadius(value: string): boolean {
  if (!value || value.startsWith('var(')) return false
  if (value === '0' || value === '0px') return false
  return PX_RE.test(value) || value.includes('%')
}

// ─── Spacing ──────────────────────────────────────────────────────────────────
// Only flag values that exactly match a known DS spacing token.
// Arbitrary values (e.g. 17px) are intentional and should not be flagged.
const SPACING_PROPS = new Set([
  'padding', 'padding-top', 'paddingTop', 'padding-right', 'paddingRight',
  'padding-bottom', 'paddingBottom', 'padding-left', 'paddingLeft',
  'margin', 'margin-top', 'marginTop', 'margin-right', 'marginRight',
  'margin-bottom', 'marginBottom', 'margin-left', 'marginLeft',
  'gap', 'row-gap', 'rowGap', 'column-gap', 'columnGap',
])

// Values that map 1:1 to a DS spacing token
const SPACING_TOKEN_VALUES = new Set(['4px','8px','12px','16px','20px','24px','32px'])

function isHardcodedSpacing(value: string): boolean {
  if (!value || value.startsWith('var(')) return false
  return SPACING_TOKEN_VALUES.has(value.trim())
}

// ─── Font size ────────────────────────────────────────────────────────────────
const FONT_SIZE_PROPS  = new Set(['font-size', 'fontSize'])
const FONT_SIZE_TOKEN_VALUES = new Set(['12px','14px','15px'])

function isHardcodedFontSize(value: string): boolean {
  if (!value || value.startsWith('var(')) return false
  return FONT_SIZE_TOKEN_VALUES.has(value.trim())
}

// ─── Font weight ─────────────────────────────────────────────────────────────
const FONT_WEIGHT_PROPS = new Set(['font-weight', 'fontWeight'])
const FONT_WEIGHT_TOKEN_VALUES = new Set(['400','500','600','700'])

function isHardcodedFontWeight(value: string): boolean {
  if (!value || value.startsWith('var(')) return false
  return FONT_WEIGHT_TOKEN_VALUES.has(value.trim())
}

/**
 * Collect all unique style token violations in an element's subtree.
 * Detects: hardcoded colors (should be var(--ds-color-*))
 *          hardcoded border-radius (should be var(--ds-border-radius-*))
 */
export function getColorViolationsInSubtree(root: Element): DriftViolation[] {
  const seen = new Set<string>()
  const violations: DriftViolation[] = []
  const elements = [root, ...Array.from(root.querySelectorAll('[style]'))]
  for (const el of elements) {
    if ((el as HTMLElement).closest('[data-ds-overlay]')) continue
    const style = (el as HTMLElement).style
    for (let i = 0; i < style.length; i++) {
      const prop  = style[i]
      const value = style.getPropertyValue(prop).trim()
      let type: DriftViolationType | null = null
      if (COLOR_PROPS.has(prop)       && isHardcodedColor(value))      type = 'color'
      if (RADIUS_PROPS.has(prop)      && isHardcodedRadius(value))     type = 'radius'
      if (SPACING_PROPS.has(prop)     && isHardcodedSpacing(value))    type = 'spacing'
      if (FONT_SIZE_PROPS.has(prop)   && isHardcodedFontSize(value))   type = 'font-size'
      if (FONT_WEIGHT_PROPS.has(prop) && isHardcodedFontWeight(value)) type = 'font-weight'
      if (!type) continue
      const key = `${prop}||${value}`
      if (!seen.has(key)) { seen.add(key); violations.push({ prop, value, type }) }
    }
  }
  return violations
}

/** Fast boolean check — returns early on first hit. */
export function hasColorViolationsInSubtree(root: Element): boolean {
  return getColorViolationsInSubtree(root).length > 0
}

/**
 * Scan the entire page for inline color token violations.
 * Skips any element that lives inside a [data-ds-overlay] container
 * (i.e. the overlay tool itself).
 *
 * Returns a deduplicated list sorted by frequency (most common first).
 */
export function scanTokenViolations(): TokenViolation[] {
  const tally    = new Map<string, number>()          // key: "prop||value"
  const elsByKey = new Map<string, HTMLElement[]>()   // key: "prop||value" → elements

  const elements = document.querySelectorAll('[style]')
  for (const el of Array.from(elements)) {
    // Skip the overlay's own elements
    if ((el as HTMLElement).closest('[data-ds-overlay]')) continue

    const style = (el as HTMLElement).style
    for (let i = 0; i < style.length; i++) {
      const prop  = style[i]
      const value = style.getPropertyValue(prop).trim()
      const isViolation =
        (COLOR_PROPS.has(prop)       && isHardcodedColor(value))      ||
        (RADIUS_PROPS.has(prop)      && isHardcodedRadius(value))     ||
        (SPACING_PROPS.has(prop)     && isHardcodedSpacing(value))    ||
        (FONT_SIZE_PROPS.has(prop)   && isHardcodedFontSize(value))   ||
        (FONT_WEIGHT_PROPS.has(prop) && isHardcodedFontWeight(value))
      if (!isViolation) continue

      const key = `${prop}||${value}`
      tally.set(key, (tally.get(key) ?? 0) + 1)
      const arr = elsByKey.get(key) ?? []
      arr.push(el as HTMLElement)
      elsByKey.set(key, arr)
    }
  }

  return [...tally.entries()]
    .map(([key, count]) => {
      const [prop, value] = key.split('||')
      return { prop, value, count, elements: elsByKey.get(key) ?? [] }
    })
    .sort((a, b) => b.count - a.count)
}
