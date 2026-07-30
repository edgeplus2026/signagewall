import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const indexingEnabled = process.env.SEO_INDEXING_ENABLED !== 'false'

  if (!indexingEnabled) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }

  return {
    rules: {
      userAgent: '*',
      // Payload serves uploaded article/app images below the API prefix while
      // local storage is in use. The longer Allow keeps those assets crawlable.
      allow: ['/', '/api/media/file/'],
      // The Payload admin and its REST/GraphQL surface are reachable on this
      // origin but are not pages — crawling them wastes budget and can surface
      // login screens in search results.
      disallow: ['/admin', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
