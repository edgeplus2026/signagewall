import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import { AttributionAnalytics } from '@/components/analytics/attribution-analytics'
import { ConsentAnalytics } from '@/components/consent/consent-analytics'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { OrganizationJsonLd } from '@/components/seo/json-ld'
import { ThemeInit, ThemeProvider } from '@/components/theme-provider'
import { Frame, Hatch } from '@/components/ui/block'
import { routing } from '@/i18n/routing'
import { SITE_URL } from '@/lib/site-url'

import '../globals.css'

/* latin-ext carries the Serbian diacritics (č ć š ž đ) — without it the
   headings silently fall back mid-word. */
const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-manrope',
  display: 'swap',
})

/* Wordmark only — the brand guide names Inter, Regular + Medium, so just the
   two weights the lockup actually uses.
 *
 * `latin` alone: this font renders exactly one word, "SignageWall", in the header
 * and footer. It has no Serbian diacritics in it, so the latin-ext range it
 * used to load was weight spent on characters that can never appear. (Next 16
 * does not accept `text` here, which would subset it further still.) */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
  display: 'swap',
})

/* og:locale wants the underscored territory form, not the bare language tag we
   use for `lang` and hreflang. en_US: the primary market is the United States
   and the copy is written in American spelling to match. */
const OG_LOCALES: Record<string, string> = { sr: 'sr_RS', en: 'en_US' }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('title'),
      template: '%s | SignageWall',
    },
    description: t('description'),
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico', sizes: '48x48' },
      ],
      /* `rel="icon"` is what browsers read, but several auditing tools and older
         crawlers still look only for the legacy `shortcut icon`. Declaring both
         costs one tag and stops the site being reported as having no favicon. */
      shortcut: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
    /* Defaults every page inherits and may override. The og:image itself is
       supplied by `opengraph-image.tsx` in this segment, which Next wires up
       automatically — declaring `images` here would shadow it. */
    openGraph: {
      type: 'website',
      siteName: 'SignageWall',
      locale: OG_LOCALES[locale] ?? OG_LOCALES.en,
      alternateLocale: locale === 'en' ? OG_LOCALES.sr : OG_LOCALES.en,
      title: t('title'),
      description: t('description'),
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
    /* Search Console and Bing Webmaster Tools each prove ownership by finding
       their exact tag on the site. Kept in source rather than an env var
       because these are public constants tied to this domain, and routing them
       through the host would only add a way for the verification to disappear
       silently on a redeploy.

       Bing asks for the tag on the home page; declaring it in the layout puts
       it on every page instead, which verifies the same and keeps working if
       the check ever moves. `other` is how Next emits a verification tag it has
       no named field for — `msvalidate.01` is Bing's. */
    verification: {
      google: 'Ics0AooSvLIHv2tpJyDgxxwHX2vLJZf95JXCu39L-UU',
      other: {
        'msvalidate.01': 'B8B8E27781C0E62DA1D51094005300B9',
      },
    },
    /* No `alternates` here on purpose. Metadata inherits, so a layout-level
       hreflang becomes every page's hreflang unless that page overrides it —
       which pointed the whole site at the home page. Each route now sets its
       own via `localeAlternates`. */
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  setRequestLocale(locale)

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${GeistSans.variable} ${manrope.variable} ${inter.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        {/* Injects the pre-paint theme script into <head> during SSR only, so
            it never re-renders as a client-side <script> on navigation. */}
        <ThemeInit />
        {/* Sections fade in on scroll via JavaScript. With JS off that never
            happens, so unhide everything rather than serve blank plates. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <OrganizationJsonLd />
        <ThemeProvider>
          <NextIntlClientProvider>
            {/* The page gutter lives here rather than on <body>, because Radix's
                scroll lock writes its own padding onto <body> when a dropdown or
                the mobile menu opens — the two would fight and the frame would
                jump. */}
            <div className="flex flex-1 flex-col px-3 md:px-6">
              {/* Hatch bands top and tail the stack as well as separating it, so
                  the header and footer float off the viewport edges instead of
                  butting against them. Seams *inside* main come from SectionStack. */}
              <Frame className="flex flex-1 flex-col">
                {/* Band and header stick as one unit, which keeps the gap above
                    the header through scrolling without either having to know
                    the other's height. Kept thin — it is a registration strip,
                    not a margin. */}
                <div className="sticky top-0 z-40">
                  <Hatch size="thin" />
                  <Header />
                </div>
                <Hatch />
                <main className="flex flex-1 flex-col">{children}</main>
                <Hatch />
                <Footer />
                <Hatch />
              </Frame>
            </div>
            <ConsentAnalytics />
            <AttributionAnalytics />
          </NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
