/**
 * Storybook discovery utilities
 * Fetches index.json from a running Storybook and builds the component registry.
 */

export async function fetchStorybookComponents(storybookUrl) {
  const url = storybookUrl.replace(/\/$/, '')

  try {
    // Storybook 7+ uses /index.json; Storybook 6 uses /stories.json
    let data
    for (const path of ['/index.json', '/stories.json']) {
      try {
        const res = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(5000) })
        if (res.ok) { data = await res.json(); break }
      } catch { /* try next */ }
    }

    if (!data) return { ok: false, count: 0, components: {} }

    // index.json has a flat `entries` map; stories.json has `stories`
    const entries = data.entries || data.stories || {}

    // Group by component (strip variant suffix e.g. "Button--primary" → "Button")
    const components = {}
    for (const [id, entry] of Object.entries(entries)) {
      const name = entry.title?.split('/').pop() || entry.name
      if (!name || entry.type === 'docs') continue

      // Use the first story for each component as its storyPath
      if (!components[name]) {
        components[name] = { storyPath: id }
      }
    }

    return { ok: true, count: Object.keys(components).length, components }
  } catch {
    return { ok: false, count: 0, components: {} }
  }
}

export function buildComponentRegistry(components) {
  return Object.entries(components)
    .map(([name, meta]) => `    ${name}: { storyPath: '${meta.storyPath}' },`)
    .join('\n')
}
