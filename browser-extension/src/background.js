/**
 * background.js — service worker
 * Handles extension install/update lifecycle. Minimal — all logic is in popup.
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // Open options page on first install so users can configure their DS
    chrome.runtime.openOptionsPage()
  }
})
