import { cpSync, existsSync, rmSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, type Plugin } from 'vite'

const dir = path.dirname(fileURLToPath(import.meta.url))
const embedsRoot = path.resolve(dir, 'embeds')
/** Committed template thumbnails (see `scripts/build-previews.mts`). */
const previewsRoot = path.resolve(dir, 'previews')

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
 * Copy pdf.js's standard-font and CMap data into the bundle so the PDF Reader
 * app can render PDFs that reference the base-14 fonts (Helvetica/Times/…)
 * without embedding them, and CJK text. They land in `assets/` next to the app
 * chunks; the embed points pdf.js at them relative to its own module URL. Must
 * run before {@link mirrorToCms} so the CMS mirror picks them up too.
 */
function copyPdfjsAssets(): Plugin {
  return {
    name: 'copy-pdfjs-assets',
    closeBundle() {
      const require = createRequire(import.meta.url)
      const pdfjsDir = path.dirname(require.resolve('pdfjs-dist/package.json'))
      const assetsDir = path.join(playerOutDir, 'assets')
      for (const name of ['standard_fonts', 'cmaps']) {
        cpSync(path.join(pdfjsDir, name), path.join(assetsDir, name), { recursive: true })
      }
    },
  }
}

/**
 * Copy the committed template thumbnails into the bundle output as `_previews/`,
 * so the CMS config form can show `_previews/<namespace>/<value>.webp` from the
 * same `appsBase` it already loads the bundles from — no second asset host, and
 * no second copy to keep in sync.
 *
 * They cannot simply live in `apps/cms/public/apps/`: that directory is
 * gitignored build output which {@link mirrorToCms} deletes wholesale. Being a
 * build step instead means the images survive `emptyOutDir` and land in both the
 * player and the CMS. Must run before {@link mirrorToCms}, like
 * {@link copyPdfjsAssets}, so the mirror carries them across.
 *
 * The directory is absent until the first `pnpm previews` run, so this is a
 * no-op rather than an error when there is nothing to copy.
 */
function copyPreviewThumbs(): Plugin {
  return {
    name: 'copy-preview-thumbs',
    closeBundle() {
      if (!existsSync(previewsRoot)) return
      cpSync(previewsRoot, path.join(playerOutDir, '_previews'), {
        recursive: true,
        // `previews/` also holds the fixtures module the generator script reads;
        // only the rendered images belong in the shipped bundle.
        filter: (src) => statSync(src).isDirectory() || src.endsWith('.webp'),
      })
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
 * point. Run before the player build (wired via the `@signagewall/apps` build script).
 */
export default defineConfig({
  root: embedsRoot,
  base: './',
  plugins: [copyPdfjsAssets(), copyPreviewThumbs(), mirrorToCms()],
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
