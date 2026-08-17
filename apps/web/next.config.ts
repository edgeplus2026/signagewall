import { withPayload } from '@payloadcms/next/withPayload'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

import { CANONICAL_ORIGIN, INDEXING_ENABLED } from './src/lib/site-url'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
const appDir = dirname(fileURLToPath(import.meta.url))

/* Payload media is served from this origin today (`/api/media/file/…`), so no
   remote pattern is needed for it. Once R2 is wired up the public bucket URL
   becomes a different origin and `next/image` refuses to optimise it without
   being told the host is allowed. Driven by env so dev and prod agree. */
const r2PublicUrl = process.env.R2_PUBLIC_URL
const remotePatterns: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> = []
if (r2PublicUrl) {
  const { protocol, hostname, pathname } = new URL(r2PublicUrl)
  remotePatterns.push({
    protocol: protocol.replace(':', '') as 'http' | 'https',
    hostname,
    pathname: `${pathname.replace(/\/$/, '')}/**`,
  })
}

const nextConfig: NextConfig = {
  // Pin the monorepo root so Turbopack resolves the workspace correctly
  // (the repo also holds apps/be, apps/cms, apps/player).
  turbopack: {
    root: resolve(appDir, '../..'),
  },
  /* Evaluated once when the build starts and inlined, so it is stable across
     ISR regenerations. Static marketing pages can only change with a deploy,
     which makes the build moment their honest sitemap `lastmod` — a module-
     scope timestamp in sitemap.ts would instead slide on every regeneration
     and claim changes that never happened. */
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  // Shared workspace packages: the app catalog registry consumed by /apps.
  transpilePackages: ['@signagewall/apps', '@signagewall/apps-contract'],
  images: {
    /* The seeded photography averages 226 KB at ~1880px wide and was served
       untouched to every phone. AVIF first, WebP as the fallback. */
    formats: ['image/avif', 'image/webp'],
    /* Payload streams uploads through its own route rather than exposing the
       bucket, and the S3 adapter appends the key prefix it was configured with
       (`prefix: 'web'` in payload.config.ts) as a query string. Next refuses to
       optimise a local image whose URL carries a query string unless that exact
       shape is declared, so the two have to agree — changing the prefix there
       means changing the search string here. */
    localPatterns: [{ pathname: '/api/media/file/**', search: '?prefix=web' }],
    ...(remotePatterns.length > 0 ? { remotePatterns } : {}),
  },
  /* Next announces itself in `X-Powered-By` by default. It tells an attacker
     which stack to look up known issues for and tells a visitor nothing. */
  poweredByHeader: false,
  /* Indexing is hard-gated to the exact canonical origin: served from the bare
     apex, every page would carry noindex and robots.txt would disallow all.
     Redirecting apex → www here (permanent, 308) makes host canonicalization a
     property of the code base instead of a hosting-panel setting that has to be
     remembered — and re-remembered after every DNS or platform migration. */
  async redirects() {
    const canonicalHost = new URL(CANONICAL_ORIGIN).host
    if (!canonicalHost.startsWith('www.')) {
      return []
    }
    const apexHost = canonicalHost.slice('www.'.length)
    return [
      {
        source: '/:path*',
        has: [{ type: 'host' as const, value: apexHost }],
        destination: `${CANONICAL_ORIGIN}/:path*`,
        permanent: true,
      },
    ]
  },
  async headers() {
    const noIndex = {
      key: 'X-Robots-Tag',
      value: 'noindex, nofollow',
    }

    /* Applied to every response, indexing on or off. None of them constrain a
       marketing site: nothing here is meant to be framed by another origin,
       every asset is served with a correct content type, and referrers only
       ever need to carry the origin once a visitor leaves. */
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ]

    /* Same decision as `robots.ts`, from the same constant: a crawler that
       never reads robots.txt still gets a header it cannot miss. */
    if (!INDEXING_ENABLED) {
      return [{ source: '/:path*', headers: [...security, noIndex] }]
    }

    return [
      { source: '/:path*', headers: security },
      // Do not attach the noindex to all `/api` responses: locally stored Payload
      // images live at `/api/media/file/*` and must remain eligible as page images.
      { source: '/admin/:path*', headers: [noIndex] },
    ]
  },
}

export default withPayload(withNextIntl(nextConfig))
