import { withPayload } from '@payloadcms/next/withPayload'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
const appDir = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // Pin the monorepo root so Turbopack resolves the workspace correctly
  // (the repo also holds apps/be, apps/cms, apps/player).
  turbopack: {
    root: resolve(appDir, '../..'),
  },
  // Shared workspace packages: the app catalog registry consumed by /apps.
  transpilePackages: ['@edge/apps', '@edge/apps-contract'],
}

export default withPayload(withNextIntl(nextConfig))
