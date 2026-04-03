/**
 * DesignDrift — shared type definitions
 * ──────────────────────────────────────
 * Import these types when building your own config or extending the tool.
 */

/** Metadata for an approved gap — a custom component intentionally outside the DS. */
export interface ApprovedGapEntry {
  /** Why this component is exempt from DS coverage requirements. */
  rationale: string
  /** Who approved this exception. */
  approvedBy: string
  /** ISO date when the exception was approved. */
  approvedAt: string
  /** Whether to propose this component for DS inclusion in the future. */
  promoteToDS: boolean
}

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

  /** Deployed Storybook URL (Chromatic, Netlify, etc.) — used for public links.
   *  When set, overlay Storybook links point here instead of localhost.
   *  e.g. 'https://main--abc123.chromatic.com' */
  chromaticUrl?: string

  /** Figma file key — used by figma-sync to pull tokens and icons.
   *  Found in the Figma file URL: figma.com/design/{fileKey}/...  */
  figmaFileKey?: string

  /** Jira base URL — used by the overlay to create real ticket links.
   *  e.g. 'https://yourcompany.atlassian.net' */
  jiraBaseUrl?: string

  /** Jira project key — pre-fills the project when creating tickets.
   *  e.g. 'DS' or 'DESIGN' */
  jiraProjectKey?: string

  /** Figma page to push new/proposed components to.
   *  When drift-push creates a component spec, it targets this page.
   *  e.g. '🚧 In Progress' or 'Proposals' or 'Component Library'
   *  If not set, drift-push will list available pages and ask. */
  figmaProposalsPage?: string

  /** Minimum DS coverage % for CI to pass (0–100).
   *  Used by the drift-check CLI. Default: 80 */
  threshold?: number

  /** Map of React component display name → component metadata.
   *  Keys must match exactly what fiber.type.name returns at runtime. */
  components: Record<string, ComponentEntry>

  /** Components intentionally outside the DS — excluded from coverage calculations.
   *  Keys must match the component's display name exactly. */
  approvedGaps?: Record<string, ApprovedGapEntry>
}
