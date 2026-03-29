export interface DriftComponentEntry {
  /** Storybook story ID for "Open in Storybook" links.
   *  Format: '{group}-{component-name}--{story-name}'
   *  e.g. 'primitives-button--primary' */
  storyPath?: string
  /** Direct Figma component URL for design reference links. */
  figmaLink?: string
}

export interface DriftConfig {
  /** Your component registry — every component in your design system. */
  components: Record<string, DriftComponentEntry>
  /** Storybook base URL (local or Chromatic). Default: 'http://localhost:6006' */
  storybookUrl?: string
  /** Deployed Storybook URL (Chromatic, Netlify, etc.) for public links. */
  chromaticUrl?: string
  /** Figma file key — enables "Open in Figma" links. */
  figmaFileKey?: string
  /** Jira base URL for one-click ticket creation. */
  jiraBaseUrl?: string
  /** Jira project key to pre-fill tickets. */
  jiraProjectKey?: string
  /** Coverage threshold 0–100 for CI. Default: 80 */
  threshold?: number
}
