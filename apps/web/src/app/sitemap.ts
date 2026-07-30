import type { MetadataRoute } from 'next'

import { catalogApps } from '@/lib/apps'
import { listPostRefs } from '@/lib/posts'
import type { LocaleRoutes, Route } from '@/lib/seo'
import { absoluteUrl } from '@/lib/seo'
import { listSolutionSlugs } from '@/lib/solutions'

type Entry = MetadataRoute.Sitemap[number]

interface EntryOptions {
  lastModified?: string
  /**
   * Google ignores both `priority` and `changeFrequency` outright, and Bing
   * treats them as hints at best. They are here because they cost nothing, the
   * rest of the ecosystem (smaller crawlers, audit tools) still reads them, and
   * an absent `lastmod` is the one field that genuinely matters. Do not expect
   * a ranking change from tuning these numbers.
   */
  priority?: number
  changeFrequency?: Entry['changeFrequency']
}

/**
 * One sitemap entry, in both languages.
 *
 * URLs come from `absoluteUrl`, which resolves them through the pathnames map —
 * this used to concatenate `${SITE_URL}/${path}` and `${SITE_URL}/en/${path}`
 * by hand, which quietly published English URLs for the Serbian site the moment
 * the two stopped matching.
 */
function entry(route: Route | LocaleRoutes, options: EntryOptions = {}): Entry {
  const routes: LocaleRoutes =
    typeof route === 'object' && 'sr' in route ? route : { sr: route, en: route }
  const sr = absoluteUrl('sr', routes.sr)
  const en = absoluteUrl('en', routes.en)

  const { lastModified, priority, changeFrequency } = options

  return {
    // The English URL is the entry — it is the default locale; Serbian rides
    // along as an alternate.
    url: en,
    ...(lastModified ? { lastModified } : {}),
    ...(changeFrequency ? { changeFrequency } : {}),
    ...(priority !== undefined ? { priority } : {}),
    alternates: {
      // Matches the x-default in each page's hreflang set.
      languages: { en, sr, 'x-default': en },
    },
  }
}

/**
 * Static routes with the weight we want to give them. The commercial pages a
 * buyer lands on rank above the supporting ones; legal sits at the bottom
 * because it exists to be found, not to be promoted.
 */
const STATIC_ROUTES: {
  route: Route
  priority: number
  changeFrequency: Entry['changeFrequency']
}[] = [
  { route: '/', priority: 1, changeFrequency: 'weekly' },
  { route: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' },
  { route: '/features', priority: 0.8, changeFrequency: 'monthly' },
  { route: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
  { route: '/what-is-digital-signage', priority: 0.8, changeFrequency: 'yearly' },
  { route: '/apps', priority: 0.8, changeFrequency: 'monthly' },
  { route: '/solutions', priority: 0.8, changeFrequency: 'monthly' },
  { route: '/blog', priority: 0.7, changeFrequency: 'weekly' },
  { route: '/about', priority: 0.6, changeFrequency: 'yearly' },
  { route: '/hardware', priority: 0.7, changeFrequency: 'yearly' },
  { route: '/download', priority: 0.6, changeFrequency: 'monthly' },
  { route: '/contact', priority: 0.6, changeFrequency: 'yearly' },
  { route: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { route: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { route: '/cookies', priority: 0.3, changeFrequency: 'yearly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const industries = await listSolutionSlugs()
  const posts = await listPostRefs()

  return [
    ...STATIC_ROUTES.map(({ route, priority, changeFrequency }) =>
      entry(route, { priority, changeFrequency }),
    ),
    // App slugs come from the code registry and are the same in both languages.
    ...catalogApps.map((m) =>
      entry(
        { pathname: '/apps/[slug]', params: { slug: m.slug } },
        { priority: 0.6, changeFrequency: 'monthly' },
      ),
    ),
    ...industries.map((s) =>
      entry(
        {
          sr: { pathname: '/solutions/[industry]', params: { industry: s.slug.sr } },
          en: { pathname: '/solutions/[industry]', params: { industry: s.slug.en } },
        },
        { lastModified: s.updatedAt, priority: 0.7, changeFrequency: 'monthly' },
      ),
    ),
    ...posts.map((p) =>
      entry(
        {
          sr: { pathname: '/blog/[slug]', params: { slug: p.slug.sr } },
          en: { pathname: '/blog/[slug]', params: { slug: p.slug.en } },
        },
        { lastModified: p.updatedAt, priority: 0.6, changeFrequency: 'monthly' },
      ),
    ),
  ]
}
