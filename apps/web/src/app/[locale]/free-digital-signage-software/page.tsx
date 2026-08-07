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
import { pageMetadata } from '@/lib/seo'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'freeSignage.meta' })
  const values = { price: formattedPrice(locale), trialDays: TRIAL_DAYS }
  return pageMetadata({
    locale,
    path: '/free-digital-signage-software',
    type: 'article',
    title: t('title'),
    description: t('description', values),
  })
}

/**
 * "free digital signage software" is one of the largest queries in the
 * category and we have no free tier — so this page earns the click by being
 * honest about it: where free tools genuinely win, where their cost hides,
 * and what the no-card trial actually includes. Written in the hardware
 * page's voice; the credibility IS the conversion strategy. Every claim
 * (trial length, no card, what survives trial expiry) traces to
 * `lib/pricing.ts` and the pricing FAQ copy.
 */
export default async function FreeSignagePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('freeSignage')
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
