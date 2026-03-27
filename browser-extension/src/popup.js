/**
 * popup.js — popup UI controller
 */

const $ = (id) => document.getElementById(id)

function coverageColor(pct) {
  return pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
}

function renderRing(pct) {
  const color = coverageColor(pct)
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return `
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/>
      <circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="6"
        stroke-dasharray="${dash.toFixed(1)} ${(circ - dash).toFixed(1)}"
        stroke-linecap="round"/>
    </svg>
  `
}

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['components', 'storybookUrl', 'threshold'], (data) => {
      resolve({
        components: data.components ? JSON.parse(data.components) : [],
        storybookUrl: data.storybookUrl || 'http://localhost:6006',
        threshold: data.threshold || 80,
      })
    })
  })
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

function renderResults(result, threshold) {
  if (result.error) {
    $('noReact').style.display = 'block'
    $('results').style.display = 'none'
    return
  }

  const { pct, total, ds, gaps, tokenViolations } = result
  const color = coverageColor(pct)

  let html = `
    <div class="coverage">
      <div class="ring-wrap">
        ${renderRing(pct)}
        <div class="ring-pct" style="color:${color}">${pct}%</div>
      </div>
      <div class="coverage-stats">
        <div class="stat">
          <span class="stat-label">DS components</span>
          <span class="stat-value" style="color:#22c55e">${ds}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Custom (gaps)</span>
          <span class="stat-value" style="color:#ef4444">${total - ds}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Total</span>
          <span class="stat-value">${total}</span>
        </div>
        <div class="stat">
          <span class="stat-label">CI threshold</span>
          <span class="stat-value" style="color:${pct >= threshold ? '#22c55e' : '#ef4444'}">${threshold}%</span>
        </div>
      </div>
    </div>
  `

  if (gaps.length > 0) {
    html += `<div class="section-title">Custom components (gaps)</div>`
    html += `<ul class="gap-list">`
    gaps.slice(0, 8).forEach(({ name, count }) => {
      html += `
        <li class="gap-item">
          <span class="gap-name">${name}</span>
          <span class="gap-count">×${count}</span>
        </li>
      `
    })
    if (gaps.length > 8) {
      html += `<li class="gap-item" style="color:#8899b0;font-size:10px">+ ${gaps.length - 8} more gaps</li>`
    }
    html += `</ul>`
  }

  if (tokenViolations.length > 0) {
    html += `
      <div class="token-warn">
        ⚠ ${tokenViolations.length} hardcoded color${tokenViolations.length > 1 ? 's' : ''} found
        — ${tokenViolations.slice(0, 2).map(v => v.value).join(', ')}${tokenViolations.length > 2 ? '…' : ''}
      </div>
    `
  }

  $('results').innerHTML = html
  $('results').style.display = 'block'
  $('noReact').style.display = 'none'
}

async function runScan() {
  const config = await getConfig()
  const tab    = await getCurrentTab()

  $('scanBtn').disabled = true
  $('scanBtn').textContent = 'Scanning…'
  $('results').style.display = 'none'
  $('noReact').style.display = 'none'

  $('footerRoute').textContent = new URL(tab.url).pathname || '/'
  $('footerTime').textContent = new Date().toLocaleTimeString()

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'DRIFT_SCAN',
      components: config.components,
    })
    if (response?.success) {
      renderResults(response.result, config.threshold)
    } else {
      $('noReact').style.display = 'block'
    }
  } catch (err) {
    // Content script not injected yet — inject it and retry
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content.js'],
      })
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'DRIFT_SCAN',
        components: config.components,
      })
      if (response?.success) {
        renderResults(response.result, config.threshold)
      } else {
        $('noReact').style.display = 'block'
      }
    } catch {
      $('noReact').style.display = 'block'
    }
  }

  $('scanBtn').disabled = false
  $('scanBtn').textContent = 'Rescan'
}

// ─── Init ────────────────────────────────────────────────────────────────────

async function init() {
  const config = await getConfig()

  if (config.components.length === 0) {
    $('unconfigured').style.display = 'block'
    $('scanBtn').disabled = true
  }

  $('scanBtn').addEventListener('click', runScan)
  $('settingsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage())

  // Auto-scan if we have components configured
  if (config.components.length > 0) {
    runScan()
  }
}

init()
