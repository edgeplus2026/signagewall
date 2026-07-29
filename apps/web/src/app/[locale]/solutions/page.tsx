import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { BreadcrumbJsonLd } from '@/components/seo/json-ld'
import { SolutionIcon } from '@/components/solutions/solution-icon'
import { Card } from '@/components/ui/card'
import { Section, SectionStack } from '@/components/ui/section'
import { Subtitle } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { localeAlternates } from '@/lib/seo'
import { listSolutions } from '@/lib/solutions'

/* ISR rather than `force-dynamic`. The content behind this page changes when
   an editor publishes, not per request, so re-rendering on every hit spent a
   database round trip to produce the same HTML. An hour is well inside how
   often this copy actually moves. */
export const revalidate = 3600

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'solutions.meta' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: localeAlternates(locale, '/solutions'),
  }
}

export default async function SolutionsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('solutions')
  const tc = await getTranslations('common')
  const solutions = await listSolutions(locale)

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        items={[{ name: 'SignageWall', path: '/' }, { name: t('hero.title') }]}
      />
      <SectionStack>
        <PageHero
          eyebrow={t('hero.eyebrow')}
          title={t('hero.title')}
          subtitle={t('hero.subtitle')}
        />

        <Section>
          <SectionHeader title={t('overview.title')} />
          <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {solutions.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 3) * 70}>
                <Link
                  href={{ pathname: '/solutions/[industry]', params: { industry: s.slug } }}
                  className="block h-full"
                >
                  <Card className="group flex h-full flex-col p-0 transition-colors hover:border-accent">
                    {/* The coral band is the card's only mass — it names the
                          industry and carries the icon, so the body below can
                          stay pure text and actually be read. */}
                    <span className="flex items-center gap-4 border-b border-secondary bg-accent-soft px-6 py-5 transition-colors group-hover:bg-accent group-hover:text-accent-contrast">
                      <span className="flex size-11 shrink-0 items-center justify-center bg-accent text-accent-contrast transition-colors group-hover:bg-accent-contrast group-hover:text-accent">
                        <SolutionIcon icon={s.icon} className="size-5" />
                      </span>
                      <Subtitle>{s.name}</Subtitle>
                    </span>
                    <span className="flex flex-1 flex-col px-6 pt-5 pb-6">
                      <span className="text-sm text-pretty text-secondary">{s.tagline}</span>
                      <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium transition-colors group-hover:text-accent">
                        {tc('learnMore')}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </Card>
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>

        <CtaBand />
      </SectionStack>
    </>
  )
}
