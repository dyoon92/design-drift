import { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

function retryUntil(fn: () => boolean, intervalMs = 150, maxAttempts = 12) {
  if (fn()) return
  let attempts = 0
  const id = setInterval(() => {
    if (fn() || ++attempts >= maxAttempts) clearInterval(id)
  }, intervalMs)
}

export function GuidedTour({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const driverObj = driver({
      showProgress: false,
      animate: true,
      overlayOpacity: 0.6,
      smoothScroll: true,
      allowClose: true,
      stagePadding: 10,
      stageRadius: 12,
      // Transparent overlay so no white box flashes behind elements
      overlayColor: 'transparent',
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
          popover: {
            title: 'Welcome to the DesignDrift demo',
            description: "You're looking at Monument — a real React property management app built with a design system. DesignDrift scans it live and flags anything that's drifted from your tokens.",
            side: 'over' as const,
            align: 'center',
          },
        },
        {
          element: '[data-dd-toggle]',
          popover: {
            title: 'The DesignDrift button',
            description: 'This floating button lives in the corner of your app. The numbers show how many components are drifting from your design tokens. Click it to open the panel.',
            side: 'top' as const,
            align: 'end',
          },
          onHighlightStarted: () => {
            // Close panel if open so this step always starts fresh
            if (document.querySelector('[data-dd-panel]')) {
              document.querySelector<HTMLElement>('[data-dd-toggle] button')?.click()
            }
          },
        },
        {
          element: '[data-dd-panel]',
          popover: {
            title: 'The overlay panel',
            description: 'The panel shows every React component on the page — which are from your design system, which are custom-built, and which have hardcoded styles overriding your tokens.',
            side: 'left' as const,
            align: 'center',
          },
          onHighlightStarted: () => {
            if (!document.querySelector('[data-dd-panel]')) {
              document.querySelector<HTMLElement>('[data-dd-toggle] button')?.click()
            }
          },
        },
        {
          element: '[data-dd-tabs]',
          popover: {
            title: 'Modifications tab',
            description: "The Modifications tab shows every DS component with custom styles applied on top. Each card lists the drifting CSS properties and the token that should replace them — click any card to open the inspector and get an AI fix.",
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
          element: '[data-dd-panel]',
          popover: {
            title: 'Inspect any component',
            description: "Click any red badge on the canvas to open the inspector. You'll see exactly which props are hardcoded, what token to use instead, and a one-click AI fix — like this OccupancyWidget.",
            side: 'left' as const,
            align: 'center',
          },
          onHighlightStarted: () => {
            // Click the first gap badge to open PropsPanel
            retryUntil(() => {
              const badge = document.querySelector<HTMLElement>('[data-dd-gap-badge]')
              if (!badge) return false
              badge.click()
              return true
            })
          },
        },
        {
          popover: {
            title: "That's the full loop",
            description: "DesignDrift rescans every time the DOM changes — so when you or your AI assistant pushes new code, drift is caught immediately. No CI step required during development.",
            side: 'over' as const,
            align: 'center',
          },
        },
      ],
    })

    driverObj.drive()
    return () => { driverObj.destroy() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
