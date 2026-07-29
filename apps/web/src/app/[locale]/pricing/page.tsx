import { Check } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { PricingCalculator } from '@/components/pricing/pricing-calculator'
import { BreadcrumbJsonLd, FaqJsonLd, PricingJsonLd } from '@/components/seo/json-ld'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Faq } from '@/components/ui/faq'
import { Section, SectionStack } from '@/components/ui/section'
import { Subtitle, Title } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { REGISTER_URL } from '@/lib/app-url'
import { catalogApps } from '@/lib/apps'
import { currencyForLocale, formattedPrice, pricePerScreen, TRIAL_DAYS } from '@/lib/pricing'
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

  const included = t.raw('plan.included') as string[]
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
          price: pricePerScreen(locale),
          currency: currencyForLocale(locale),
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
          <Link href="/contact" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            {t('hero.ctaSecondary')}
          </Link>
        </PageHero>

        <Section>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
            <Reveal>
              <Card className="flex h-full flex-col">
                <p className="font-heading text-sm font-semibold tracking-widest uppercase">
                  {t('plan.name')}
                </p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-heading text-6xl font-semibold tracking-tight tabular-nums">
                    {values.price}
                  </span>
                  <span className="text-secondary">{t('plan.unit')}</span>
                </p>
                <p className="mt-3 text-sm text-secondary">{t('plan.trial', values)}</p>
                <a
                  href={REGISTER_URL}
                  className={cn(buttonVariants({ size: 'lg' }), 'mt-8 w-full')}
                >
                  {t('plan.cta')}
                </a>
                <p className="mt-4 text-xs text-secondary">{t('hero.note')}</p>
              </Card>
            </Reveal>

            <Reveal delay={80}>
              <Subtitle className="text-xl">{t('plan.includedTitle')}</Subtitle>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {included.map((item, i) => (
                  <li key={item} className="flex gap-3 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                    <span>{t(`plan.included.${i.toString()}`, values)}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </Section>

        <Section tone="panel">
          <SectionHeader
            title={t('calculator.title')}
            subtitle={t('calculator.subtitle', values)}
          />
          <div className="mt-12">
            <PricingCalculator
              unitPrice={pricePerScreen(locale)}
              locale={locale}
              currency={currencyForLocale(locale)}
              labels={{
                screens: t('calculator.screensLabel'),
                monthly: t('calculator.monthly'),
                yearly: t('calculator.yearly'),
              }}
            />
          </div>
        </Section>

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
