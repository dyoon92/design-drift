/**
 * figma-sync.mjs
 *
 * Fetches the Figma file, extracts design tokens (colors, typography, spacing),
 * writes tokens/figma.tokens.json, then runs Style Dictionary to output
 * src/tokens/variables.css and src/tokens/tokens.ts.
 *
 * Usage:
 *   npm run figma-sync
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── Config ──────────────────────────────────────────────────────────────────

const FIGMA_TOKEN = process.env.FIGMA_API_TOKEN;
if (!FIGMA_TOKEN) {
  console.error('❌ FIGMA_API_TOKEN environment variable is not set.');
  console.error('   Run: export FIGMA_API_TOKEN=your_token_here');
  process.exit(1);
}

// Read figmaFileKey from drift.config.ts or src/ds-coverage/config.ts
function readFigmaFileKey() {
  const candidates = [
    path.join(ROOT, 'drift.config.ts'),
    path.join(ROOT, 'src/ds-coverage/config.ts'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const src = fs.readFileSync(p, 'utf8');
      const match = src.match(/figmaFileKey:\s*['"]([^'"]+)['"]/);
      if (match) return match[1];
    }
  }
  return null;
}

const FILE_KEY = readFigmaFileKey();
if (!FILE_KEY) {
  console.error('❌ figmaFileKey not found in drift.config.ts or src/ds-coverage/config.ts.');
  console.error('   Add it: figmaFileKey: \'your-key-here\'  // figma.com/design/THIS_PART/...');
  process.exit(1);
}
console.log(`   Using Figma file key: ${FILE_KEY}`);

const API_BASE    = 'https://api.figma.com/v1';

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function figmaGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN },
  });
  if (!res.ok) throw new Error(`Figma API error ${res.status}: ${path}`);
  return res.json();
}

// ─── Token extraction ─────────────────────────────────────────────────────────

const colors     = new Map(); // hex → Set of semantic names from node names
const fontSizes  = new Set();
const fontWeights= new Set();
const families   = new Set();
const radii      = new Set();

function toHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}

function walkNode(node) {
  if (!node) return;

  // Colors from fills
  for (const fill of node.fills || []) {
    if (fill.type === 'SOLID' && !fill.invisible) {
      const { r, g, b } = fill.color;
      const hex = toHex(r, g, b);
      if (!colors.has(hex)) colors.set(hex, new Set());
      colors.get(hex).add(node.name || 'unknown');
    }
  }

  // Typography
  const s = node.style;
  if (s) {
    if (s.fontSize)    fontSizes.add(s.fontSize);
    if (s.fontWeight)  fontWeights.add(s.fontWeight);
    if (s.fontFamily)  families.add(s.fontFamily);
  }

  // Border radius
  if (node.cornerRadius) radii.add(node.cornerRadius);

  for (const child of node.children || []) walkNode(child);
}

// ─── Map hex → semantic name ──────────────────────────────────────────────────

// Hand-coded from our Figma analysis — these are the design decisions,
// not just raw values. The script updates the VALUES; these names stay stable.
const KNOWN_COLORS = {
  '#7d52f7': 'primary',
  '#5d1dd6': 'primary-dark',
  '#161616': 'text-primary',
  '#94a0b8': 'text-muted',
  '#ffffff': 'white',
  '#f7f9fb': 'surface-subtle',
  '#f0f2f8': 'surface-muted',
  '#e1e5ef': 'border',
  '#e02c3b': 'error',
  '#fee1e3': 'error-light',
  '#08875c': 'success',
  '#e4f5e8': 'success-light',
  '#17d797': 'success-bright',
  '#b25d09': 'warning',
  '#fff1d6': 'warning-light',
  '#fff8eb': 'warning-subtle',
  '#db7612': 'warning-icon',
  '#f5f0ff': 'primary-light',
  '#eaf1ff': 'info-light',
  '#fdf0f1': 'error-subtle',
};

// ─── Build token object ───────────────────────────────────────────────────────

function buildTokens(extractedColors) {
  const colorTokens = {};

  // Known semantic colors first
  for (const [hex, name] of Object.entries(KNOWN_COLORS)) {
    colorTokens[name] = { value: hex, type: 'color' };
  }

  // Any new colors found in the file that aren't in KNOWN_COLORS
  let unknownIndex = 1;
  for (const [hex] of extractedColors) {
    const alreadyMapped = Object.values(KNOWN_COLORS).some((_, i) => Object.keys(KNOWN_COLORS)[i] === hex);
    if (!KNOWN_COLORS[hex]) {
      colorTokens[`color-${unknownIndex}`] = { value: hex, type: 'color', comment: `New color found in Figma — give it a name!` };
      unknownIndex++;
    }
  }

  const fontSizeTokens = {};
  const sorted = [...fontSizes].sort((a, b) => a - b);
  const sizeNames = { 10: 'xs', 11: 'xs2', 12: 'sm', 13: 'sm2', 14: 'base', 15: 'md', 16: 'lg', 18: 'xl', 20: '2xl', 24: '3xl', 28: '4xl' };
  for (const size of sorted) {
    const name = sizeNames[size] || `size-${size}`;
    fontSizeTokens[name] = { value: `${size}px`, type: 'dimension' };
  }

  const fontWeightTokens = {};
  const weightNames = { 400: 'regular', 500: 'medium', 600: 'semibold', 700: 'bold' };
  for (const w of [...fontWeights].sort()) {
    fontWeightTokens[weightNames[w] || `weight-${w}`] = { value: w, type: 'fontWeight' };
  }

  return {
    color:      colorTokens,
    fontSize:   fontSizeTokens,
    fontWeight: fontWeightTokens,
    fontFamily: { body: { value: [...families][0] || 'Inter', type: 'fontFamily' } },
    borderRadius: {
      sm:   { value: '4px',  type: 'dimension' },
      md:   { value: '6px',  type: 'dimension' },
      lg:   { value: '8px',  type: 'dimension' },
      full: { value: '999px',type: 'dimension' },
    },
    spacing: {
      '1': { value: '4px',  type: 'dimension' },
      '2': { value: '8px',  type: 'dimension' },
      '3': { value: '12px', type: 'dimension' },
      '4': { value: '16px', type: 'dimension' },
      '5': { value: '20px', type: 'dimension' },
      '6': { value: '24px', type: 'dimension' },
      '8': { value: '32px', type: 'dimension' },
    },
  };
}

// ─── Style Dictionary config ──────────────────────────────────────────────────

function buildStyleDictionaryConfig(tokensPath) {
  return {
    source: [tokensPath],
    platforms: {
      css: {
        transformGroup: 'css',
        prefix: 'ds',
        buildPath: path.join(ROOT, 'src/tokens/'),
        files: [{ destination: 'variables.css', format: 'css/variables' }],
      },
      ts: {
        transformGroup: 'js',
        buildPath: path.join(ROOT, 'src/tokens/'),
        files: [{ destination: 'tokens.ts', format: 'javascript/es6' }],
      },
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 Fetching Figma file...');
  const data = await figmaGet(`/files/${FILE_KEY}?depth=8`);
  const lastModified = data.lastModified;

  console.log(`   File: ${data.name}`);
  console.log(`   Last modified: ${lastModified}`);

  console.log('🔍 Extracting tokens from node tree...');
  walkNode(data.document);

  console.log(`   Colors found:      ${colors.size}`);
  console.log(`   Font sizes found:  ${fontSizes.size}`);
  console.log(`   Font weights found:${fontWeights.size}`);
  console.log(`   Font families:     ${[...families].join(', ')}`);

  const tokens = buildTokens(colors);

  // Write raw tokens file
  const tokensPath = path.join(ROOT, 'tokens/figma.tokens.json');
  fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
  console.log(`✅ Tokens written → tokens/figma.tokens.json`);

  // Write a sync manifest so we know when we last synced
  const manifest = {
    figmaFile: FILE_KEY,
    fileName: data.name,
    lastModified,
    syncedAt: new Date().toISOString(),
    tokenCounts: {
      colors: Object.keys(tokens.color).length,
      fontSizes: Object.keys(tokens.fontSize).length,
    },
  };
  fs.writeFileSync(path.join(ROOT, 'tokens/sync-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('✅ Sync manifest written → tokens/sync-manifest.json');

  // Run Style Dictionary
  console.log('🎨 Running Style Dictionary...');
  const { default: StyleDictionary } = await import('style-dictionary');
  const sd = new StyleDictionary(buildStyleDictionaryConfig(tokensPath));
  await sd.buildAllPlatforms();

  console.log('✅ CSS variables → src/tokens/variables.css');
  console.log('✅ TS constants  → src/tokens/tokens.ts');

  // ─── Icon export ────────────────────────────────────────────────────────────
  console.log('\n🖼  Discovering icons from Figma...');

  // Auto-discover icon nodes by walking the file tree.
  // Any COMPONENT inside a frame/page whose name contains "icon" (case-insensitive)
  // is included. Name your icon frame "Icons" or "Icon Library" and it works automatically.
  function findIconNodes(node, inIconFrame, result) {
    if (!result) result = {};
    if (!inIconFrame) inIconFrame = false;
    const nameLC = (node.name || '').toLowerCase();
    const isIconContainer =
      (nameLC.includes('icon')) &&
      ['FRAME', 'PAGE', 'GROUP', 'COMPONENT_SET', 'SECTION'].includes(node.type);
    const capture = (inIconFrame || isIconContainer) && node.type === 'COMPONENT';
    if (capture) {
      const slug = node.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (slug) result[slug] = node.id;
    }
    for (const child of node.children || []) {
      findIconNodes(child, inIconFrame || isIconContainer, result);
    }
    return result;
  }

  const ICON_NODES = findIconNodes(data.document);

  if (Object.keys(ICON_NODES).length === 0) {
    console.log('   ⚠️  No icons found. Name a Figma frame or page "Icons" to auto-export SVGs.');
    console.log('   Skipping icon export.\n');
  } else {
    console.log(`   Found ${Object.keys(ICON_NODES).length} icons across icon frames.`);
  }

  if (Object.keys(ICON_NODES).length > 0) {
    const ids = Object.values(ICON_NODES).join(',');
    const imgRes = await figmaGet(`/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=svg`);
    const imgMap = imgRes.images || {};

    const iconsDir = path.join(ROOT, 'src/stories/assets/icons');
    fs.mkdirSync(iconsDir, { recursive: true });

    let downloaded = 0;
    for (const [name, nodeId] of Object.entries(ICON_NODES)) {
      const url = imgMap[nodeId];
      if (!url) { console.log(`   ⚠️  ${name} — no URL returned`); continue; }
      const svg = await fetch(url).then(r => r.text());
      fs.writeFileSync(path.join(iconsDir, `${name}.svg`), svg);
      downloaded++;
    }
    console.log(`✅ ${downloaded} icons → src/stories/assets/icons/`);
  }

  console.log('\n🎉 Sync complete! Storybook will pick up changes on next reload.');
  console.log(`   Last Figma change: ${lastModified}`);
}

main().catch((err) => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});
