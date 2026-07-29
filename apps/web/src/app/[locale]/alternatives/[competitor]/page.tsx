import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo/json-ld'
import { buttonVariants } from '@/components/ui/button'
import { Faq } from '@/components/ui/faq'
import { Prose } from '@/components/ui/prose'
import { Section, SectionStack } from '@/components/ui/section'
import { Subtitle, Title } from '@/components/ui/typography'
import type { ComparisonRow } from '@/content/alternatives'
import { COMPETITOR_KEYS, competitorBySlug } from '@/content/alternatives'
import { Link } from '@/i18n/navigation'
import { REGISTER_URL } from '@/lib/app-url'
import { catalogApps } from '@/lib/apps'
import { formattedPrice, TRIAL_DAYS } from '@/lib/pricing'
import { localeAlternates, openGraphMeta } from '@/lib/seo'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ locale: string; competitor: string }>
}

export function generateStaticParams() {
  return COMPETITOR_KEYS.map((competitor) => ({ competitor }))
}

/** Shared ICU values — price and app count never appear literally in the copy. */
function values(locale: string, name: string, verifiedOn: string) {
  return {
    price: formattedPrice(locale),
    trialDays: TRIAL_DAYS,
    appCount: catalogApps.length,
    competitor: name,
    verifiedOn,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, competitor } = await params
  const rival = competitorBySlug(competitor)
  if (!rival) return {}

  const t = await getTranslations({ locale, namespace: 'alternatives' })
  const v = values(locale, rival.name, rival.verifiedOn)
  const title = t('meta.title', v)
  const description = t('meta.description', v)
  const path = { pathname: '/alternatives/[competitor]' as const, params: { competitor } }

  return {
    title,
    description,
    alternates: localeAlternates(locale, path),
    openGraph: openGraphMeta({ locale, path, title, description }),
  }
}

export default async function AlternativePage({ params }: PageProps) {
  const { locale, competitor } = await params
  setRequestLocale(locale)
  const rival = competitorBySlug(competitor)
  if (!rival) notFound()

  const t = await getTranslations('alternatives')
  const v = values(locale, rival.name, rival.verifiedOn)

  const rows = (t.raw(`${competitor}.rows`) as ComparisonRow[]).map((_, i) => ({
    label: t(`${competitor}.rows.${i.toString()}.label`, v),
    signagewall: t(`${competitor}.rows.${i.toString()}.signagewall`, v),
    competitor: t(`${competitor}.rows.${i.toString()}.competitor`, v),
  }))
  const fair = (t.raw(`${competitor}.fair`) as string[]).map((_, i) =>
    t(`${competitor}.fair.${i.toString()}`, v),
  )
  const pick = (t.raw(`${competitor}.pick`) as string[]).map((_, i) =>
    t(`${competitor}.pick.${i.toString()}`, v),
  )
  const faq = (t.raw(`${competitor}.faq`) as { q: string; a: string }[]).map((_, i) => ({
    q: t(`${competitor}.faq.${i.toString()}.q`, v),
    a: t(`${competitor}.faq.${i.toString()}.a`, v),
  }))

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { name: 'SignageWall', path: '/' },
          { name: t('hero.eyebrow') },
          { name: rival.name },
        ]}
      />
      <FaqJsonLd items={faq} />

      <SectionStack>
        <PageHero
          eyebrow={t('hero.eyebrow')}
          title={t(`${competitor}.title`, v)}
          subtitle={t(`${competitor}.subtitle`, v)}
        >
          <a href={REGISTER_URL} className={cn(buttonVariants({ size: 'lg' }))}>
            {t('hero.ctaPrimary', v)}
          </a>
          <Link href="/pricing" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            {t('hero.ctaSecondary')}
          </Link>
        </PageHero>

        <Section>
          <Title className="text-2xl md:text-3xl">{t('tableTitle')}</Title>
          {/* A real table, not a grid of divs: this is tabular data and a screen
              reader should be able to say which column a cell belongs to. */}
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-xl border-collapse text-sm">
              <thead>
                <tr className="border-b border-primary text-left">
                  <th scope="col" className="py-3 pr-6 font-heading font-semibold">
                    {t('col.feature')}
                  </th>
                  <th scope="col" className="py-3 pr-6 font-heading font-semibold text-accent">
                    {t('col.us')}
                  </th>
                  <th scope="col" className="py-3 font-heading font-semibold">
                    {t('col.them', v)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-secondary align-top">
                    <th scope="row" className="py-4 pr-6 text-left font-medium">
                      {row.label}
                    </th>
                    <td className="py-4 pr-6">{row.signagewall}</td>
                    <td className="py-4 text-secondary">{row.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Dated, with a link to their own page. A comparison a reader cannot
              check is a comparison a reader has no reason to trust. */}
          <p className="mt-6 text-xs text-secondary">
            {t('tableNote', v)}{' '}
            <a
              href={rival.sourceUrl}
              target="_blank"
              rel="noreferrer nofollow"
              className="underline underline-offset-4"
            >
              {t('sourceLab')}
            </a>
          </p>
        </Section>

        <Section tone="panel" innerClassName="max-w-3xl">
          <Title className="text-2xl md:text-3xl">{t('fairTitle', v)}</Title>
          <ul className="mt-8 grid gap-5">
            {fair.map((item) => (
              <li key={item} className="border-l-2 border-accent pl-5 text-pretty">
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section innerClassName="max-w-3xl">
          <Title className="text-2xl md:text-3xl">{t('pickTitle')}</Title>
          <div className="mt-8 grid gap-6">
            {pick.map((item, i) => (
              <Reveal key={item} delay={i * 70}>
                {/* `**bold**` marks the recommendation; nothing else in this
                    copy uses markdown, so a split is enough of a parser. */}
                <Prose className="max-w-none">
                  <p>
                    {item
                      .split('**')
                      .map((part, j) =>
                        j % 2 === 1 ? (
                          <strong key={part}>{part}</strong>
                        ) : (
                          <span key={part}>{part}</span>
                        ),
                      )}
                  </p>
                </Prose>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section tone="panel" innerClassName="max-w-3xl">
          <Subtitle className="text-2xl">{t('faqTitle')}</Subtitle>
          <div className="mt-8">
            <Faq items={faq} />
          </div>
        </Section>

        <CtaBand />
      </SectionStack>
    </>
  )
}
