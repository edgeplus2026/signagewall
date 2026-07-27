import { readFileSync } from 'node:fs'
import path from 'node:path'

import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
) as { version: string }

// Preact is wired through esbuild's automatic JSX runtime (no preset plugin
// needed), keeping the toolchain minimal. `react`→`preact/compat` aliases let
// us pull the odd React-typed dependency if ever required.
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  server: {
    port: 5174,
    host: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'EdgeRize Player',
        short_name: 'EdgeRize',
        description: 'EdgeRize digital signage player',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'fullscreen',
        orientation: 'landscape',
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Media bytes (images/video) are served from public R2 URLs. Cache them
        // aggressively so a brief network drop or a reload never blacks out the
        // screen. The engine preloads the next item and proactively prefetches
        // the whole playlist, so this warms the cache ahead of playback.
        //
        // Images and video get separate caches: video clips are few but huge,
        // images many but small. A shared entry-count cap would let a couple of
        // big clips evict the whole image set (or vice versa); split caps bound
        // each independently. Both match by element destination (img/video tag)
        // AND by file extension, since the prefetch fetch()'s request
        // destination is 'empty'.
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'image' ||
              /\.(?:png|jpe?g|webp|gif|avif)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'edge-media',
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'video' ||
              /\.(?:mp4|webm|mov|m4v|ogg)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'edge-video',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
})
