import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHero } from '@/components/marketing/page-hero'
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo/json-ld'
import { buttonVariants } from '@/components/ui/button'
import { Faq } from '@/components/ui/faq'
import { Prose } from '@/components/ui/prose'
import { Section, SectionStack } from '@/components/ui/section'
import { Title } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { REGISTER_URL } from '@/lib/app-url'
import { formattedPrice, TRIAL_DAYS } from '@/lib/pricing'
import { localeAlternates, openGraphMeta } from '@/lib/seo'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'whatIsSignage.meta' })
  const title = t('title')
  const description = t('description')
  return {
    title,
    description,
    alternates: localeAlternates(locale, '/what-is-digital-signage'),
    openGraph: openGraphMeta({
      locale,
      path: '/what-is-digital-signage',
      type: 'article',
      title,
      description,
    }),
  }
}

/**
 * The pillar page for the broadest term we can realistically own.
 *
 * Not a product page. Someone searching "what is digital signage" is not ready
 * to buy, and a page that pitches at them loses them — so it answers the
 * question first, mentions the price once because that is the next thing they
 * ask, and puts the CTA at the bottom where it belongs.
 */
export default async function WhatIsSignagePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('whatIsSignage')
  const values = { price: formattedPrice(locale), trialDays: TRIAL_DAYS }

  const sections = (t.raw('sections') as { heading: string; body: string }[]).map((_, i) => ({
    heading: t(`sections.${i.toString()}.heading`, values),
    body: t(`sections.${i.toString()}.body`, values),
  }))
  const faq = (t.raw('faq.items') as { q: string; a: string }[]).map((_, i) => ({
    q: t(`faq.items.${i.toString()}.q`, values),
    a: t(`faq.items.${i.toString()}.a`, values),
  }))

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        items={[{ name: 'SignageWall', path: '/' }, { name: t('hero.title') }]}
      />
      <FaqJsonLd items={faq} />

      <SectionStack>
        <PageHero
          eyebrow={t('hero.eyebrow')}
          title={t('hero.title')}
          subtitle={t('hero.subtitle')}
        />

        <Section innerClassName="max-w-3xl">
          <Prose>
            {sections.map((s) => (
              <section key={s.heading}>
                <h2>{s.heading}</h2>
                <p>{s.body}</p>
              </section>
            ))}
          </Prose>
        </Section>

        <Section tone="panel" innerClassName="max-w-3xl">
          <Title className="text-2xl md:text-3xl">{t('faq.title')}</Title>
          <div className="mt-10">
            <Faq items={faq} />
          </div>
        </Section>

        <Section innerClassName="max-w-3xl">
          <Title className="text-2xl md:text-3xl">{t('cta.title')}</Title>
          <p className="mt-4 text-lg text-secondary">{t('cta.body', values)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={REGISTER_URL} className={cn(buttonVariants({ size: 'lg' }))}>
              {t('cta.primary')}
            </a>
            <Link
              href="/pricing"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
            >
              {t('cta.secondary')}
            </Link>
          </div>
        </Section>
      </SectionStack>
    </>
  )
}
