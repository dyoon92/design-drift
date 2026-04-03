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
  /**
   * When true, the fiber scanner skips this component from results but
   * continues descending into its children. Use for page-level view wrappers
   * that group DS components — you want their DS children counted.
   *
   * When false (default), the scanner skips this component AND stops
   * descending. Use for self-contained surfaces (marketing modals, tooling)
   * whose internal custom components should also be excluded.
   */
  descendInto?: boolean
}

/** Metadata for a single design system component. */
export interface ComponentEntry {
  /** Storybook story ID — used to build the "Open in Storybook" link and to
   *  validate that the component is still published. When provided, it is
   *  checked against the live Storybook index at runtime — if the story no
   *  longer exists, the component is automatically dropped from DS_COMPONENTS.
   *  When omitted, the component is trusted as-is (e.g. discovered via import
   *  scanning by drift-sync).
   *  Format: '{group}-{component-name}--{story-name}'
   *  e.g. 'primitives-button--primary' */
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

  /** npm package names or relative path prefixes that your DS components are
   *  imported from. Used by `npm run drift-sync` to auto-discover component
   *  names by scanning import statements — no manual registration needed.
   *  Examples: ['@acme/ui'] or ['./src/components', './src/stories']
   *  After adding this, run `npm run drift-sync` to populate `components`. */
  dsPackages?: string[]

  /** Map of React component display name → component metadata.
   *  Keys must match exactly what fiber.type.name returns at runtime.
   *  You can populate this manually or run `npm run drift-sync` to fill it
   *  automatically from import statements in your codebase. */
  components: Record<string, ComponentEntry>

  /** Components intentionally outside the DS — excluded from coverage calculations.
   *  Keys must match the component's display name exactly. */
  approvedGaps?: Record<string, ApprovedGapEntry>
}
