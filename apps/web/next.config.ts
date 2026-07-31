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
    ...(remotePatterns.length > 0 ? { remotePatterns } : {}),
  },
  async headers() {
    const noIndex = {
      key: 'X-Robots-Tag',
      value: 'noindex, nofollow',
    }

    if (process.env.SEO_INDEXING_ENABLED === 'false') {
      return [{ source: '/:path*', headers: [noIndex] }]
    }

    // Do not attach this header to all `/api` responses: locally stored Payload
    // images live at `/api/media/file/*` and must remain eligible as page images.
    return [{ source: '/admin/:path*', headers: [noIndex] }]
  },
}

export default withPayload(withNextIntl(nextConfig))
