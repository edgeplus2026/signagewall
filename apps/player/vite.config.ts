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
        name: 'SignageWall Player',
        short_name: 'SignageWall',
        description: 'SignageWall digital signage player',
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
        //
        // Both use `matchOptions.ignoreVary`: a CORS-enabled bucket commonly
        // answers with `Vary: Origin`, and the element request that later reads
        // the entry (a plain `no-cors` <img>/<video> load) carries no Origin
        // header — so without this every cached byte would fail to match and the
        // cache would silently never be used.
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'image' ||
              /\.(?:png|jpe?g|webp|gif|avif)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'signagewall-media',
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
              // 200 ONLY, for the same reason as the video cache below, reached
              // by a different route. An opaque body IS enough for the <img> that
              // wrote it — but this cache has a second reader. `sync/prefetch.ts`
              // fetches in `cors` mode, and the spec forbids answering a `cors`
              // request with an opaque response: the fetch fails as a network
              // error. Chrome reports that as "No 'Access-Control-Allow-Origin'
              // header is present" even though the header is there and the
              // request never left the device — sending you to debug CORS, the
              // bucket and the CDN, none of which are involved.
              //
              // So the <img> no longer fills this cache; the prefetch does, as it
              // already does for video. An element load still reads what the
              // prefetch stored — a no-cors request may be answered from a cached
              // cors response, just not the reverse.
              cacheableResponse: { statuses: [200] },
              matchOptions: { ignoreVary: true },
            },
          },
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'video' ||
              /\.(?:mp4|webm|mov|m4v|ogg)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'signagewall-video',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
              // 200 ONLY, never opaque: an unreadable body slices to zero length,
              // and iOS's own 2-byte probe reports status 0 and would be cached AS
              // the whole file.
              cacheableResponse: { statuses: [200] },
              matchOptions: { ignoreVary: true },
              // NO `rangeRequests`. It could not run in production until the
              // prefetch was fixed today, and the first time it did, every cached
              // clip failed with MEDIA_ERR_DECODE and the player skipped its way
              // through the playlist.
              //
              // What was ruled out, each verified rather than assumed: the stored
              // file decodes completely (900/900 frames, no errors); the cached
              // body is byte-identical to the origin (21,074,201 both); Workbox's
              // own slicing returns byte-exact ranges when run against that file;
              // and nothing is content-encoded. What is left is the synthetic 206
              // itself — a fresh Response carrying the original's headers, built in
              // the worker — which cannot be tested outside a browser.
              //
              // Dropping the plugin means a `Range:` request is answered with the
              // whole cached 200. That is a legal answer — it is what any server
              // without range support returns — and the media stack reads it from
              // the start. Seeking loses its shortcut, which costs a linear signage
              // playlist nothing. The cache, and with it offline playback, stays.
            },
          },
        ],
      },
    }),
  ],
})
