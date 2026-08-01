import { withPayload } from '@payloadcms/next/withPayload'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

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

    if (process.env.SEO_INDEXING_ENABLED === 'false') {
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
