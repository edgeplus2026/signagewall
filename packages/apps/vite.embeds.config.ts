import { cpSync, rmSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, type Plugin } from 'vite'

const dir = path.dirname(fileURLToPath(import.meta.url))
const embedsRoot = path.resolve(dir, 'embeds')

/** Primary build output (served same-origin by the player under `/apps`). */
const playerOutDir = path.resolve(dir, '../../apps/player/public/apps')
/** Mirror copy so the CMS serves the identical bundles for its live preview. */
const cmsOutDir = path.resolve(dir, '../../apps/cms/public/apps')

/**
 * After the build, copy the bundles into the CMS public dir too, so the CMS
 * live-preview iframe loads the exact same artifacts same-origin under `/apps`
 * (no separate build, no drift). Both dirs are gitignored build output.
 */
function mirrorToCms(): Plugin {
  return {
    name: 'mirror-embeds-to-cms',
    closeBundle() {
      rmSync(cmsOutDir, { recursive: true, force: true })
      cpSync(playerOutDir, cmsOutDir, { recursive: true })
    },
  }
}

/**
 * Discover every embed app: a folder under `embeds/` (excluding `_shared`) that
 * has an `index.html`. Each becomes a Rollup HTML input, so adding an app is
 * just dropping a new `embeds/<slug>/index.html` — no build-config edit.
 */
function discoverInputs(): Record<string, string> {
  const inputs: Record<string, string> = {}
  for (const entry of readdirSync(embedsRoot)) {
    if (entry.startsWith('_')) continue
    const indexHtml = path.join(embedsRoot, entry, 'index.html')
    try {
      if (statSync(indexHtml).isFile()) {
        inputs[entry] = indexHtml
      }
    } catch {
      // No index.html in this folder — skip it.
    }
  }
  return inputs
}

/**
 * Builds the app embed bundles into the player's static dir so they are served
 * same-origin under `/apps/<slug>/` (the player's `config.appsBase`). Relative
 * `base` keeps every asset path app-local, so the bundles work from any mount
 * point. Run before the player build (wired via the `@edge/apps` build script).
 */
export default defineConfig({
  root: embedsRoot,
  base: './',
  plugins: [mirrorToCms()],
  build: {
    outDir: playerOutDir,
    emptyOutDir: true,
    rollupOptions: {
      input: discoverInputs(),
    },
  },
  esbuild: {
    // The shared host-bridge + apps are plain TS/DOM; no JSX.
    jsx: 'preserve',
  },
})
