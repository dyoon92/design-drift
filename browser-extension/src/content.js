/**
 * content.js — runs in the page's content script context.
 * Injects the scanner into the page context (where React Fiber is accessible),
 * then relays messages between the popup and the page.
 */

let scannerInjected = false

function injectScanner() {
  if (scannerInjected) return Promise.resolve()
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = chrome.runtime.getURL('injected.js')
    script.onload = () => {
      script.remove()
      scannerInjected = true
      resolve()
    }
    ;(document.head || document.documentElement).appendChild(script)
  })
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'DRIFT_SCAN') {
    injectScanner().then(() => {
      // Call the scanner in page context via a custom event
      const requestId = Date.now().toString()
      const handler = (e) => {
        if (e.detail?.requestId !== requestId) return
        window.removeEventListener('__dd_scan_result__', handler)
        sendResponse({ success: true, result: e.detail.result })
      }
      window.addEventListener('__dd_scan_result__', handler)
      window.dispatchEvent(new CustomEvent('__dd_scan_request__', {
        detail: { requestId, components: message.components }
      }))
    }).catch(err => {
      sendResponse({ success: false, error: String(err) })
    })
    return true // keep channel open for async response
  }
})
