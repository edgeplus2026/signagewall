import { unstable_cache } from 'next/cache'

import { getPayloadClient, slugPair } from '@/lib/payload'
import type { LocalePaths } from '@/lib/seo'

/**
 * Industry pages now live in Payload so copy can change without a deploy — the
 * icon stays a code-side key (see `solution-icons.ts`) because a component
 * can't be stored in Mongo.
 */
export interface SolutionSummary {
  slug: string
  name: string
  tagline: string
  icon: string
}

export interface SolutionDetail extends SolutionSummary {
  /* Both languages' slugs — the page's own is not enough to write hreflang,
     which has to name the other language's URL too. */
  slugs: LocalePaths
  title: string
  subtitle: string
  metaTitle: string
  metaDescription: string
  /** Prose paragraphs, split from a single textarea on blank lines. */
  intro: string[]
  scenarios: { title: string; body: string }[]
  /** One worked example with real numbers. Null until an editor writes it. */
  proof: { title: string; body: string } | null
  /** App catalog slugs — the internal links out of an industry page. */
  recommendedApps: string[]
  benefits: string[]
  faq: { q: string; a: string }[]
}

type Locale = 'sr' | 'en'

const PUBLISHED = { _status: { equals: 'published' } } as const

async function querySolutions(locale: string, limit: number): Promise<SolutionSummary[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'solutions',
    locale: locale as Locale,
    where: PUBLISHED,
    sort: 'order',
    depth: 0,
    limit,
  })

  return docs.map((d) => ({
    slug: d.slug,
    name: d.name,
    tagline: d.tagline,
    icon: d.icon,
  }))
}

export function listSolutions(locale: string): Promise<SolutionSummary[]> {
  return querySolutions(locale, 100)
}

/**
 * The short list shown in the site chrome — the home grid and the footer, which
 * render on every page. Cached rather than queried per render: the industry
 * list changes about never, and the footer alone would otherwise be a Mongo
 * round-trip on every page view. Editors see a change within the hour, or at
 * once via `revalidateTag('solutions')`.
 */
export const listTopSolutions = unstable_cache(querySolutions, ['top-solutions'], {
  revalidate: 3600,
  tags: ['solutions'],
})

export async function getSolution(locale: string, slug: string): Promise<SolutionDetail | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'solutions',
    locale: locale as Locale,
    where: { and: [{ slug: { equals: slug } }, PUBLISHED] },
    depth: 0,
    limit: 1,
  })

  const d = docs[0]
  if (!d) return null

  return {
    slug: d.slug,
    slugs: await slugPair('solutions', d.id),
    name: d.name,
    tagline: d.tagline,
    icon: d.icon,
    title: d.title,
    subtitle: d.subtitle ?? '',
    // Meta falls back to the visible copy so a page is never shipped with an
    // empty title or description just because the SEO fields weren't filled.
    metaTitle: d.metaTitle ?? d.title,
    metaDescription: d.metaDescription ?? d.subtitle ?? d.tagline,
    /* Paragraphs are split on blank lines rather than stored as an array: an
       editor writing prose should not have to think in rows. */
    intro: (d.intro ?? '')
      .split(/\n\s*\n/)
      .map((para) => para.trim())
      .filter(Boolean),
    scenarios: (d.scenarios ?? []).map((s) => ({ title: s.title, body: s.body })),
    proof: d.proof?.title && d.proof.body ? { title: d.proof.title, body: d.proof.body } : null,
    /* Slugs, not relations: the app catalog is a code registry, not a
       collection, so there is nothing for Payload to relate to. */
    recommendedApps: (d.recommendedApps ?? '')
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean),
    benefits: (d.benefits ?? []).map((b) => b.text),
    faq: (d.faq ?? []).map((f) => ({ q: f.q, a: f.a })),
  }
}

/**
 * Slug pairs plus `updatedAt` — used by the sitemap, which needs no copy but
 * does need both languages and a `lastmod` per entry.
 */
export async function listSolutionSlugs(): Promise<{ slug: LocalePaths; updatedAt: string }[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'solutions',
    // See `slugPair`: 'all' widens every localised field to its locale map.
    locale: 'all',
    where: PUBLISHED,
    sort: 'order',
    depth: 0,
    limit: 100,
    select: { slug: true, updatedAt: true },
  })
  return docs.map((d) => ({ slug: d.slug as unknown as LocalePaths, updatedAt: d.updatedAt }))
}

/**
 * The industries that recommend a given app.
 *
 * The reciprocal of `recommendedApps`. Industry pages link out to apps; without
 * this the apps were a dead end, and the link graph only ran one way — which
 * wastes half the value of having built it. A visitor reading about the menu app
 * is one click from the hospitality page that explains why they want it.
 */
export const listSolutionsUsingApp = unstable_cache(
  async (locale: string, appSlug: string): Promise<SolutionSummary[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'solutions',
      locale: locale as Locale,
      where: { and: [PUBLISHED, { recommendedApps: { contains: appSlug } }] },
      sort: 'order',
      depth: 0,
      limit: 12,
    })
    /* `contains` is a substring match, so "menu" would also match a hypothetical
       "menu-board". Re-check against the parsed list. */
    return docs
      .filter((d) =>
        (d.recommendedApps ?? '')
          .split(',')
          .map((s) => s.trim())
          .includes(appSlug),
      )
      .map((d) => ({ slug: d.slug, name: d.name, tagline: d.tagline, icon: d.icon }))
  },
  ['solutions-using-app'],
  { revalidate: 3600, tags: ['solutions'] },
)
