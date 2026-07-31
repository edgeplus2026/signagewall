import { unstable_cache } from 'next/cache'

import {
  contentRecordIsApproved,
  editorialStateFromDocument,
  getEditorialState,
  getPayloadClient,
  legacyContentDefaults,
  mediaUrl,
  STRICT_CONTENT_GATES,
} from '@/lib/payload'
import type { LocaleAvailability, LocalePaths } from '@/lib/seo'

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
  ogTitle: string
  ogDescription: string
  ogImage: string | undefined
  canonical: string | undefined
  availability: LocaleAvailability
  indexable: boolean
  audience: string | undefined
  /** Prose paragraphs, split from a single textarea on blank lines. */
  intro: string[]
  scenarios: { title: string; body: string }[]
  /** One worked example with real numbers. Null until an editor writes it. */
  proof: { title: string; body: string } | null
  /** App catalog slugs — the internal links out of an industry page. */
  recommendedApps: string[]
  relatedPosts: {
    id: string
    slug: string
    title: string
    excerpt: string
    coverUrl: string | null
  }[]
  relatedSolutions: SolutionSummary[]
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
    fallbackLocale: false,
    where: { and: [PUBLISHED, { localeReady: { not_equals: false } }] },
    sort: 'order',
    depth: 1,
    limit,
  })

  return docs
    .filter(
      (solution) =>
        Boolean(solution.slug && solution.name && solution.tagline) &&
        contentRecordIsApproved(solution),
    )
    .map((d) => ({
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

async function querySolution(locale: string, slug: string): Promise<SolutionDetail | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'solutions',
    locale: locale as Locale,
    fallbackLocale: false,
    where: { and: [{ slug: { equals: slug } }, PUBLISHED] },
    depth: 1,
    limit: 1,
  })

  const d = docs[0]
  if (!d) return null
  const state = await getEditorialState('solutions', d.id, legacyContentDefaults())
  const currentLocale = locale === 'sr' ? 'sr' : 'en'
  const seo = state.seo[currentLocale] ?? {}
  const relatedAppKeys = (d.relatedApps ?? [])
    .map((related) =>
      typeof related === 'object' && related._status === 'published' ? related.appKey : null,
    )
    .filter((key): key is string => typeof key === 'string')
  const legacyAppKeys = (d.recommendedApps ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean)

  return {
    slug: d.slug,
    slugs: state.slugs,
    name: d.name,
    tagline: d.tagline,
    icon: d.icon,
    title: d.title,
    subtitle: d.subtitle ?? '',
    // Meta falls back to the visible copy so a page is never shipped with an
    // empty title or description just because the SEO fields weren't filled.
    metaTitle: seo.metaTitle ?? d.metaTitle ?? d.title,
    metaDescription: seo.metaDescription ?? d.metaDescription ?? d.subtitle ?? d.tagline,
    ogTitle: seo.ogTitle ?? seo.metaTitle ?? d.metaTitle ?? d.title,
    ogDescription:
      seo.ogDescription ?? seo.metaDescription ?? d.metaDescription ?? d.subtitle ?? d.tagline,
    ogImage: mediaUrl(seo.ogImage),
    canonical: seo.canonicalOverride ?? undefined,
    availability: state.availability,
    indexable: state.indexable[currentLocale] === true,
    audience: d.intent?.audience ?? undefined,
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
    recommendedApps: relatedAppKeys.length > 0 ? relatedAppKeys : legacyAppKeys,
    relatedPosts: (d.relatedPosts ?? []).flatMap((post) =>
      typeof post === 'object' && post._status === 'published' && contentRecordIsApproved(post)
        ? [
            {
              id: post.id,
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt ?? '',
              coverUrl: mediaUrl(post.coverImage) ?? null,
            },
          ]
        : [],
    ),
    relatedSolutions: (d.relatedSolutions ?? []).flatMap((related) =>
      typeof related === 'object' &&
      related.id !== d.id &&
      related._status === 'published' &&
      contentRecordIsApproved(related)
        ? [
            {
              slug: related.slug,
              name: related.name,
              tagline: related.tagline,
              icon: related.icon,
            },
          ]
        : [],
    ),
    benefits: (d.benefits ?? []).map((b) => b.text),
    faq: (d.faq ?? []).map((f) => ({ q: f.q, a: f.a })),
  }
}

export const getSolution = unstable_cache(querySolution, ['solution-detail'], {
  revalidate: 3600,
  tags: ['solutions', 'app-pages', 'posts'],
})

/**
 * Slug pairs plus `updatedAt` — used by the sitemap, which needs no copy but
 * does need both languages and a `lastmod` per entry.
 */
export async function listSolutionSlugs(): Promise<
  { slug: LocalePaths; availability: LocaleAvailability; updatedAt: string }[]
> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'solutions',
    // See `slugPair`: 'all' widens every localised field to its locale map.
    locale: 'all',
    where: PUBLISHED,
    sort: 'order',
    depth: 0,
    limit: 100,
    select: { slug: true, localeReady: true, seo: true, updatedAt: true },
  })
  return docs
    .map((d) => {
      const state = editorialStateFromDocument(d, legacyContentDefaults())
      return {
        slug: state.slugs,
        availability: state.availability,
        updatedAt: d.updatedAt,
      }
    })
    .filter((solution) => [solution.availability.en, solution.availability.sr].some(Boolean))
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
    const appPage = await payload.find({
      collection: 'app-pages',
      where: { appKey: { equals: appSlug } },
      depth: 0,
      limit: 1,
    })
    const appPageId = appPage.docs[0]?.id
    const { docs } = await payload.find({
      collection: 'solutions',
      locale: locale as Locale,
      fallbackLocale: false,
      where: {
        and: [
          PUBLISHED,
          {
            localeReady: STRICT_CONTENT_GATES ? { equals: true } : { not_equals: false },
          },
          {
            'seo.indexable': STRICT_CONTENT_GATES ? { equals: true } : { not_equals: false },
          },
          {
            or: [
              { recommendedApps: { contains: appSlug } },
              ...(appPageId ? [{ relatedApps: { equals: appPageId } }] : []),
            ],
          },
        ],
      },
      sort: 'order',
      depth: 0,
      limit: 100,
    })
    /* `contains` is a substring match, so "menu" would also match a hypothetical
       "menu-board". Re-check against the parsed list. */
    return docs
      .filter((d) => {
        const hasLegacyKey = (d.recommendedApps ?? '')
          .split(',')
          .map((s) => s.trim())
          .includes(appSlug)
        const hasRelation = Boolean(
          appPageId &&
          (d.relatedApps ?? []).some((related) =>
            typeof related === 'object' ? related.id === appPageId : related === appPageId,
          ),
        )
        return contentRecordIsApproved(d) && (hasLegacyKey || hasRelation)
      })
      .slice(0, 12)
      .map((d) => ({ slug: d.slug, name: d.name, tagline: d.tagline, icon: d.icon }))
  },
  ['solutions-using-app'],
  { revalidate: 3600, tags: ['solutions', 'app-solution-links'] },
)
