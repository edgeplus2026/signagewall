import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppsBrowser } from '@/components/apps/apps-browser'
import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { Section, SectionStack } from '@/components/ui/section'
import { catalogApps, categoriesForApp, orderedCategories } from '@/lib/apps'
import { localeAlternates } from '@/lib/seo'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'apps.meta' })
  return {
    title: t('title', { count: catalogApps.length }),
    description: t('description', { count: catalogApps.length }),
    alternates: localeAlternates(locale, '/apps'),
  }
}

export default async function AppsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('apps')
  const tCat = await getTranslations('catalog')
  const tCatNames = await getTranslations('categories')

  // Grouped server-side: the taxonomy is static, so the client never has to
  // rebuild it. An app in two categories appears under both, by design.
  const groups = orderedCategories()
    .map((c) => ({
      slug: c.slug,
      name: tCatNames(c.slug),
      apps: catalogApps
        .filter((m) => categoriesForApp(m.slug).includes(c.slug))
        .map((m) => ({
          slug: m.slug,
          name: m.name,
          tagline: tCat(`${m.slug}.tagline`),
          icon: m.icon ?? '',
        })),
    }))
    .filter((g) => g.apps.length > 0)

  return (
    <SectionStack>
      <PageHero
        eyebrow={t('hero.eyebrow')}
        title={t('hero.title', { count: catalogApps.length })}
        subtitle={t('hero.subtitle')}
      />

      <Section>
        <AppsBrowser
          groups={groups}
          labels={{
            placeholder: t('browser.placeholder'),
            all: t('browser.all'),
            empty: t('browser.empty'),
            results: t('browser.results'),
          }}
        />
      </Section>

      <CtaBand />
    </SectionStack>
  )
}
