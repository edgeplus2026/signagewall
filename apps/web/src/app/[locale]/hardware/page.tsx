import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { copyLinks } from '@/components/content/copy-links'
import { PageHero } from '@/components/marketing/page-hero'
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo/json-ld'
import { buttonVariants } from '@/components/ui/button'
import { Faq } from '@/components/ui/faq'
import { Section, SectionStack } from '@/components/ui/section'
import { Lead, Subtitle, Title } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { REGISTER_URL } from '@/lib/app-url'
import { formattedPrice, TRIAL_DAYS } from '@/lib/pricing'
import { pageMetadata } from '@/lib/seo'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ locale: string }>
}

interface HardwareSection {
  title: string
  body: string
  /** [situation, what to buy, rough price] — empty for prose-only sections. */
  rows: string[][]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'hardware.meta' })
  const title = t('title')
  const description = t('description')
  return pageMetadata({ locale, path: '/hardware', type: 'article', title, description })
}

/**
 * The buying guide for the two things we do not sell.
 *
 * "Digital signage player" is a real search term with real intent and no good
 * answer on any vendor's site, because every vendor answering it is also
 * selling the hardware. Not selling it is the only reason this page can be
 * useful — and saying so plainly is what makes it credible.
 */
export default async function HardwarePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('hardware')
  const values = { price: formattedPrice(locale), trialDays: TRIAL_DAYS }

  const sections = t.raw('sections') as HardwareSection[]
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
          <Lead>{t.rich('intro', copyLinks)}</Lead>
          <div className="mt-14 flex flex-col gap-14">
            {sections.map((s) => (
              <article key={s.title}>
                <Subtitle className="text-xl md:text-2xl">{s.title}</Subtitle>
                <p className="mt-4 text-pretty text-secondary">{s.body}</p>
                {s.rows.length > 0 && (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-md border-collapse text-sm">
                      <tbody>
                        {s.rows.map((row) => (
                          <tr key={row[0]} className="border-b border-secondary align-top">
                            <th scope="row" className="py-3 pr-6 text-left font-normal">
                              {row[0]}
                            </th>
                            <td className="py-3 pr-6 font-medium">{row[1]}</td>
                            <td className="py-3 text-right text-secondary tabular-nums">
                              {row[2]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))}
          </div>
        </Section>

        <Section tone="panel" innerClassName="max-w-3xl">
          <Title className="text-2xl md:text-3xl">{t('faq.title')}</Title>
          <div className="mt-10">
            <Faq items={faq} />
          </div>
        </Section>

        <Section innerClassName="max-w-3xl">
          <Title className="text-2xl md:text-3xl">{t('cta.title', values)}</Title>
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
