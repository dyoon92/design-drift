/**
 * @catchdrift/overlay
 *
 * Drop-in design system coverage overlay for React apps.
 *
 * Usage:
 *   import { DriftOverlay } from '@catchdrift/overlay'
 *   import '@catchdrift/overlay/dist/index.css'  // optional reset
 *
 *   // In your app root (dev only):
 *   {process.env.NODE_ENV === 'development' && (
 *     <DriftOverlay
 *       config={{
 *         storybookUrl: 'https://your-storybook.chromatic.com',
 *         threshold: 80,
 *         components: {
 *           Button:   { storyPath: 'primitives-button--primary' },
 *           Modal:    { storyPath: 'primitives-modal--default' },
 *           Navbar:   { storyPath: 'shell-navbar--default' },
 *           // ... all your DS components
 *         }
 *       }}
 *     />
 *   )}
 *
 * Press D in the running app to open the overlay.
 */

export { DriftOverlay } from './DriftOverlay'
export type { DriftConfig, DriftComponentEntry } from './types'
