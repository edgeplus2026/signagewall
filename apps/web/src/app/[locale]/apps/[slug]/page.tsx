import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppIcon } from '@/components/apps/app-icon'
import { CtaBand } from '@/components/marketing/cta-band'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Prose } from '@/components/ui/prose'
import { Section, SectionStack } from '@/components/ui/section'
import { Heading, Title } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { appManifestBySlug, catalogApps, categoriesForApp, relatedApps } from '@/lib/apps'
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
  return { title: manifest.name, description: tCat(`${slug}.tagline`) }
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

  return (
    <SectionStack>
      <Section innerClassName="py-14 md:py-20">
        <Link
          href="/apps"
          className="inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          {t('detail.back')}
        </Link>

        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <span className="flex size-16 shrink-0 items-center justify-center border border-secondary bg-panel text-primary">
            <AppIcon svg={manifest.icon ?? ''} className="size-8" />
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

      {related.length > 0 && (
        <Section tone="panel">
          <Title className="text-2xl md:text-3xl">{t('detail.relatedTitle')}</Title>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} href={`/apps/${r.slug}`} className="block h-full">
                <Card className="flex h-full items-start gap-4 bg-page p-6 transition-colors hover:border-primary">
                  <span className="flex size-11 shrink-0 items-center justify-center border border-secondary bg-panel text-primary">
                    <AppIcon svg={r.icon ?? ''} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{r.name}</span>
                    <span className="mt-1 block text-sm text-secondary">
                      {tCat(`${r.slug}.tagline`)}
                    </span>
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <CtaBand />
    </SectionStack>
  )
}
