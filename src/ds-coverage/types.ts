/**
 * DesignDrift — shared type definitions
 * ──────────────────────────────────────
 * Import these types when building your own config or extending the tool.
 */

/** Metadata for a single design system component. */
export interface ComponentEntry {
  /** Storybook story ID — used to build the "Open in Storybook" link.
   *  Format: '{group}-{component-name}--{story-name}'
   *  e.g. 'primitives-button--primary'
   *  Leave undefined to suppress the Storybook badge. */
  storyPath?: string

  /** Full Figma node URL for this component.
   *  e.g. 'https://www.figma.com/design/ABC123/MyApp?node-id=1-2'
   *  Leave undefined to suppress the Figma badge. */
  figmaLink?: string
}

/** Top-level config consumed by DesignDrift. */
export interface DesignDriftConfig {
  /** Base URL of your Storybook instance (no trailing slash).
   *  Default: 'http://localhost:6006' */
  storybookUrl?: string

  /** Figma file key — used by figma-sync to pull tokens and icons.
   *  Found in the Figma file URL: figma.com/design/{fileKey}/...  */
  figmaFileKey?: string

  /** Minimum DS coverage % for CI to pass (0–100).
   *  Used by the drift-check CLI. Default: 80 */
  threshold?: number

  /** Map of React component display name → component metadata.
   *  Keys must match exactly what fiber.type.name returns at runtime. */
  components: Record<string, ComponentEntry>
}
