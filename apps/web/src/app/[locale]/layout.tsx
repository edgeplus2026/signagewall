import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import { ConsentAnalytics } from '@/components/consent/consent-analytics'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { OrganizationJsonLd } from '@/components/seo/json-ld'
import { ThemeProvider } from '@/components/theme-provider'
import { Frame, Hatch } from '@/components/ui/block'
import { routing } from '@/i18n/routing'

import '../globals.css'

/* latin-ext carries the Serbian diacritics (č ć š ž đ) — without it the
   headings silently fall back mid-word. */
const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-manrope',
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002'

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
    metadataBase: new URL(siteUrl),
    title: {
      default: t('title'),
      template: '%s — EdgeRize',
    },
    description: t('description'),
    icons: { icon: '/favicon.svg' },
    alternates: {
      languages: {
        sr: '/',
        en: '/en',
      },
    },
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
      className={`${GeistSans.variable} ${manrope.variable}`}
    >
      {/* The page gutter sits outside the frame so the rails read as a drawn
          boundary rather than as the edge of the window. */}
      <body className="flex min-h-dvh flex-col px-3 md:px-6">
        <OrganizationJsonLd />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            {/* Hatch bands top and tail the stack as well as separating it, so
                the header and footer float off the viewport edges instead of
                butting against them. Seams *inside* main come from SectionStack. */}
            <Frame className="flex flex-1 flex-col">
              {/* Band and header stick as one unit, which keeps the gap above
                  the header through scrolling without either having to know the
                  other's height. Kept thin — it is a registration strip, not a
                  margin. */}
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
            <ConsentAnalytics />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
