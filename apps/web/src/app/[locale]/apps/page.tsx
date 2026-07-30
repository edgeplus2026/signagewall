import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppsBrowser } from '@/components/apps/apps-browser'
import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { CollectionPageJsonLd } from '@/components/seo/json-ld'
import { Section, SectionStack } from '@/components/ui/section'
import { catalogApps, listAppCatalog, orderedCategories } from '@/lib/apps'
import { pageMetadata } from '@/lib/seo'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'apps.meta' })
  return pageMetadata({
    locale,
    path: '/apps',
    title: t('title', { count: catalogApps.length }),
    description: t('description', { count: catalogApps.length }),
  })
}

export default async function AppsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('apps')
  const tCat = await getTranslations('catalog')
  const tCatNames = await getTranslations('categories')
  const catalog = await listAppCatalog(locale)
  const discoverableApps = catalog.filter((app) => app.indexable && !app.canonical)

  // Grouped server-side: the taxonomy is static, so the client never has to
  // rebuild it. An app in two categories appears under both, by design.
  const groups = orderedCategories()
    .map((c) => ({
      slug: c.slug,
      name: tCatNames(c.slug),
      apps: catalog
        .filter((app) => app.categories.includes(c.slug))
        .map((app) => ({
          slug: app.slug,
          name: app.name,
          tagline:
            app.source === 'editorial' && app.localeReady
              ? app.tagline
              : tCat(`${app.appKey}.tagline`),
          icon: app.manifest.icon ?? '',
        })),
    }))
    .filter((g) => g.apps.length > 0)

  return (
    <>
      <CollectionPageJsonLd
        page={{
          locale,
          path: '/apps',
          name: t('hero.title', { count: catalog.length }),
          description: t('meta.description', { count: catalog.length }),
          itemListName: t('hero.eyebrow'),
          items: discoverableApps.map((app) => ({
            name: app.name,
            description:
              app.source === 'editorial' && app.localeReady
                ? app.summary
                : tCat(`${app.appKey}.tagline`),
            path: { pathname: '/apps/[slug]', params: { slug: app.slug } },
            type: 'SoftwareApplication',
          })),
        }}
      />
      <SectionStack>
        <PageHero
          eyebrow={t('hero.eyebrow')}
          title={t('hero.title', { count: catalog.length })}
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
    </>
  )
}
