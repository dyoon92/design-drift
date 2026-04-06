/**
 * DriftOverlay — the public-facing wrapper component for @catchdrift/overlay.
 *
 * Accepts a `config` prop and renders the DSCoverageOverlay with that config
 * injected at runtime, so consuming apps don't need to touch any internal files.
 *
 * The heavy implementation lives in the monorepo at src/ds-coverage/.
 * This wrapper re-exports it with a clean, stable public API.
 */
import React, { useEffect } from 'react'
import type { DriftConfig } from './types'

interface DriftOverlayProps {
  config: DriftConfig
  /** Automatically open the overlay on mount. Default: false */
  autoOpen?: boolean
  /** Called when the user clicks the waitlist / upgrade CTA. */
  onOpenWaitlist?: () => void
}

// Lazy-load the heavy overlay to keep bundle impact minimal when
// the overlay is not open (it's toggled by pressing D).
const LazyOverlay = React.lazy(() =>
  import('./overlay-impl').then(m => ({ default: m.DSCoverageOverlayWithConfig }))
)

export function DriftOverlay({ config, autoOpen, onOpenWaitlist }: DriftOverlayProps) {
  // Expose config on window so the lazy-loaded impl can read it without
  // prop-drilling through internal boundaries.
  useEffect(() => {
    (window as any).__DRIFT_CONFIG__ = config
    return () => { delete (window as any).__DRIFT_CONFIG__ }
  }, [config])

  // Seed the Figma token into localStorage so the PromotePanel can use it.
  // config.figmaToken is read from an env var (VITE_FIGMA_TOKEN / NEXT_PUBLIC_FIGMA_TOKEN)
  // and is never committed to git — .env.local is gitignored.
  useEffect(() => {
    if (config.figmaToken) {
      localStorage.setItem('drift-figma-token', config.figmaToken)
    }
  }, [config.figmaToken])

  return (
    <React.Suspense fallback={null}>
      <LazyOverlay autoOpen={autoOpen} onOpenWaitlist={onOpenWaitlist} />
    </React.Suspense>
  )
}
