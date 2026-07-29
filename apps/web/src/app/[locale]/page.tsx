import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppsShowcase } from '@/components/marketing/apps-showcase'
import { CtaBand } from '@/components/marketing/cta-band'
import { Features } from '@/components/marketing/features'
import { Hero } from '@/components/marketing/hero'
import { HomeFaq } from '@/components/marketing/home-faq'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { Platform } from '@/components/marketing/platform'
import { PricingPreview } from '@/components/marketing/pricing-preview'
import { TrustStrip } from '@/components/marketing/trust-strip'
import { UseCases } from '@/components/marketing/use-cases'
import { WhatIsSignage } from '@/components/marketing/what-is-signage'
import { WhySignageWall } from '@/components/marketing/why-signagewall'
import { SectionStack } from '@/components/ui/section'
import { localeAlternates, openGraphMeta } from '@/lib/seo'

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

  return {
    /* `absolute` because the layout's "%s | SignageWall" template does not apply
       within the same route segment — a plain string here would ship the one
       title on the site with no brand on it. Spelt out rather than relying on
       a template that silently does nothing at this level. */
    title: { absolute: `${title} | SignageWall` },
    description,
    alternates: localeAlternates(locale),
    openGraph: openGraphMeta({ locale, path: '/', title, description }),
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  /* The old order ran Hero → Stats → Features → UseCases → HowItWorks → Apps →
     Platform → CTA: four consecutive sections all listing capabilities, no
     explanation for anyone who does not know the term, no differentiation and
     no price. The shape now is: hook, orient, prove, show, differentiate,
     price, answer. */
  return (
    <SectionStack>
      <Hero />
      <TrustStrip locale={locale} />
      <WhatIsSignage />
      <Features />
      <UseCases />
      <HowItWorks />
      <AppsShowcase />
      <Platform />
      <WhySignageWall locale={locale} />
      <PricingPreview locale={locale} />
      <HomeFaq locale={locale} />
      <CtaBand />
    </SectionStack>
  )
}
