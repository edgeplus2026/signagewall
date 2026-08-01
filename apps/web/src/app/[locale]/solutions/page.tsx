import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { BreadcrumbJsonLd, CollectionPageJsonLd } from '@/components/seo/json-ld'
import { SolutionIcon } from '@/components/solutions/solution-icon'
import { CatalogCard } from '@/components/ui/catalog-card'
import { Section, SectionStack } from '@/components/ui/section'
import { pageMetadata } from '@/lib/seo'
import { listSolutions } from '@/lib/solutions'

/* ISR rather than `force-dynamic`. The content behind this page changes when
   an editor publishes, not per request, so re-rendering on every hit spent a
   database round trip to produce the same HTML. Two days is deliberately far
   past how often this copy moves: the window costs one render per page rather
   than one per hour, which is what keeps this inside the hosting plan. A
   publish that needs to be live sooner is pushed with a redeploy instead of
   making every reader pay for the check. */
export const revalidate = 172_800

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'solutions.meta' })
  return pageMetadata({
    locale,
    path: '/solutions',
    title: t('title'),
    description: t('description'),
  })
}

export default async function SolutionsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('solutions')
  const solutions = await listSolutions(locale)

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        items={[{ name: 'SignageWall', path: '/' }, { name: t('hero.title') }]}
      />
      <CollectionPageJsonLd
        page={{
          locale,
          path: '/solutions',
          name: t('hero.title'),
          description: t('meta.description'),
          itemListName: t('overview.title'),
          items: solutions.map((solution) => ({
            name: solution.name,
            description: solution.tagline,
            path: {
              pathname: '/solutions/[industry]',
              params: { industry: solution.slug },
            },
            type: 'Service',
          })),
        }}
      />
      <SectionStack>
        <PageHero
          eyebrow={t('hero.eyebrow')}
          title={t('hero.title')}
          subtitle={t('hero.subtitle')}
        />

        <Section>
          <SectionHeader title={t('overview.title')} />
          {/* Same card as /apps — see CatalogCard. The industry grid used to
              lead with a filled coral band, which made this page read as a
              different site from the app catalogue. */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {solutions.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 3) * 70}>
                <CatalogCard
                  href={{ pathname: '/solutions/[industry]', params: { industry: s.slug } }}
                  icon={<SolutionIcon icon={s.icon} className="size-6" />}
                  name={s.name}
                  tagline={s.tagline}
                  className="h-full"
                />
              </Reveal>
            ))}
          </div>
        </Section>

        <CtaBand />
      </SectionStack>
    </>
  )
}
