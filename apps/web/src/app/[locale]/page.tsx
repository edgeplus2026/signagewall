import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppsShowcase } from '@/components/marketing/apps-showcase'
import { CtaBand } from '@/components/marketing/cta-band'
import { Features } from '@/components/marketing/features'
import { Hero } from '@/components/marketing/hero'
import { HomeFaq } from '@/components/marketing/home-faq'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { Platform } from '@/components/marketing/platform'
import { TrustStrip } from '@/components/marketing/trust-strip'
import { UseCases } from '@/components/marketing/use-cases'
import { WhatIsSignage } from '@/components/marketing/what-is-signage'
import { Plans } from '@/components/pricing/plans'
import { SoftwareProductJsonLd } from '@/components/seo/json-ld'
import { SectionStack } from '@/components/ui/section'
import { pageMetadata } from '@/lib/seo'

/* The home page used to inherit the site-wide title and description from the
   layout, which made it the one page with no copy written for its own result —
   and the site default has to describe the whole site, not the page that has
   to rank for "digital signage softver". */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home.meta' })
  const title = t('title')
  const description = t('description')

  return pageMetadata({
    locale,
    path: '/',
    title,
    description,
    /* The layout's "%s | SignageWall" template does not apply within the same
       route segment, so the brand is spelt out rather than left to a template
       that silently does nothing at this level. */
    absoluteTitle: `${title} | SignageWall`,
  })
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  /* The shape is: hook, orient, prove, show, answer. `whatIs` earns its slot by
     explaining the term for anyone who arrives not knowing it — without it the
     page is four consecutive capability lists.

     Differentiation and the price used to sit between Platform and the FAQ;
     both sections were cut deliberately. The price now lives only on /pricing,
     so the home page no longer states it — keep it that way on purpose, or put
     it back as a section rather than smuggling it into a nearby one. */
  return (
    <SectionStack>
      {/* The landing page is the one page whose subject is the product. */}
      <SoftwareProductJsonLd />
      <Hero />
      <TrustStrip locale={locale} />
      <WhatIsSignage />
      <Features />
      <UseCases />
      <HowItWorks />
      <AppsShowcase />
      <Platform />
      <Plans locale={locale} />
      <HomeFaq locale={locale} />
      <CtaBand />
    </SectionStack>
  )
}
