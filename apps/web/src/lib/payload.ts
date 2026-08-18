import config from '@payload-config'
import { getPayload } from 'payload'

import type { LocaleAvailability, LocalePaths, SeoLocale } from '@/lib/seo'
import type { Media } from '@/payload-types'

/** Cached Payload local-API client for server-side data access (blog). */
export function getPayloadClient() {
  return getPayload({ config })
}

export interface EditorialSeo {
  metaTitle?: string | null
  metaDescription?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: string | Media | null
  indexable?: boolean | null
  canonicalOverride?: string | null
}

export interface EditorialState {
  slugs: LocalePaths
  availability: LocaleAvailability
  indexable: LocaleAvailability
  seo: Partial<Record<SeoLocale, EditorialSeo>>
}

export function mediaUrl(value: string | Media | null | undefined): string | undefined {
  return typeof value === 'object' && value ? (value.url ?? undefined) : undefined
}

interface EditorialDefaults {
  indexable: boolean
  localeReady: boolean
}

/**
 * Fail-closed publishing gate: a locale version is public only once an editor
 * has explicitly marked it ready and indexable.
 *
 * This used to be opt-in (`=== 'true'`), for the length of a rollout in which
 * legacy Posts/Solutions predated the gate fields and would have vanished the
 * moment it was enforced. That rollout is done — every published locale version
 * of every Post, Solution and App Page now carries an explicit decision, which
 * `pnpm seo:gates` reports and re-checks. Opt-in was the wrong shape to leave
 * behind: the *absence* of a variable decided that unreviewed content could be
 * indexed, which is exactly how production served it — the variable was never
 * set there — and how any new environment would serve it again. (Preview and
 * staging deploys were never the exposure; they are blocked sitewide by the
 * origin check in `site-url.ts`.)
 *
 * `SEO_STRICT_CONTENT_GATES=false` still relaxes it, for a bulk import whose
 * records legitimately have no decision yet. Nothing else needs to set it.
 */
export const STRICT_CONTENT_GATES = process.env.SEO_STRICT_CONTENT_GATES !== 'false'

export function legacyContentDefaults(): EditorialDefaults {
  return {
    indexable: !STRICT_CONTENT_GATES,
    localeReady: !STRICT_CONTENT_GATES,
  }
}

export function contentRecordMayBeIndexed(value: {
  localeReady?: boolean | null
  seo?: { indexable?: boolean | null } | null
}): boolean {
  return STRICT_CONTENT_GATES
    ? value.localeReady === true && value.seo?.indexable === true
    : value.localeReady !== false && value.seo?.indexable !== false
}

export function contentRecordIsApproved(value: {
  localeReady?: boolean | null
  seo?: { indexable?: boolean | null; canonicalOverride?: string | null } | null
}): boolean {
  return contentRecordMayBeIndexed(value) && !value.seo?.canonicalOverride?.trim()
}

type LocalizedUnknown = Partial<Record<SeoLocale, unknown>>

function isLocalizedMap(value: unknown): value is LocalizedUnknown {
  return value !== null && typeof value === 'object' && ('sr' in value || 'en' in value)
}

function localizedValue(value: unknown, locale: SeoLocale): unknown {
  return isLocalizedMap(value) ? value[locale] : value
}

function localizedBoolean(value: unknown, locale: SeoLocale, fallback: boolean): boolean {
  const resolved = localizedValue(value, locale)
  return typeof resolved === 'boolean' ? resolved : fallback
}

function localizedSeo(value: unknown, locale: SeoLocale): EditorialSeo {
  const resolved = localizedValue(value, locale)
  return resolved !== null && typeof resolved === 'object' ? resolved : {}
}

/**
 * Both languages' slugs for one document.
 *
 * A localised field normally comes back as the value for the requested locale;
 * `locale: 'all'` returns the whole map instead. The generated types don't model
 * that — they describe a localised field by its base type whichever locale is
 * asked for — hence the cast.
 */
export async function slugPair(
  collection: 'posts' | 'solutions',
  id: string | number,
): Promise<LocalePaths> {
  const state = await getEditorialState(collection, id, legacyContentDefaults())
  return state.slugs
}

/**
 * Reads the localised publishing and SEO state in one query.
 *
 * Payload's generated types describe a localised field as its value for one
 * locale. With `locale: 'all'`, however, the Local API returns `{sr, en}` maps.
 * Keeping that unavoidable cast here prevents every route from inventing a
 * slightly different interpretation of missing legacy values.
 */
export function editorialStateFromDocument(
  doc: unknown,
  defaults: EditorialDefaults,
): EditorialState {
  const raw = doc as {
    localeReady?: unknown
    seo?: unknown
    slug: unknown
  }

  const rawSlugs = isLocalizedMap(raw.slug) ? raw.slug : { sr: raw.slug, en: raw.slug }
  const slugs: LocalePaths = {
    sr: typeof rawSlugs.sr === 'string' ? rawSlugs.sr : '',
    en: typeof rawSlugs.en === 'string' ? rawSlugs.en : '',
  }

  const seo = {
    sr: localizedSeo(raw.seo, 'sr'),
    en: localizedSeo(raw.seo, 'en'),
  }
  const availability: LocaleAvailability = {}
  const indexableByLocale: LocaleAvailability = {}

  for (const locale of ['sr', 'en'] as const) {
    const ready = localizedBoolean(raw.localeReady, locale, defaults.localeReady)
    const allowed =
      typeof seo[locale].indexable === 'boolean' ? seo[locale].indexable : defaults.indexable
    const indexable = Boolean(slugs[locale]) && ready && allowed
    const hasCanonicalOverride = Boolean(seo[locale].canonicalOverride?.trim())
    indexableByLocale[locale] = indexable
    // Consolidated URLs stay accessible and canonicalized, but are not listed
    // as independent sitemap/hreflang destinations.
    availability[locale] = indexable && !hasCanonicalOverride
  }

  return { slugs, availability, indexable: indexableByLocale, seo }
}

export async function getEditorialState(
  collection: 'posts' | 'solutions' | 'app-pages',
  id: string | number,
  defaults: EditorialDefaults,
): Promise<EditorialState> {
  const payload = await getPayloadClient()
  const doc = await payload.findByID({
    collection,
    id,
    locale: 'all',
    depth: 1,
    select: { slug: true, localeReady: true, seo: true },
  })
  return editorialStateFromDocument(doc, defaults)
}
