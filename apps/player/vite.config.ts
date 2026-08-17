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

/**
 * The WEB bundle's version, as reported to the CMS and used as the Sentry release.
 * Deliberately distinct from the native shell's version — the web auto-updates in
 * seconds while the shell updates slowly and can roll back, so the two are never
 * the same number and must never be conflated.
 *
 * The base is `package.json`; the commit is what makes it USEFUL. Without it every
 * screen in the fleet reported the same constant forever, so "which build is this
 * screen running?" had no answer and every crash from every deploy landed in one
 * Sentry release. `PLAYER_VERSION` overrides both, for a release pipeline that
 * wants to stamp its own.
 */
function resolveAppVersion(): string {
  const explicit = process.env.PLAYER_VERSION?.trim()
  if (explicit) {
    return explicit
  }
  // Vercel and GitHub Actions each expose the commit under their own name; a
  // local build has neither and simply reports the base version.
  const sha = (
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    ''
  ).slice(0, 7)
  return sha ? `${pkg.version}+${sha}` : pkg.version
}

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
      __APP_VERSION__: JSON.stringify(resolveAppVersion()),
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
          // `webp` is here for the pairing splash, which is part of the shell and
          // not content: bundled, hash-named, and the only bitmap the app ships.
          // It was left out on the assumption that an unpaired device is by
          // definition online — but a paired device that loses its connection
          // shows that screen too, and offline it failed to load, which is the one
          // moment the screen has something to say. Cheap to include now that it
          // is 428KB rather than the 7.5MB it used to be.
          globPatterns: ['**/*.{js,css,html,svg,woff2,webp}'],
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
  }
})
