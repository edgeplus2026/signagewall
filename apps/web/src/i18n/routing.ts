import { defineRouting } from 'next-intl/routing'

/**
 * Serbian pages live on Serbian URLs.
 *
 * The keys are the internal pathname — what `Link href` and `getPathname` are
 * written against, and what the folder under `app/[locale]` is called. The
 * values are what a visitor actually sees. Without this map the whole Serbian
 * site sat on English paths (`/features`, `/solutions`, `/about`), which reads
 * as a translated afterthought and wastes the keyword in the slug.
 *
 * `/blog` keeps its spelling: it is the word Serbian uses.
 *
 * Adding a route means adding it here too — an unmapped path still resolves, so
 * the omission surfaces only as an English URL on the Serbian site.
 */
const pathnames = {
  '/': '/',
  '/how-it-works': { sr: '/kako-radi', en: '/how-it-works' },
  '/features': { sr: '/mogucnosti', en: '/features' },
  '/pricing': { sr: '/cene', en: '/pricing' },
  '/what-is-digital-signage': {
    sr: '/sta-je-digital-signage',
    en: '/what-is-digital-signage',
  },
  '/free-digital-signage-software': {
    sr: '/besplatan-digital-signage',
    en: '/free-digital-signage-software',
  },
  '/apps': { sr: '/aplikacije', en: '/apps' },
  '/apps/[slug]': { sr: '/aplikacije/[slug]', en: '/apps/[slug]' },
  '/solutions': { sr: '/resenja', en: '/solutions' },
  '/solutions/[industry]': { sr: '/resenja/[industry]', en: '/solutions/[industry]' },
  '/blog': '/blog',
  '/blog/[slug]': '/blog/[slug]',
  '/about': { sr: '/o-nama', en: '/about' },
  '/hardware': { sr: '/hardver', en: '/hardware' },
  '/download': { sr: '/preuzimanje', en: '/download' },
  '/contact': { sr: '/kontakt', en: '/contact' },
  '/privacy': { sr: '/politika-privatnosti', en: '/privacy' },
  '/terms': { sr: '/uslovi-koriscenja', en: '/terms' },
  '/cookies': { sr: '/kolacici', en: '/cookies' },
  '/data-deletion': { sr: '/brisanje-podataka', en: '/data-deletion' },
} as const

export const routing = defineRouting({
  locales: ['en', 'sr'],
  /* The primary market is the US and Europe, so English is the default and
     sits at the root; Serbian is the secondary market under `/sr`. The
     `pathnames` map below is unaffected — it names the localised segment for
     each language, and which of them carries a prefix is decided here. */
  defaultLocale: 'en',
  // `/` = English (no prefix), `/sr` = Serbian.
  localePrefix: 'as-needed',
  /* Never bounce a visitor to another language off their browser header.
     With detection on, `Accept-Language: en-US` made `/` 307 to `/en` — and an
     English-language browser is common enough in Serbia that people typing the
     domain can otherwise be redirected somewhere they did not choose. Google
     also advises against redirecting by language, since it can stop a crawler
     seeing every version. `/` remains English because it is the configured
     default; the switcher is how a visitor chooses Serbian. */
  localeDetection: false,
  /* No `Link: rel="alternate"` header from the middleware.

     next-intl builds that header by swapping the locale prefix on the *current*
     pathname. For the static routes in `pathnames` it lands correctly; for every
     route whose slug is localised it cannot, because it has never seen the other
     language's slug. On `/blog/digital-signage-cost` it announced the Serbian
     version as `/sr/blog/digital-signage-cost` — a URL with no post behind it —
     while the HTML `<link rel="alternate">` on the very same response correctly
     named `/sr/blog/koliko-kosta-digital-signage`. Half the site shipped two
     hreflang annotations that disagreed, and Google, which reads both, resolves
     that by discarding the cluster.

     Nothing is lost by turning it off: every page already emits a complete and
     reciprocal hreflang set in the document head through `localeAlternates`,
     built from the real per-locale slugs. */
  alternateLinks: false,
  pathnames,
})

export type Locale = (typeof routing.locales)[number]
export type AppPathname = keyof typeof pathnames
