/**
 * DesignDrift Storybook Addon
 * ───────────────────────────
 * Adds a "Drift" panel tab to every story showing:
 *   - DS coverage % for the rendered story
 *   - Token violations (hardcoded colors/radii)
 *   - Which components in this story are DS vs custom
 *
 * Registration: added to .storybook/main.ts addons array as
 *   '../src/storybook-addon'
 */

import { addons, types } from 'storybook/internal/manager-api'
import { ADDON_ID, PANEL_ID, PANEL_TITLE } from './constants'

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type:  types.PANEL,
    title: PANEL_TITLE,
    match: ({ viewMode }) => viewMode === 'story',
    render: ({ active }) => {
      if (!active) return null
      // Panel is lazy-loaded to avoid slowing down Storybook startup
      const { DriftPanel } = require('./Panel')
      return DriftPanel({ active })
    },
  })
})
