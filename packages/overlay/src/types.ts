export interface DriftComponentEntry {
  /** Storybook story ID for "Open in Storybook" links.
   *  Format: '{group}-{component-name}--{story-name}'
   *  e.g. 'primitives-button--primary' */
  storyPath?: string
  /** Direct Figma component URL for design reference links. */
  figmaLink?: string
}

export interface DriftFigmaFile {
  key: string
  componentPages?: string[]
}

export interface DriftConfig {
  /** Your component registry — every component in your design system. */
  components: Record<string, DriftComponentEntry>
  /** Storybook base URL (local or Chromatic). Default: 'http://localhost:6006' */
  storybookUrl?: string
  /** Deployed Storybook URL (Chromatic, Netlify, etc.) for public links. */
  chromaticUrl?: string
  /** Figma file key (compact form for single-file setups). */
  figmaFileKey?: string
  /** Pages in the single Figma file that contain published DS components. */
  figmaComponentPages?: string[]
  /** Multi-file Figma setup — components spread across multiple files. */
  figmaFiles?: DriftFigmaFile[]
  /** npm package names / path prefixes that contain your DS components. */
  dsPackages?: string[]
  /** Jira base URL for one-click ticket creation. */
  jiraBaseUrl?: string
  /** Jira project key to pre-fill tickets. */
  jiraProjectKey?: string
  /** Coverage threshold 0–100 for CI. Default: 80 */
  threshold?: number
  /** Figma personal access token — read from env var at runtime so it's never committed.
   *  e.g. figmaToken: import.meta.env.VITE_FIGMA_TOKEN
   *  The overlay will seed this into localStorage so the promote flow can use it. */
  figmaToken?: string
}
