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
  '/alternatives/[competitor]': {
    sr: '/alternative/[competitor]',
    en: '/alternatives/[competitor]',
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
     domain were landing on the English site. Google also advises against
     redirecting by language, since it stops a crawler seeing every version.
     `/` is Serbian for everyone; the switcher is how you change that. */
  localeDetection: false,
  pathnames,
})

export type Locale = (typeof routing.locales)[number]
export type AppPathname = keyof typeof pathnames
