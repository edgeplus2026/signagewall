import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppsBrowser } from '@/components/apps/apps-browser'
import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { Section, SectionStack } from '@/components/ui/section'
import { catalogApps, categoriesForApp, orderedCategories } from '@/lib/apps'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'apps.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function AppsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('apps')
  const tCat = await getTranslations('catalog')
  const tCatNames = await getTranslations('categories')

  const apps = catalogApps.map((m) => ({
    slug: m.slug,
    name: m.name,
    tagline: tCat(`${m.slug}.tagline`),
    icon: m.icon ?? '',
    categories: categoriesForApp(m.slug),
  }))
  const categories = orderedCategories().map((c) => ({ slug: c.slug, name: tCatNames(c.slug) }))

  return (
    <SectionStack>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <Section>
        <AppsBrowser
          apps={apps}
          categories={categories}
          labels={{
            placeholder: t('browser.placeholder'),
            all: t('browser.all'),
            empty: t('browser.empty'),
          }}
        />
      </Section>

      <CtaBand />
    </SectionStack>
  )
}
