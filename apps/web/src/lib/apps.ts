import {
  APP_CATEGORIES,
  APP_CATEGORY_MEMBERSHIP,
  APP_MANIFESTS,
  NEWS_MANIFESTS,
} from '@signagewall/apps'
import type { AppManifest } from '@signagewall/apps-contract'
import { unstable_cache } from 'next/cache'

import {
  contentRecordIsApproved,
  editorialStateFromDocument,
  getEditorialState,
  getPayloadClient,
  mediaUrl,
} from '@/lib/payload'
import type { LocaleAvailability, LocalePaths } from '@/lib/seo'
import type { AppPage, Media, Post, Solution, User } from '@/payload-types'

interface AppCategory {
  slug: string
  name: string
  order: number
}

const appManifests = APP_MANIFESTS
const appCategories = APP_CATEGORIES as unknown as AppCategory[]
const appCategoryMembership = APP_CATEGORY_MEMBERSHIP
const presetOnlyAppKeys = new Set(NEWS_MANIFESTS.map((manifest) => manifest.slug))

/** Branded RSS presets are product choices, not independent search intents. */
export function isAppPageSeoEligible(appKey: string): boolean {
  return !presetOnlyAppKeys.has(appKey)
}

/** Catalog data (registry + membership) reused from the product's shared package. */
export const appManifestBySlug = new Map<string, AppManifest>(
  appManifests.map((manifest) => [manifest.slug, manifest]),
)

/** Only apps that belong to at least one category are surfaced on the marketing site. */
export const catalogApps: AppManifest[] = appManifests.filter(
  (manifest) => (appCategoryMembership[manifest.slug] ?? []).length > 0,
)

export function orderedCategories() {
  return [...appCategories].sort((a, b) => a.order - b.order)
}

export function categoriesForApp(slug: string): string[] {
  return appCategoryMembership[slug] ?? []
}

/** Up to `limit` other apps sharing a category with `slug`. */
export function relatedApps(slug: string, limit = 3): AppManifest[] {
  const cats = new Set(categoriesForApp(slug))
  return catalogApps
    .filter(
      (m) =>
        m.slug !== slug &&
        isAppPageSeoEligible(m.slug) &&
        categoriesForApp(m.slug).some((c) => cats.has(c)),
    )
    .slice(0, limit)
}

export type AppLocale = 'sr' | 'en'
export type AppKey = AppPage['appKey']
export type AppPageSource = 'editorial' | 'manifest'

export interface AppPageSeo {
  metaTitle: string
  metaDescription: string
  ogTitle: string
  ogDescription: string
  ogImage: string | undefined
  canonical: string | undefined
}

export interface AppCatalogEntry extends AppPageSeo {
  /** Stable product registry key. This never changes when the marketing URL does. */
  appKey: string
  /** Localized editorial slug, or appKey for a legacy manifest fallback. */
  slug: string
  name: string
  tagline: string
  summary: string
  manifest: AppManifest
  categories: string[]
  order: number
  source: AppPageSource
  editorialId: string | null
  localeReady: boolean
  indexable: boolean
  updatedAt: string | undefined
}

export interface AppPageTextBlock {
  title: string
  body: string
}

export interface AppPageRequirements {
  account: string | undefined
  dataSource: string | undefined
  network: string | undefined
  refreshBehavior: string | undefined
  offlineBehavior: string | undefined
  limitations: string | undefined
}

export interface AppPageImage {
  id: string
  url: string
  alt: string
  width: number | null
  height: number | null
}

export interface AppRelatedPost {
  id: string
  slug: string
  title: string
  excerpt: string
  coverUrl: string | undefined
}

export interface AppRelatedSolution {
  id: string
  slug: string
  name: string
  tagline: string
  icon: Solution['icon']
}

export interface AppRelatedApp {
  id: string
  appKey: string
  slug: string
  name: string
  summary: string
  icon: string
}

export interface AppPageReviewer {
  id: string
  name: string
}

export interface AppPageDetail extends AppCatalogEntry {
  slugs: LocalePaths
  /**
   * A locale is available only when it has a slug and is both localeReady and
   * indexable. This is the safe input for hreflang.
   */
  availability: LocaleAvailability
  resolvedBy: 'slug' | 'appKey' | 'legacy'
  /** True when a legacy appKey URL should redirect to the editorial slug. */
  shouldRedirect: boolean
  heroTitle: string
  content: AppPage['content'] | null
  benefits: string[]
  features: AppPageTextBlock[]
  useCases: AppPageTextBlock[]
  setupSteps: AppPageTextBlock[]
  requirements: AppPageRequirements
  screenshots: AppPageImage[]
  faq: { q: string; a: string }[]
  intent: AppPage['intent'] | null
  lastReviewedAt: string | undefined
  reviewedBy: AppPageReviewer | null
  relatedPosts: AppRelatedPost[]
  relatedSolutions: AppRelatedSolution[]
  relatedApps: AppRelatedApp[]
}

export interface AppPageRef {
  id: string
  appKey: string
  slug: LocalePaths
  availability: LocaleAvailability
  updatedAt: string
}

const PUBLISHED = { _status: { equals: 'published' } } as const

function normalizeLocale(locale: string): AppLocale {
  return locale === 'sr' ? 'sr' : 'en'
}

function text(value: string | null | undefined): string | undefined {
  const normalized = value?.trim()
  if (!normalized) return undefined
  return normalized
}

function populated<T extends { id: string }>(value: string | T): value is T {
  return typeof value === 'object'
}

function appPageSeo(doc: AppPage | undefined, manifest: AppManifest): AppPageSeo {
  const name = text(doc?.name) ?? manifest.name
  const summary = text(doc?.summary) ?? manifest.description
  const metaTitle = text(doc?.seo?.metaTitle) ?? text(doc?.heroTitle) ?? name
  const metaDescription = text(doc?.seo?.metaDescription) ?? summary

  return {
    metaTitle,
    metaDescription,
    ogTitle: text(doc?.seo?.ogTitle) ?? metaTitle,
    ogDescription: text(doc?.seo?.ogDescription) ?? metaDescription,
    ogImage: mediaUrl(doc?.seo?.ogImage),
    canonical: text(doc?.seo?.canonicalOverride),
  }
}

function catalogEntry(
  manifest: AppManifest,
  doc: AppPage | undefined,
  technicalOrder: number,
): AppCatalogEntry {
  const seo = appPageSeo(doc, manifest)
  const localeReady = doc?.localeReady === true
  const indexable =
    isAppPageSeoEligible(manifest.slug) && localeReady && doc.seo?.indexable === true
  const summary = text(doc?.summary) ?? manifest.tagline

  return {
    appKey: manifest.slug,
    slug: text(doc?.slug) ?? manifest.slug,
    name: text(doc?.name) ?? manifest.name,
    tagline: summary,
    summary,
    manifest,
    categories: categoriesForApp(manifest.slug),
    order: doc?.order ?? 1000 + technicalOrder,
    source: doc ? 'editorial' : 'manifest',
    editorialId: doc?.id ?? null,
    localeReady,
    indexable,
    updatedAt: doc?.updatedAt,
    ...seo,
  }
}

async function queryAppCatalog(locale: string): Promise<AppCatalogEntry[]> {
  const currentLocale = normalizeLocale(locale)
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'app-pages',
    locale: currentLocale,
    // Never fill unfinished English copy with Serbian (or vice versa).
    fallbackLocale: false,
    where: PUBLISHED,
    sort: 'order',
    depth: 1,
    limit: 1000,
  })
  const editorialByKey = new Map(docs.map((doc) => [doc.appKey, doc]))

  return catalogApps
    .map((manifest, index) => catalogEntry(manifest, editorialByKey.get(manifest.slug), index))
    .sort(
      (a, b) =>
        a.order - b.order ||
        a.name.localeCompare(b.name, currentLocale === 'sr' ? 'sr-Latn' : 'en'),
    )
}

/**
 * Complete marketing catalog for one locale.
 *
 * Published App Page copy overrides its technical manifest. Every manifest
 * remains present during migration, but a manifest-only entry is explicitly
 * non-indexable and can never leak into the editorial sitemap.
 */
export const listAppCatalog = unstable_cache(queryAppCatalog, ['app-page-catalog'], {
  revalidate: 3600,
  tags: ['app-pages'],
})

function image(value: string | Media): AppPageImage | null {
  if (!populated(value) || !value.url) return null
  return {
    id: value.id,
    url: value.url,
    alt: value.alt ?? '',
    width: value.width ?? null,
    height: value.height ?? null,
  }
}

function reviewer(value: string | User | null | undefined): AppPageReviewer | null {
  if (!value || !populated(value)) return null
  return { id: value.id, name: value.name ?? '' }
}

function publicPost(value: string | Post): AppRelatedPost | null {
  if (!populated(value) || value._status !== 'published' || !contentRecordIsApproved(value)) {
    return null
  }
  return {
    id: value.id,
    slug: value.slug,
    title: value.title,
    excerpt: value.excerpt ?? '',
    coverUrl: mediaUrl(value.coverImage),
  }
}

function publicSolution(value: string | Solution): AppRelatedSolution | null {
  if (!populated(value) || value._status !== 'published' || !contentRecordIsApproved(value)) {
    return null
  }
  return {
    id: value.id,
    slug: value.slug,
    name: value.name,
    tagline: value.tagline,
    icon: value.icon,
  }
}

function publicApp(value: string | AppPage): AppRelatedApp | null {
  if (
    !populated(value) ||
    value._status !== 'published' ||
    value.localeReady !== true ||
    value.seo?.indexable !== true ||
    Boolean(value.seo.canonicalOverride?.trim()) ||
    !isAppPageSeoEligible(value.appKey)
  ) {
    return null
  }

  const manifest = appManifestBySlug.get(value.appKey)
  const slug = text(value.slug)
  if (!manifest || !slug) return null

  return {
    id: value.id,
    appKey: value.appKey,
    slug,
    name: text(value.name) ?? manifest.name,
    summary: text(value.summary) ?? manifest.tagline,
    icon: manifest.icon ?? '',
  }
}

function requirements(value: AppPage['requirements']): AppPageRequirements {
  return {
    account: text(value?.account),
    dataSource: text(value?.dataSource),
    network: text(value?.network),
    refreshBehavior: text(value?.refreshBehavior),
    offlineBehavior: text(value?.offlineBehavior),
    limitations: text(value?.limitations),
  }
}

function textBlocks(
  value:
    | {
        title: string
        body: string
        id?: string | null
      }[]
    | null
    | undefined,
): AppPageTextBlock[] {
  return (value ?? []).map((item) => ({ title: item.title, body: item.body }))
}

function legacyDetail(manifest: AppManifest): AppPageDetail {
  const entry = catalogEntry(manifest, undefined, catalogApps.indexOf(manifest))
  return {
    ...entry,
    slugs: { sr: manifest.slug, en: manifest.slug },
    availability: { sr: false, en: false },
    resolvedBy: 'legacy',
    shouldRedirect: false,
    heroTitle: manifest.name,
    content: null,
    benefits: [],
    features: [],
    useCases: [],
    setupSteps: [],
    requirements: requirements(undefined),
    screenshots: [],
    faq: [],
    intent: null,
    lastReviewedAt: undefined,
    reviewedBy: null,
    relatedPosts: [],
    relatedSolutions: [],
    relatedApps: relatedApps(manifest.slug).map((related) => ({
      id: related.slug,
      appKey: related.slug,
      slug: related.slug,
      name: related.name,
      summary: related.tagline,
      icon: related.icon ?? '',
    })),
  }
}

async function queryAppPage(locale: string, identifier: string): Promise<AppPageDetail | null> {
  const currentLocale = normalizeLocale(locale)
  const normalizedIdentifier = identifier.trim()
  if (!normalizedIdentifier) return null

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'app-pages',
    locale: currentLocale,
    fallbackLocale: false,
    where: {
      and: [
        PUBLISHED,
        {
          or: [
            { slug: { equals: normalizedIdentifier } },
            { appKey: { equals: normalizedIdentifier } },
          ],
        },
      ],
    },
    depth: 1,
    limit: 4,
  })

  // A localized slug wins if bad editorial data ever makes another page's
  // appKey collide with it. Slug is the visitor-facing identifier.
  const doc =
    docs.find((candidate) => candidate.slug === normalizedIdentifier) ??
    docs.find((candidate) => candidate.appKey === normalizedIdentifier)

  if (!doc) {
    const manifest = appManifestBySlug.get(normalizedIdentifier)
    return manifest ? legacyDetail(manifest) : null
  }

  const manifest = appManifestBySlug.get(doc.appKey)
  if (!manifest) return null

  const state = await getEditorialState('app-pages', doc.id, {
    localeReady: false,
    indexable: false,
  })
  const slugs: LocalePaths = {
    sr: state.slugs.sr || manifest.slug,
    en: state.slugs.en || manifest.slug,
  }
  const availability: LocaleAvailability = isAppPageSeoEligible(doc.appKey)
    ? state.availability
    : { sr: false, en: false }
  const seo = appPageSeo(doc, manifest)
  const entry = catalogEntry(manifest, doc, catalogApps.indexOf(manifest))
  const resolvedBy = doc.slug === normalizedIdentifier ? 'slug' : 'appKey'

  return {
    ...entry,
    ...seo,
    slugs,
    availability,
    resolvedBy,
    shouldRedirect: resolvedBy === 'appKey' && entry.slug !== normalizedIdentifier,
    heroTitle: text(doc.heroTitle) ?? text(doc.name) ?? manifest.name,
    content: doc.content ?? null,
    benefits: (doc.benefits ?? []).map((benefit) => benefit.text),
    features: textBlocks(doc.features),
    useCases: textBlocks(doc.useCases),
    setupSteps: textBlocks(doc.setupSteps),
    requirements: requirements(doc.requirements),
    screenshots: (doc.screenshots ?? [])
      .map((screenshot) => image(screenshot))
      .filter((screenshot): screenshot is AppPageImage => screenshot !== null),
    faq: (doc.faq ?? []).map((item) => ({ q: item.q, a: item.a })),
    intent: doc.intent ?? null,
    lastReviewedAt: doc.lastReviewedAt ?? undefined,
    reviewedBy: reviewer(doc.reviewedBy),
    relatedPosts: (doc.relatedPosts ?? [])
      .map((related) => publicPost(related))
      .filter((related): related is AppRelatedPost => related !== null),
    relatedSolutions: (doc.relatedSolutions ?? [])
      .map((related) => publicSolution(related))
      .filter((related): related is AppRelatedSolution => related !== null),
    relatedApps: (doc.relatedApps ?? [])
      .map((related) => publicApp(related))
      .filter(
        (related): related is AppRelatedApp => related !== null && related.appKey !== doc.appKey,
      ),
    localeReady: doc.localeReady === true,
    indexable: isAppPageSeoEligible(doc.appKey) && state.indexable[currentLocale] === true,
  }
}

/**
 * Resolve an App Page by its localized marketing slug or by legacy appKey.
 * Callers can use `shouldRedirect` to permanently consolidate an appKey URL.
 */
export const getAppPage = unstable_cache(queryAppPage, ['app-page-detail'], {
  revalidate: 3600,
  tags: ['app-pages', 'posts', 'solutions'],
})

async function queryAppPageSlugPair(id: string): Promise<LocalePaths> {
  const state = await getEditorialState('app-pages', id, {
    localeReady: false,
    indexable: false,
  })
  return state.slugs
}

/** Both localized marketing slugs for one editorial App Page document. */
export const getAppPageSlugPair = unstable_cache(queryAppPageSlugPair, ['app-page-slug-pair'], {
  revalidate: 3600,
  tags: ['app-pages'],
})

async function queryIndexableAppPageRefs(): Promise<AppPageRef[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'app-pages',
    locale: 'all',
    where: PUBLISHED,
    sort: 'order',
    depth: 0,
    limit: 1000,
    select: {
      appKey: true,
      slug: true,
      localeReady: true,
      seo: true,
      updatedAt: true,
    },
  })

  return docs
    .filter((doc) => isAppPageSeoEligible(doc.appKey))
    .map((doc) => {
      const state = editorialStateFromDocument(doc, {
        localeReady: false,
        indexable: false,
      })
      return {
        id: doc.id,
        appKey: doc.appKey,
        slug: state.slugs,
        availability: state.availability,
        updatedAt: doc.updatedAt,
      }
    })
    .filter((ref) => ref.availability.en === true || ref.availability.sr === true)
}

/**
 * Sitemap-safe references. Manifest-only and unfinished locale versions are
 * absent by construction.
 */
export const listIndexableAppPageRefs = unstable_cache(
  queryIndexableAppPageRefs,
  ['indexable-app-page-refs'],
  {
    revalidate: 3600,
    tags: ['app-pages'],
  },
)

/** Shorter alias matching `listPostRefs` and the existing sitemap vocabulary. */
export const listAppPageRefs = listIndexableAppPageRefs
