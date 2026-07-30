import type { MetadataRoute } from 'next'

import { listAppPageRefs } from '@/lib/apps'
import { listPostRefs } from '@/lib/posts'
import type { LocaleAvailability, LocaleRoutes, Route } from '@/lib/seo'
import { absoluteUrl } from '@/lib/seo'
import { listSolutionSlugs } from '@/lib/solutions'

type Entry = MetadataRoute.Sitemap[number]

interface EntryOptions {
  availability?: LocaleAvailability
  lastModified?: string
}

/**
 * One sitemap entry per language, each carrying the complete alternate set.
 *
 * Merely hanging Serbian off the English `<loc>` as an alternate is not a
 * complete multilingual sitemap. Every localized URL needs its own `<url>`
 * element, and every element repeats the same reciprocal hreflang set.
 */
function entries(route: Route | LocaleRoutes, options: EntryOptions = {}): Entry[] {
  const routes: LocaleRoutes =
    typeof route === 'object' && 'sr' in route ? route : { sr: route, en: route }
  const availability = options.availability ?? { en: true, sr: true }
  const sr = availability.sr !== false ? absoluteUrl('sr', routes.sr) : undefined
  const en = availability.en !== false ? absoluteUrl('en', routes.en) : undefined
  const languages: Record<string, string> = {}
  if (en) languages.en = en
  if (sr) languages.sr = sr
  if (en) languages['x-default'] = en
  else if (sr) languages['x-default'] = sr

  const common = {
    ...(options.lastModified ? { lastModified: options.lastModified } : {}),
    alternates: { languages },
  }

  return [...(en ? [{ url: en, ...common }] : []), ...(sr ? [{ url: sr, ...common }] : [])]
}

const STATIC_ROUTES: Route[] = [
  '/',
  '/how-it-works',
  '/features',
  '/pricing',
  '/what-is-digital-signage',
  '/apps',
  '/solutions',
  '/blog',
  '/about',
  '/hardware',
  '/download',
  '/contact',
  '/privacy',
  '/terms',
  '/cookies',
]

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const industries = await listSolutionSlugs()
  const posts = await listPostRefs()
  const apps = await listAppPageRefs()

  return [
    ...STATIC_ROUTES.flatMap((route) => entries(route)),
    // A technical app manifest is not editorial approval. Only reviewed,
    // indexable App Page locale versions are eligible for discovery here.
    ...apps.flatMap((app) =>
      entries(
        {
          sr: { pathname: '/apps/[slug]', params: { slug: app.slug.sr } },
          en: { pathname: '/apps/[slug]', params: { slug: app.slug.en } },
        },
        { availability: app.availability, lastModified: app.updatedAt },
      ),
    ),
    ...industries.map((s) =>
      entries(
        {
          sr: { pathname: '/solutions/[industry]', params: { industry: s.slug.sr } },
          en: { pathname: '/solutions/[industry]', params: { industry: s.slug.en } },
        },
        { availability: s.availability, lastModified: s.updatedAt },
      ),
    ),
    ...posts.map((p) =>
      entries(
        {
          sr: { pathname: '/blog/[slug]', params: { slug: p.slug.sr } },
          en: { pathname: '/blog/[slug]', params: { slug: p.slug.en } },
        },
        { availability: p.availability, lastModified: p.updatedAt },
      ),
    ),
  ].flat()
}
