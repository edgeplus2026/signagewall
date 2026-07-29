import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppCard } from '@/components/apps/app-card'
import { AppIcon } from '@/components/apps/app-icon'
import { CtaBand } from '@/components/marketing/cta-band'
import { BreadcrumbJsonLd, SoftwareAppJsonLd } from '@/components/seo/json-ld'
import { SolutionIcon } from '@/components/solutions/solution-icon'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Prose } from '@/components/ui/prose'
import { Section, SectionStack } from '@/components/ui/section'
import { Heading, Title } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { appManifestBySlug, catalogApps, categoriesForApp, relatedApps } from '@/lib/apps'
import { localeAlternates, openGraphMeta } from '@/lib/seo'
import { listSolutionsUsingApp } from '@/lib/solutions'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export function generateStaticParams() {
  return catalogApps.map((m) => ({ slug: m.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const manifest = appManifestBySlug.get(slug)
  if (!manifest) return {}
  const tCat = await getTranslations({ locale, namespace: 'catalog' })
  const path = { pathname: '/apps/[slug]' as const, params: { slug } }
  const description = tCat(`${slug}.tagline`)

  return {
    title: manifest.name,
    description,
    alternates: localeAlternates(locale, path),
    openGraph: openGraphMeta({ locale, path, title: manifest.name, description }),
  }
}

export default async function AppDetailPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const manifest = appManifestBySlug.get(slug)
  if (!manifest || categoriesForApp(slug).length === 0) notFound()

  const t = await getTranslations('apps')
  const tc = await getTranslations('common')
  const tCat = await getTranslations('catalog')
  const tCatNames = await getTranslations('categories')

  const cats = categoriesForApp(slug)
  const related = relatedApps(slug)
  const industries = await listSolutionsUsingApp(locale, slug)

  return (
    <>
      <SoftwareAppJsonLd
        app={{
          locale,
          path: { pathname: '/apps/[slug]', params: { slug } },
          name: manifest.name,
          description: tCat(`${slug}.tagline`),
          category: cats[0] ? tCatNames(cats[0]) : undefined,
        }}
      />
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { name: 'SignageWall', path: '/' },
          { name: t('hero.title'), path: '/apps' },
          { name: manifest.name },
        ]}
      />
      <SectionStack>
        <Section innerClassName="py-14 md:py-20">
          <Link
            href="/apps"
            className="group inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            {t('detail.back')}
          </Link>

          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            <span className="flex size-20 shrink-0 items-center justify-center bg-accent text-accent-contrast">
              <AppIcon svg={manifest.icon ?? ''} className="size-10" />
            </span>
            <div>
              <Heading className="md:text-5xl">{manifest.name}</Heading>
              <p className="mt-4 max-w-2xl text-lg text-secondary">{tCat(`${slug}.tagline`)}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {cats.map((c) => (
                  <Badge key={c}>{tCatNames(c)}</Badge>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className={cn(buttonVariants())}>
                  {tc('bookDemo')}
                </Link>
                <Link href="/apps" className={cn(buttonVariants({ variant: 'outline' }))}>
                  {tc('seeAllApps')}
                </Link>
              </div>
            </div>
          </div>
        </Section>

        <Section innerClassName="max-w-3xl">
          <Title className="text-2xl md:text-3xl">{t('detail.aboutTitle')}</Title>
          <Prose className="mt-5">
            <p>{tCat(`${slug}.about`)}</p>
          </Prose>
          <p className="mt-8 border-t border-secondary pt-6 text-sm text-secondary">
            {t(`detail.dataSource.${manifest.dataSource}`)}
          </p>
        </Section>

        {industries.length > 0 && (
          <Section>
            <Title className="text-2xl md:text-3xl">{t('detail.industriesTitle')}</Title>
            {/* The reciprocal of the industry pages' app links — without this
                an app page is where the crawl and the reader both stop. */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {industries.map((s2) => (
                <Link
                  key={s2.slug}
                  href={{ pathname: '/solutions/[industry]', params: { industry: s2.slug } }}
                  className="group flex items-start gap-4 border border-secondary bg-panel p-5 transition-colors hover:border-accent"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center border border-secondary transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-accent-contrast">
                    <SolutionIcon icon={s2.icon} className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-heading font-semibold tracking-tight">
                      {s2.name}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-secondary">
                      {s2.tagline}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {related.length > 0 && (
          <Section tone="panel">
            <Title className="text-2xl md:text-3xl">{t('detail.relatedTitle')}</Title>
            {/* Same card as the catalogue grid — two takes on one component is
              how they ended up looking like an afterthought. */}
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <AppCard
                  key={r.slug}
                  slug={r.slug}
                  name={r.name}
                  tagline={tCat(`${r.slug}.tagline`)}
                  icon={r.icon ?? ''}
                  className="bg-page"
                />
              ))}
            </div>
          </Section>
        )}

        <CtaBand />
      </SectionStack>
    </>
  )
}
