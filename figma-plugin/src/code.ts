/**
 * code.ts — Figma plugin main thread
 * Scans the document for all components and component sets,
 * extracts metadata, and sends it to the UI for download.
 */

figma.showUI(__html__, { width: 380, height: 480, title: 'DesignDrift — Export Registry' })

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComponentMeta {
  name: string
  figmaNodeId: string
  figmaLink: string
  description?: string
  variants?: string[]
  /** Sanitized React display name (PascalCase, no spaces) */
  reactName: string
}

interface ExportManifest {
  figmaFileKey: string
  exportedAt: string
  componentCount: number
  /** Ready to paste into src/ds-coverage/config.ts */
  components: Record<string, { figmaLink: string; storyPath?: string }>
  /** Full metadata for reference */
  meta: ComponentMeta[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert any string to PascalCase React component name.
 * e.g. "Primary Button / Large" → "PrimaryButtonLarge"
 */
function toPascalCase(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')  // non-alphanumeric → space
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

/**
 * Extract the base component name from a variant name.
 * e.g. "Button/Primary/Large" → "Button"
 */
function baseName(name: string): string {
  return name.split('/')[0].trim()
}

// ─── Scanner ──────────────────────────────────────────────────────────────────

function scanComponents(): ComponentMeta[] {
  const fileKey = figma.fileKey ?? 'UNKNOWN'
  const seen = new Map<string, ComponentMeta>()

  // Walk all pages
  for (const page of figma.root.children) {
    const nodes = page.findAll(n =>
      n.type === 'COMPONENT' || n.type === 'COMPONENT_SET'
    ) as Array<ComponentNode | ComponentSetNode>

    for (const node of nodes) {
      // For component sets, use the set name; for standalone components, use the node name
      const rawName = node.type === 'COMPONENT_SET'
        ? node.name
        : baseName(node.name)

      const reactName = toPascalCase(rawName)
      if (!reactName || seen.has(reactName)) continue

      const nodeId  = node.id.replace(':', '-')
      const figmaLink = `https://www.figma.com/design/${fileKey}/${encodeURIComponent(figma.root.name)}?node-id=${nodeId}`

      const variants: string[] = []
      if (node.type === 'COMPONENT_SET') {
        for (const child of node.children) {
          if (child.type === 'COMPONENT') {
            variants.push(child.name)
          }
        }
      }

      seen.set(reactName, {
        name:       rawName,
        figmaNodeId: node.id,
        figmaLink,
        description: ('description' in node ? node.description : '') || undefined,
        variants:    variants.length > 0 ? variants : undefined,
        reactName,
      })
    }
  }

  return [...seen.values()].sort((a, b) => a.reactName.localeCompare(b.reactName))
}

// ─── Message handlers ─────────────────────────────────────────────────────────

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'SCAN') {
    const components = scanComponents()
    const fileKey    = figma.fileKey ?? 'UNKNOWN'

    // Build the config-ready format
    const configComponents: Record<string, { figmaLink: string; storyPath?: string }> = {}
    for (const c of components) {
      configComponents[c.reactName] = {
        figmaLink: c.figmaLink,
        // storyPath is left empty — developer fills this in after importing
      }
    }

    const manifest: ExportManifest = {
      figmaFileKey:     fileKey,
      exportedAt:       new Date().toISOString(),
      componentCount:   components.length,
      components:       configComponents,
      meta:             components,
    }

    figma.ui.postMessage({ type: 'SCAN_RESULT', manifest })
  }

  if (msg.type === 'CLOSE') {
    figma.closePlugin()
  }
}

// Auto-scan on open
figma.ui.postMessage({ type: 'READY' })
