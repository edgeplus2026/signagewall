import { readFileSync } from 'node:fs'
import path from 'node:path'

import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import {
  PRIVATE_APP_ASSET_CACHE_NAME,
  privateAppAssetCacheKeyPlugin,
  privateAppAssetUrlPattern,
} from './src/sync/private-app-asset-cache-key'

const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
) as { version: string }

// Preact is wired through esbuild's automatic JSX runtime (no preset plugin
// needed), keeping the toolchain minimal. `react`→`preact/compat` aliases let
// us pull the odd React-typed dependency if ever required.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const privateAssetOrigin = env.VITE_PRIVATE_ASSET_ORIGIN?.trim()
  const privateAssetPathPrefix = env.VITE_PRIVATE_ASSET_PATH_PREFIX?.trim()
  if (Boolean(privateAssetOrigin) !== Boolean(privateAssetPathPrefix)) {
    throw new Error(
      'VITE_PRIVATE_ASSET_ORIGIN and VITE_PRIVATE_ASSET_PATH_PREFIX must be configured together',
    )
  }
  const privateAssetCaching =
    privateAssetOrigin && privateAssetPathPrefix
      ? [
          {
            urlPattern: privateAppAssetUrlPattern(
              privateAssetOrigin,
              privateAssetPathPrefix,
            ),
            handler: 'CacheFirst' as const,
            options: {
              cacheName: PRIVATE_APP_ASSET_CACHE_NAME,
              expiration: {
                maxEntries: 600,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [200] },
              matchOptions: { ignoreVary: true },
              plugins: [privateAppAssetCacheKeyPlugin],
            },
          },
        ]
      : []

  return {
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
            ...privateAssetCaching,
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
                // Opaque (0) is fine here: an <img> only ever asks for the whole
                // resource, so a body we cannot read is still a body the browser
                // can decode.
                cacheableResponse: { statuses: [0, 200] },
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
                // 200 ONLY — deliberately NOT 0, unlike images above. `rangeRequests`
                // can only answer a `Range:` request by slicing the cached bytes,
                // and an opaque response's body is unreadable (it slices to zero
                // length). Safari/iOS range-requests every media resource, so a
                // cached opaque entry gets answered with `416 Range Not Satisfiable`
                // — a permanently black video and a "video load error", surviving
                // reloads because CacheFirst keeps serving the poisoned entry.
                // Worse, an opaque 206 also reports status 0, so iOS's own 2-byte
                // probe response would be cached AS the whole file.
                // Restricting this to readable 200s means the cache either serves a
                // correct 206 or misses and the request goes to the network — right
                // on every browser. `sync/prefetch.ts` fetches in `cors` mode so the
                // warm-up can still fill this cache for offline playback.
                cacheableResponse: { statuses: [200] },
                matchOptions: { ignoreVary: true },
                rangeRequests: true,
              },
            },
          ],
        },
      }),
    ],
  }
})
