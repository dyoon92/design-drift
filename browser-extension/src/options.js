/**
 * options.js — settings page controller
 */

const $ = (id) => document.getElementById(id)

function loadSettings() {
  chrome.storage.sync.get(['components', 'storybookUrl', 'threshold'], (data) => {
    $('components').value   = data.components ? JSON.parse(data.components).join('\n') : ''
    $('storybookUrl').value = data.storybookUrl || 'http://localhost:6006'
    $('threshold').value    = data.threshold    || 80
  })
}

function saveSettings() {
  const componentLines = $('components').value
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  chrome.storage.sync.set({
    components:   JSON.stringify(componentLines),
    storybookUrl: $('storybookUrl').value.trim(),
    threshold:    parseInt($('threshold').value, 10) || 80,
  }, () => {
    const msg = $('savedMsg')
    msg.classList.add('show')
    setTimeout(() => msg.classList.remove('show'), 2500)
  })
}

function resetSettings() {
  $('components').value   = ''
  $('storybookUrl').value = 'http://localhost:6006'
  $('threshold').value    = 80
}

function importJson() {
  const raw = $('importJson').value.trim()
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed
      : Array.isArray(parsed.components) ? parsed.components
      : Object.keys(parsed.components ?? parsed)
    $('components').value = list.join('\n')
    $('importJson').value = ''
    $('importMsg').style.display = 'inline'
    setTimeout(() => { $('importMsg').style.display = 'none' }, 2000)
  } catch {
    alert('Invalid JSON. Paste the full output from the DesignDrift Figma plugin.')
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────

$('saveBtn').addEventListener('click', saveSettings)
$('resetBtn').addEventListener('click', resetSettings)
$('importBtn').addEventListener('click', importJson)

loadSettings()
