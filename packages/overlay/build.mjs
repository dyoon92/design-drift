#!/usr/bin/env node
/**
 * Build script for @catchdrift/overlay
 *
 * Bundles the public-facing DriftOverlay component into:
 *   dist/index.js     (ESM)
 *   dist/index.cjs    (CommonJS)
 *   dist/index.d.ts   (TypeScript declarations — hand-written, not generated here)
 *
 * The heavy DSCoverageOverlay implementation is bundled from the monorepo's
 * src/ds-coverage/ directory, which is kept as the source of truth.
 *
 * Usage:
 *   node build.mjs
 *   # or: npm run build (from packages/overlay/)
 */

import esbuild from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = resolve(__dirname, '../..')
const OUT       = resolve(__dirname, 'dist')

mkdirSync(OUT, { recursive: true })

const shared = {
  bundle:   true,
  platform: 'browser',
  target:   ['es2020', 'chrome90', 'firefox88', 'safari14'],
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  loader: {
    '.svg': 'dataurl',
    '.png': 'dataurl',
    '.webp': 'dataurl',
  },
  define: {
    'import.meta.env.DEV':  'true',
    'import.meta.env.VITE_SHOW_OVERLAY': 'undefined',
    'import.meta.env.VITE_AI_PROXY_URL': 'undefined',
    'import.meta.env.VITE_PROXY_SECRET':  'undefined',
  },
  // Resolve ./overlay-impl → monorepo DSCoverageOverlay
  plugins: [{
    name: 'overlay-impl-resolver',
    setup(build) {
      build.onResolve({ filter: /^\.\/overlay-impl$/ }, () => ({
        path: resolve(ROOT, 'src/ds-coverage/DSCoverageOverlay.tsx'),
      }))
    },
  }],
  minify: true,
  sourcemap: true,
}

// ESM build
await esbuild.build({
  ...shared,
  entryPoints: [resolve(__dirname, 'src/index.ts')],
  format: 'esm',
  outfile: resolve(OUT, 'index.js'),
})

// CJS build
await esbuild.build({
  ...shared,
  entryPoints: [resolve(__dirname, 'src/index.ts')],
  format: 'cjs',
  outfile: resolve(OUT, 'index.cjs'),
})

// Hand-write the type declaration (avoids needing tsc in the build chain)
const dts = `import React from 'react';

export interface DriftComponentEntry {
  storyPath?: string;
  figmaLink?: string;
}

export interface DriftConfig {
  components: Record<string, DriftComponentEntry>;
  storybookUrl?: string;
  chromaticUrl?: string;
  figmaFileKey?: string;
  jiraBaseUrl?: string;
  jiraProjectKey?: string;
  threshold?: number;
}

export interface DriftOverlayProps {
  config: DriftConfig;
  autoOpen?: boolean;
  onOpenWaitlist?: () => void;
}

export declare function DriftOverlay(props: DriftOverlayProps): React.ReactElement | null;
`
writeFileSync(resolve(OUT, 'index.d.ts'), dts, 'utf8')

console.log('✓ @catchdrift/overlay built to packages/overlay/dist/')
