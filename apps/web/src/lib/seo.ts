import type { Metadata } from 'next'

import { getPathname } from '@/i18n/navigation'
import type { AppPathname } from '@/i18n/routing'
import { SITE_URL } from '@/lib/site-url'
import { X_HANDLE } from '@/lib/social'

/**
 * A route, in the form `getPathname` understands: the internal pathname, plus
 * params when it is dynamic. `/features` is a route; `/mogucnosti` is what it
 * renders as, and nothing outside `routing.ts` should know that.
 */
export type Route = AppPathname | { pathname: AppPathname; params: Record<string, string> }

/**
 * Absolute URL for a route in one language.
 *
 * The locale prefix and the localised segment both come from `routing.ts` via
 * `getPathname` rather than being assembled here — this used to concatenate a
 * locale prefix onto a hard-coded path, which silently became wrong the moment
 * the two languages stopped sharing URLs.
 */
export function absoluteUrl(locale: string, route: Route = '/'): string {
  /* `href` is cast because `getPathname` resolves its params type from the
     specific pathname literal, which a `Route` union cannot narrow to. */
  const pathname = getPathname({ href: route as never, locale })
  /* Next normalises every URL it renders through the Metadata API against
     `trailingSlash` (false here), so the English home page ships a canonical of
     the bare origin. `sitemap.ts` writes its own `<loc>`s and JSON-LD its own
     `url`s, neither of which gets that treatment — keeping the slash here meant
     the home page was announced as `…com/` in the sitemap and `…com` in the
     canonical. The two spellings are the same URL after normalisation, but the
     mismatch is exactly the kind an audit flags. Normalise once, in the only
     place that builds these URLs. */
  return `${SITE_URL}${pathname === '/' ? '' : pathname}`
}

/** Public pathname for route-level redirects and diagnostics. */
export function publicPath(locale: string, route: Route = '/'): string {
  return new URL(absoluteUrl(locale, route)).pathname
}

/**
 * A pair of *slugs*, one per language — Payload slugs are localised, so a post
 * is a different segment in each. This is data, not a route: `lib/posts` and
 * `lib/solutions` return it straight from the database.
 */
export interface LocalePaths {
  sr: string
  en: string
}

/**
 * A route that resolves differently per language, because its slug does.
 * Static routes need only a `Route` — the pathnames map already handles those.
 */
export interface LocaleRoutes {
  sr: Route
  en: Route
}

export type SeoLocale = 'sr' | 'en'
export type LocaleAvailability = Partial<Record<SeoLocale, boolean>>

function isLocaleRoutes(route: Route | LocaleRoutes): route is LocaleRoutes {
  return typeof route === 'object' && 'sr' in route
}

/* og:locale wants the underscored territory form. Kept in step with the root
   layout, which sets the same defaults for pages that declare no openGraph. */
const OG_LOCALES: Record<string, string> = { sr: 'sr_RS', en: 'en_US' }

export interface OpenGraphOptions {
  locale: string
  /** Same shape as `localeAlternates` — a route, or a per-language pair. */
  path: Route | LocaleRoutes
  title: string
  description?: string | undefined
  type?: 'website' | 'article'
  /** Overrides the generated card. Blog posts pass their cover. */
  image?: string | undefined
  publishedTime?: string | undefined
  modifiedTime?: string | undefined
  /** Resolved canonical URL for consolidated or syndicated content. */
  canonical?: string | undefined
}

/**
 * Open Graph for one page.
 *
 * Next does not deep-merge `openGraph`: a route that declares its own replaces
 * the parent's outright, including `siteName`, `locale` and — least obviously —
 * the `opengraph-image` file convention. Three routes declared a bare
 * `{ title, description, url }` and so shipped share cards with no image and no
 * site name at all. Building the object here keeps those defaults attached.
 */
export function openGraphMeta({
  locale,
  path,
  title,
  description,
  type = 'website',
  image,
  publishedTime,
  modifiedTime,
  canonical,
}: OpenGraphOptions): Metadata['openGraph'] {
  const paths: LocaleRoutes = isLocaleRoutes(path) ? path : { sr: path, en: path }
  const self = locale === 'en' ? paths.en : paths.sr
  /* The generated card is a route file, not an entry in the pathnames map, so
     it hangs off the locale root rather than resolving through it: the English
     root is the bare origin and the Serbian one adds `/sr`. `absoluteUrl`
     already leaves no trailing slash to trim. */
  const localeRoot = absoluteUrl(locale, '/')
  const generatedCard = `${localeRoot}/opengraph-image`

  return {
    type,
    siteName: 'SignageWall',
    locale: OG_LOCALES[locale] ?? OG_LOCALES.en,
    alternateLocale: locale === 'en' ? OG_LOCALES.sr : OG_LOCALES.en,
    url: resolveCanonicalUrl(canonical) ?? absoluteUrl(locale, self),
    title,
    ...(description ? { description } : {}),
    // Falls back to the generated locale card rather than to nothing.
    images: [absoluteAssetUrl(image ?? generatedCard)],
    ...(type === 'article' && publishedTime ? { publishedTime } : {}),
    ...(type === 'article' && modifiedTime ? { modifiedTime } : {}),
  }
}

/**
 * Turns a media/file path into an absolute public URL.
 *
 * Next's `metadataBase` resolves relative values inside the Metadata API, but
 * it cannot reach strings embedded in JSON-LD. Keeping this helper public lets
 * both metadata and structured data use the exact same origin handling.
 */
export function absoluteAssetUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value
  return `${SITE_URL}/${value.replace(/^\/+/, '')}`
}

/**
 * Accepts only an absolute HTTP(S) canonical.
 *
 * Payload validates the field on write, but this remains a defensive boundary
 * for legacy records and keeps metadata and JSON-LD resolution identical.
 */
export function resolveCanonicalUrl(value: string | undefined): string | undefined {
  const candidate = value?.trim()
  if (!candidate) return undefined

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined
    // Canonical link targets are document URLs; fragments are not part of the
    // resource identity and would also break JSON-LD fragment IDs.
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return undefined
  }
}

/**
 * Canonical + hreflang for one page, in both locales.
 *
 * Every route must call this. Metadata inherits down the tree, so a page that
 * omits `alternates` silently keeps the layout's — which used to point every
 * inner page's hreflang at the home page, an annotation Google reads as wrong
 * and discards.
 *
 * `path` is the internal route: a bare pathname when both languages share the
 * slug (`/features`), or a per-language pair when they do not (a blog post).
 * Pass nothing for the home page.
 */
/**
 * RSS autodiscovery for the current language.
 *
 * The feeds existed but nothing pointed at them: a reader's browser extension
 * and an aggregator both look for this tag, and neither reads a sitemap. It
 * hangs off `localeAlternates` rather than the blog routes because that is the
 * one function every route already calls — the same reason hreflang lives here.
 */
function feedAlternates(locale: SeoLocale) {
  return {
    'application/rss+xml': [
      { url: `${absoluteUrl(locale, '/blog')}/feed.xml`, title: 'SignageWall Blog' },
    ],
  }
}

export function localeAlternates(
  locale: string,
  path: Route | LocaleRoutes = '/',
  availability: LocaleAvailability = { en: true, sr: true },
): Metadata['alternates'] {
  const paths: LocaleRoutes = isLocaleRoutes(path) ? path : { sr: path, en: path }
  const currentLocale: SeoLocale = locale === 'sr' ? 'sr' : 'en'
  const self = currentLocale === 'en' ? paths.en : paths.sr
  const languages: Record<string, string> = {}

  if (availability.en !== false) languages.en = absoluteUrl('en', paths.en)
  if (availability.sr !== false) languages.sr = absoluteUrl('sr', paths.sr)

  // English is the default locale. If that translation is not ready, point
  // unmatched visitors at Serbian rather than advertising a missing URL.
  if (availability.en !== false) {
    languages['x-default'] = absoluteUrl('en', paths.en)
  } else if (availability.sr !== false) {
    languages['x-default'] = absoluteUrl('sr', paths.sr)
  }

  return {
    canonical: absoluteUrl(currentLocale, self),
    languages,
    types: feedAlternates(currentLocale),
  }
}

export interface PageMetadataOptions extends OpenGraphOptions {
  /** A page may stay usable while editorial work is unfinished. */
  indexable?: boolean
  /** Hreflang must not advertise an untranslated/fallback page. */
  availability?: LocaleAvailability
  /** Rare escape hatch for syndicated/consolidated content. Self is the default. */
  canonical?: string | undefined
  /** Social copy can be more descriptive than the search-result title. */
  ogTitle?: string | undefined
  ogDescription?: string | undefined
  /**
   * Replaces the `<title>` outright, bypassing the layout's `%s | SignageWall`
   * template. Only the home page needs it: the template does not apply within
   * the segment that declares it, so a plain string there ships the one title
   * on the site with no brand in it. `title` still feeds Open Graph and
   * Twitter, which want the unbranded form.
   */
  absoluteTitle?: string | undefined
}

/**
 * Complete metadata for an indexable page.
 *
 * Open Graph and Twitter deliberately come from one input. Previously a child
 * route could replace Open Graph while silently inheriting the site's generic
 * Twitter title and description from the locale layout.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  type = 'website',
  image,
  publishedTime,
  modifiedTime,
  indexable = true,
  availability,
  canonical,
  ogTitle,
  ogDescription,
  absoluteTitle,
}: PageMetadataOptions): Metadata {
  const alternates = localeAlternates(locale, path, availability)
  const canonicalUrl = resolveCanonicalUrl(canonical)
  const localeRoot = absoluteUrl(locale, '/')
  const resolvedImage = image
    ? absoluteAssetUrl(image)
    : absoluteAssetUrl(`${localeRoot}/opengraph-image`)
  const socialDescription = ogDescription ?? description

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    ...(description ? { description } : {}),
    // A consolidated URL must not advertise local hreflang siblings unless
    // the canonical target supplies a reciprocal cluster of its own. The CMS
    // cannot verify that external contract, so canonical override is fail-safe:
    // one canonical and no alternate-language claims.
    alternates: canonicalUrl
      ? { canonical: canonicalUrl, types: feedAlternates(locale === 'sr' ? 'sr' : 'en') }
      : alternates,
    robots: {
      index: indexable,
      // Links from an editorially unfinished page still help discovery of the
      // finished pages it references.
      follow: true,
    },
    openGraph: openGraphMeta({
      locale,
      path,
      title: ogTitle ?? title,
      description: ogDescription ?? description,
      type,
      image: resolvedImage,
      publishedTime,
      modifiedTime,
      canonical: canonicalUrl,
    }),
    twitter: {
      card: 'summary_large_image',
      // Attribution on the card itself: without a handle a shared link is
      // credited to whoever posted it, and the account that publishes the page
      // goes unnamed to everyone who sees it in their timeline.
      site: X_HANDLE,
      creator: X_HANDLE,
      title: ogTitle ?? title,
      ...(socialDescription ? { description: socialDescription } : {}),
      images: [resolvedImage],
    },
  }
}
