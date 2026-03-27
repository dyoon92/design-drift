/**
 * decorator.tsx — wraps every story and listens for scan requests.
 * Lives in the preview iframe (where React renders).
 * Communicates scan results back to the panel via Storybook's channel.
 */

import React, { useEffect, useRef } from 'react'
import type { Decorator } from '@storybook/react'
import { addons } from 'storybook/internal/preview-api'
import { CHANNEL_SCAN_REQUEST, CHANNEL_SCAN_RESULT } from './constants'
import { DS_COMPONENTS } from '../ds-coverage/manifest'
import { scanFiberTree } from '../ds-coverage/fiberScanner'
import { scanTokenViolations } from '../ds-coverage/tokenChecker'

export const DriftDecorator: Decorator = (Story, _context) => {
  const mountedRef = useRef(false)
  const channel    = addons.getChannel()

  const runScan = () => {
    try {
      const raw        = scanFiberTree(true)
      const total      = raw.length
      const ds         = raw.filter(c => c.inDS).length
      const pct        = total ? Math.round((ds / total) * 100) : 0

      const gapMap: Record<string, number> = {}
      raw.filter(c => !c.inDS).forEach(c => { gapMap[c.name] = (gapMap[c.name] ?? 0) + 1 })
      const gaps = Object.entries(gapMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))

      const tokenViolations = scanTokenViolations()

      channel.emit(CHANNEL_SCAN_RESULT, { pct, total, ds, gaps, tokenViolations })
    } catch (err) {
      channel.emit(CHANNEL_SCAN_RESULT, {
        error: String(err), pct: 0, total: 0, ds: 0, gaps: [], tokenViolations: [],
      })
    }
  }

  useEffect(() => {
    channel.on(CHANNEL_SCAN_REQUEST, runScan)

    // Auto-scan on first story render
    if (!mountedRef.current) {
      mountedRef.current = true
      // Two rAF delays to ensure the story has finished rendering
      requestAnimationFrame(() => requestAnimationFrame(runScan))
    }

    return () => { channel.off(CHANNEL_SCAN_REQUEST, runScan) }
  }, [])

  // Re-scan when story changes
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(runScan))
  }, [_context.id])

  return <Story />
}
