import type { Metadata } from 'next'

import { getPathname } from '@/i18n/navigation'
import type { AppPathname } from '@/i18n/routing'
import { SITE_URL } from '@/lib/site-url'

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
  return `${SITE_URL}${pathname}`
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
}: OpenGraphOptions): Metadata['openGraph'] {
  const paths: LocaleRoutes = isLocaleRoutes(path) ? path : { sr: path, en: path }
  const self = locale === 'en' ? paths.en : paths.sr
  /* The generated card is a route file, not an entry in the pathnames map, so
     it hangs off the locale root rather than resolving through it: the English
     root is `/` and the Serbian one `/sr`. */
  const localeRoot = absoluteUrl(locale, '/').replace(/\/$/, '')
  const generatedCard = `${localeRoot}/opengraph-image`

  return {
    type,
    siteName: 'SignageWall',
    locale: OG_LOCALES[locale] ?? OG_LOCALES.en,
    alternateLocale: locale === 'en' ? OG_LOCALES.sr : OG_LOCALES.en,
    url: absoluteUrl(locale, self),
    title,
    ...(description ? { description } : {}),
    // Falls back to the generated locale card rather than to nothing.
    images: [image ?? generatedCard],
    ...(type === 'article' && publishedTime ? { publishedTime } : {}),
    ...(type === 'article' && modifiedTime ? { modifiedTime } : {}),
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
export function localeAlternates(
  locale: string,
  path: Route | LocaleRoutes = '/',
): Metadata['alternates'] {
  const paths: LocaleRoutes = isLocaleRoutes(path) ? path : { sr: path, en: path }
  const self = locale === 'en' ? paths.en : paths.sr

  return {
    canonical: absoluteUrl(locale, self),
    languages: {
      en: absoluteUrl('en', paths.en),
      sr: absoluteUrl('sr', paths.sr),
      // English is the default locale, so it is where an unmatched language
      // lands. Must stay in step with the sitemap's x-default.
      'x-default': absoluteUrl('en', paths.en),
    },
  }
}
