import { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clickModificationsTab() {
  const tabs = document.querySelectorAll<HTMLElement>('[data-dd-tabs] button')
  const tab = Array.from(tabs).find(b => b.textContent?.includes('Modifications'))
  tab?.click()
}

function retryUntil(fn: () => boolean, intervalMs = 150, maxAttempts = 12) {
  if (fn()) return
  let attempts = 0
  const id = setInterval(() => {
    if (fn() || ++attempts >= maxAttempts) clearInterval(id)
  }, intervalMs)
}

// ─── Tour ─────────────────────────────────────────────────────────────────────

export function GuidedTour({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const driverObj = driver({
      showProgress: false,
      animate: true,
      overlayOpacity: 0.65,
      smoothScroll: true,
      allowClose: true,
      overlayColor: '#000',
      stagePadding: 10,
      stageRadius: 12,
      popoverClass: 'dd-tour-popover',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Start exploring →',
      onDestroyStarted: () => {
        driverObj.destroy()
        onDismiss()
      },
      steps: [
        {
          // Step 1 — no element, centered welcome
          popover: {
            title: 'Welcome to the DesignDrift demo',
            description: "You're looking at Monument — a real React property management app built with a design system. DesignDrift scans it live and flags anything that's drifted from your tokens.",
            side: 'over' as const,
            align: 'center',
          },
        },
        {
          // Step 2 — spotlight the toggle button
          element: '[data-dd-toggle]',
          popover: {
            title: 'The DesignDrift button',
            description: 'This floating button lives in the corner of your app during development. The numbers show how many components are drifting from your design tokens.',
            side: 'top' as const,
            align: 'end',
          },
        },
        {
          // Step 3 — spotlight the panel (auto-open it first)
          element: '[data-dd-panel]',
          popover: {
            title: 'The overlay panel',
            description: 'The panel shows every React component on the page — which are from your design system, which are custom-built, and which have hardcoded styles overriding your tokens.',
            side: 'left' as const,
            align: 'center',
            onNextClick: () => {
              // Clicking Modifications happens on step 4 enter — move to next
              driverObj.moveNext()
            },
          },
          onHighlightStarted: () => {
            // Open the panel if not already open
            if (!document.querySelector('[data-dd-panel]')) {
              document.querySelector<HTMLElement>('[data-dd-toggle] button')?.click()
            }
          },
        },
        {
          // Step 4 — spotlight tabs, auto-click Modifications
          element: '[data-dd-tabs]',
          popover: {
            title: 'Overview · Modifications · Style issues',
            description: "Tabs let you switch views. 'Modifications' shows DS components overridden with custom styles — the most common source of drift. 'Style issues' catches hardcoded colors outside your token set.",
            side: 'left' as const,
            align: 'start',
          },
          onHighlightStarted: () => {
            retryUntil(() => {
              const tabs = document.querySelectorAll<HTMLElement>('[data-dd-tabs] button')
              const tab = Array.from(tabs).find(b => b.textContent?.includes('Modifications'))
              if (!tab) return false
              tab.click()
              return true
            })
          },
        },
        {
          // Step 5 — spotlight drift summary
          element: '[data-dd-drift-summary]',
          popover: {
            title: 'Drift violations',
            description: 'Each card is a design system component with custom styles applied on top. Click any card to open the inspector — see exactly which props are drifting and get a one-click AI fix.',
            side: 'left' as const,
            align: 'start',
          },
          onHighlightStarted: () => {
            // Ensure Modifications tab is active
            retryUntil(() => {
              clickModificationsTab()
              return !!document.querySelector('[data-dd-drift-summary]')
            })
          },
        },
        {
          // Step 6 — done, centered
          popover: {
            title: "That's the full loop",
            description: 'DesignDrift rescans every time the DOM changes — so when you or your AI assistant pushes new code, drift is caught immediately. No CI step required during development.',
            side: 'over' as const,
            align: 'center',
          },
        },
      ],
    })

    driverObj.drive()

    return () => {
      driverObj.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
