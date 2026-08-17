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

/* Static pages only change when a deploy ships them — the build moment is
   their truthful `lastmod` (inlined per deploy via next.config.ts `env`). */
const STATIC_LASTMOD = process.env.NEXT_PUBLIC_BUILD_TIME

const STATIC_ROUTES: Route[] = [
  '/',
  '/how-it-works',
  '/features',
  '/pricing',
  '/what-is-digital-signage',
  '/free-digital-signage-software',
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

/* Matches the pages it lists. Crawlers refetch this far less often than the
   window itself, so a shorter one would only buy database round trips. */
export const revalidate = 172_800

/** Newest `updatedAt` across a collection, or undefined when it is empty. */
function newestUpdatedAt(
  refs: { updatedAt?: string | Date | undefined }[],
): string | undefined {
  let newest: number | undefined
  for (const ref of refs) {
    if (!ref.updatedAt) continue
    const time = new Date(ref.updatedAt).getTime()
    if (Number.isNaN(time)) continue
    if (newest === undefined || time > newest) newest = time
  }
  return newest === undefined ? undefined : new Date(newest).toISOString()
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const industries = await listSolutionSlugs()
  const posts = await listPostRefs()
  const apps = await listAppPageRefs()

  // The three index pages list content that changes in the CMS between
  // deploys, so the build moment understates them: a post published today
  // would advertise a `lastmod` from the last deploy and crawlers would
  // deprioritise a page that genuinely changed. Their newest child is the
  // truthful value; every other static page really does only change on deploy.
  const indexLastmod = new Map<string, string | undefined>([
    ['/blog', newestUpdatedAt(posts)],
    ['/apps', newestUpdatedAt(apps)],
    ['/solutions', newestUpdatedAt(industries)],
  ])

  return [
    ...STATIC_ROUTES.flatMap((route) => {
      const lastModified =
        (typeof route === 'string' ? indexLastmod.get(route) : undefined) ??
        STATIC_LASTMOD
      return entries(route, lastModified ? { lastModified } : {})
    }),
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
