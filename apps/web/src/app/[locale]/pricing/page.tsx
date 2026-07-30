import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { Plans } from '@/components/pricing/plans'
import { GetInTouch } from '@/components/quote/get-in-touch'
import { BreadcrumbJsonLd, FaqJsonLd, PricingJsonLd } from '@/components/seo/json-ld'
import { buttonVariants } from '@/components/ui/button'
import { Faq } from '@/components/ui/faq'
import { Section, SectionStack } from '@/components/ui/section'
import { Title } from '@/components/ui/typography'
import { REGISTER_URL } from '@/lib/app-url'
import { catalogApps } from '@/lib/apps'
import { CURRENCY, formattedPrice, PRICE_PER_SCREEN, TRIAL_DAYS } from '@/lib/pricing'
import { localeAlternates, openGraphMeta } from '@/lib/seo'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ locale: string }>
}

/** Every number on this page comes from `lib/pricing`, never from the copy. */
function priceValues(locale: string) {
  return {
    price: formattedPrice(locale),
    trialDays: TRIAL_DAYS,
    appCount: catalogApps.length,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pricing.meta' })
  const values = priceValues(locale)
  const title = t('title', values)
  const description = t('description', values)

  return {
    title,
    description,
    alternates: localeAlternates(locale, '/pricing'),
    openGraph: openGraphMeta({ locale, path: '/pricing', title, description }),
  }
}

export default async function PricingPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('pricing')
  const values = priceValues(locale)

  const faq = (t.raw('faq.items') as { q: string; a: string }[]).map((_, i) => ({
    q: t(`faq.items.${i.toString()}.q`, values),
    a: t(`faq.items.${i.toString()}.a`, values),
  }))

  return (
    <>
      <PricingJsonLd
        offer={{
          locale,
          path: '/pricing',
          name: 'SignageWall',
          description: t('meta.description', values),
          price: PRICE_PER_SCREEN,
          currency: CURRENCY,
          trialDays: TRIAL_DAYS,
        }}
      />
      <BreadcrumbJsonLd
        locale={locale}
        items={[{ name: 'SignageWall', path: '/' }, { name: t('hero.title') }]}
      />
      {/* The same ten questions render below. */}
      <FaqJsonLd items={faq} />

      <SectionStack>
        <PageHero
          eyebrow={t('hero.eyebrow')}
          title={t('hero.title')}
          subtitle={t('hero.subtitle', values)}
        >
          {/* Self-serve first: the single-screen buyer is the one this page is
              written for, and a demo request is the wrong ask for them. */}
          <a href={REGISTER_URL} className={cn(buttonVariants({ size: 'lg' }))}>
            {t('hero.ctaPrimary', values)}
          </a>
          <GetInTouch label={t('hero.ctaSecondary')} variant="outline" size="lg" />
        </PageHero>

        {/* Both plans, from the one component the home page also renders. */}
        <Plans locale={locale} heading={false} />

        <Section tone="panel" innerClassName="max-w-3xl">
          <Title className="text-2xl md:text-3xl">{t('faq.title')}</Title>
          <div className="mt-10">
            <Faq items={faq} />
          </div>
        </Section>

        <CtaBand />
      </SectionStack>
    </>
  )
}
