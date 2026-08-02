import { existsSync, readdirSync } from 'node:fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Refuses to build a CMS that cannot show an app preview.
 *
 * The preview iframe loads `/apps/<slug>/index.html`; those bundles come from
 * `packages/apps`, which mirrors them into `public/apps` at build time (and they
 * are gitignored, so they exist only as build output). When they are missing
 * nothing complains: `vercel.json` rewrites every unmatched path to this app's
 * own `index.html`, so each `/apps/*` request is answered with the CMS itself —
 * the preview renders the dashboard inside itself and the app chunks die on a
 * "MIME type text/html" error. A shipped build is a bad place to discover that.
 */
function requireEmbedBundles(): Plugin {
  return {
    name: 'require-embed-bundles',
    apply: 'build',
    buildStart() {
      const bundles = path.resolve(__dirname, 'public/apps')
      const slugs = existsSync(bundles)
        ? readdirSync(bundles).filter((entry) =>
            existsSync(path.join(bundles, entry, 'index.html')),
          )
        : []
      if (slugs.length === 0) {
        this.error(
          'public/apps contains no embed bundles, so every app preview would ' +
            'render the CMS itself. Build @signagewall/apps first — through ' +
            'turbo (`turbo build --filter=@signagewall/cms`), so the workspace ' +
            'dependency runs, or directly with ' +
            '`pnpm --filter @signagewall/apps build`.',
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), requireEmbedBundles()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        // Main SPA + the dedicated MSAL popup redirect page (runs the redirect
        // bridge so OneDrive/SharePoint sign-in popups complete).
        main: path.resolve(__dirname, 'index.html'),
        msal: path.resolve(__dirname, 'msal.html'),
      },
    },
  },
})
