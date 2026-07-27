import type { MetadataRoute } from 'next'

import { catalogApps } from '@/lib/apps'
import { INDUSTRY_ORDER } from '@/lib/solutions'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002'

// `as-needed` locale prefix: Serbian at the root, English under `/en`.
function entry(path: string): MetadataRoute.Sitemap[number] {
  const suffix = path ? `/${path}` : ''
  return {
    url: `${siteUrl}${suffix}`,
    alternates: {
      languages: {
        sr: `${siteUrl}${suffix}`,
        en: `${siteUrl}/en${suffix}`,
      },
    },
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    '',
    'how-it-works',
    'features',
    'apps',
    'solutions',
    'about',
    'download',
    'contact',
    'privacy',
    'terms',
    'cookies',
  ]
  const appPaths = catalogApps.map((m) => `apps/${m.slug}`)
  const industryPaths = INDUSTRY_ORDER.map((s) => `solutions/${s}`)

  return [...staticPaths, ...appPaths, ...industryPaths].map(entry)
}
