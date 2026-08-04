import { RichText } from '@payloadcms/richtext-lexical/react'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppCard } from '@/components/apps/app-card'
import { AppIcon } from '@/components/apps/app-icon'
import { BlogCard } from '@/components/blog/blog-card'
import {
  ContentBreadcrumbs,
  ContentFaq,
  KeyTakeaways,
  RelatedContent,
  RequirementsPanel,
} from '@/components/content'
import { CtaBand } from '@/components/marketing/cta-band'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { GetInTouch } from '@/components/quote/get-in-touch'
import { BreadcrumbJsonLd, SoftwareAppJsonLd } from '@/components/seo/json-ld'
import { SolutionIcon } from '@/components/solutions/solution-icon'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { CatalogCard } from '@/components/ui/catalog-card'
import { Prose } from '@/components/ui/prose'
import { Section, SectionStack } from '@/components/ui/section'
import { StepNumber } from '@/components/ui/step-number'
import { Heading, Subtitle, Title } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import {
  catalogApps,
  getAppPage,
  listAppCatalog,
  listAppPageRefs,
  relatedApps as listManifestRelatedApps,
} from '@/lib/apps'
import { formattedPrice } from '@/lib/pricing'
import { executeContentRedirect, findContentRedirect } from '@/lib/redirects'
import { pageMetadata, publicPath } from '@/lib/seo'
import { listSolutionsUsingApp } from '@/lib/solutions'
import { cn } from '@/lib/utils'

/* No `searchParams` — this route is prerendered, and reading a dynamic API
   inside a prerender turns the redirects below into a 500. See the note on
   `executeContentRedirect`. */
interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const locale = params.locale === 'sr' ? 'sr' : 'en'
  const refs = await listAppPageRefs()
  const slugs = new Set(catalogApps.map((manifest) => manifest.slug))

  for (const ref of refs) {
    if (ref.availability[locale] === true) slugs.add(ref.slug[locale])
  }

  return [...slugs].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const app = await getAppPage(locale, slug)
  if (!app) return {}

  const tCat = await getTranslations({ locale, namespace: 'catalog' })
  const useEditorialCopy = app.source === 'editorial' && app.localeReady
  const tMeta = await getTranslations({ locale, namespace: 'apps.meta' })
  /* The fallback used to be the bare manifest name and the four-word tagline —
     a title with no keyword in it and a 25-character snippet. Editorial copy
     wins when an app has it; when it does not, the catalogue's own description
     plus what the app costs fills the result instead. */
  const fallbackTitle = tMeta('detailTitle', { name: app.manifest.name })
  const catalogDescription = tCat(`${app.appKey}.description`)
  const withPrice = tMeta('detailDescription', {
    description: catalogDescription,
    price: formattedPrice(locale),
  })
  const fallbackDescription = withPrice.length <= 160 ? withPrice : catalogDescription
  const description = useEditorialCopy ? app.metaDescription : fallbackDescription
  const paths = {
    sr: {
      pathname: '/apps/[slug]' as const,
      params: { slug: app.slugs.sr || app.appKey },
    },
    en: {
      pathname: '/apps/[slug]' as const,
      params: { slug: app.slugs.en || app.appKey },
    },
  }

  return pageMetadata({
    locale,
    path: paths,
    title: useEditorialCopy ? app.metaTitle : fallbackTitle,
    description,
    ogTitle: useEditorialCopy ? app.ogTitle : fallbackTitle,
    ogDescription: useEditorialCopy ? app.ogDescription : description,
    image: app.ogImage ?? app.screenshots[0]?.url,
    indexable: app.indexable,
    availability: app.availability,
    canonical: app.canonical,
  })
}

export default async function AppDetailPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const app = await getAppPage(locale, slug)
  if (!app) {
    const otherLocale = locale === 'en' ? 'sr' : 'en'
    const otherLocaleApp = await getAppPage(otherLocale, slug)
    const targetSlug = locale === 'sr' ? otherLocaleApp?.slugs.sr : otherLocaleApp?.slugs.en
    if (otherLocaleApp?.source === 'editorial' && targetSlug) {
      executeContentRedirect({
        toPath: publicPath(locale, {
          pathname: '/apps/[slug]',
          params: { slug: targetSlug },
        }),
        statusCode: 308,
        preserveQuery: false,
      })
    }
    const redirect = await findContentRedirect(
      publicPath(locale, { pathname: '/apps/[slug]', params: { slug } }),
    )
    if (redirect) executeContentRedirect(redirect)
    notFound()
  }
  if (app.categories.length === 0) notFound()
  if (app.shouldRedirect) {
    executeContentRedirect({
      toPath: publicPath(locale, {
        pathname: '/apps/[slug]',
        params: { slug: app.slug },
      }),
      statusCode: 308,
      preserveQuery: false,
    })
  }

  const t = await getTranslations('apps')
  const tc = await getTranslations('common')
  const tCat = await getTranslations('catalog')
  const tCatNames = await getTranslations('categories')
  const useEditorialCopy = app.source === 'editorial' && app.localeReady
  const tagline = useEditorialCopy ? app.summary : tCat(`${app.appKey}.tagline`)
  const description = useEditorialCopy ? app.metaDescription : tCat(`${app.appKey}.description`)
  const about = tCat(`${app.appKey}.about`)
  const features = useEditorialCopy ? app.features : []
  const useCases = useEditorialCopy ? app.useCases : []
  const setupSteps = useEditorialCopy ? app.setupSteps : []
  const benefits = useEditorialCopy ? app.benefits : []
  const screenshots = useEditorialCopy ? app.screenshots : []
  const faq = useEditorialCopy ? app.faq : []

  const linkedSolutions =
    useEditorialCopy && app.relatedSolutions.length > 0
      ? app.relatedSolutions
      : await listSolutionsUsingApp(locale, app.appKey)
  const editorialCatalog =
    useEditorialCopy && app.relatedApps.length > 0 ? [] : await listAppCatalog(locale)
  const appByKey = new Map(editorialCatalog.map((entry) => [entry.appKey, entry]))
  const linkedApps =
    useEditorialCopy && app.relatedApps.length > 0
      ? app.relatedApps
      : listManifestRelatedApps(app.appKey).flatMap((related) => {
          const editorial = appByKey.get(related.slug)
          if (!editorial?.indexable || editorial.canonical) return []
          return [
            {
              id: editorial.editorialId ?? related.slug,
              appKey: related.slug,
              slug: editorial.slug,
              name: editorial.name,
              summary: editorial.summary,
              icon: related.icon ?? '',
            },
          ]
        })

  const requirementItems = useEditorialCopy
    ? [
        { label: t('detail.requirements.account'), value: app.requirements.account },
        { label: t('detail.requirements.dataSource'), value: app.requirements.dataSource },
        { label: t('detail.requirements.network'), value: app.requirements.network },
        {
          label: t('detail.requirements.refreshBehavior'),
          value: app.requirements.refreshBehavior,
        },
        {
          label: t('detail.requirements.offlineBehavior'),
          value: app.requirements.offlineBehavior,
        },
        { label: t('detail.requirements.limitations'), value: app.requirements.limitations },
      ].filter((item): item is { label: string; value: string } => Boolean(item.value))
    : []

  return (
    <>
      {app.indexable ? (
        <SoftwareAppJsonLd
          app={{
            locale,
            path: { pathname: '/apps/[slug]', params: { slug: app.slug } },
            name: app.name,
            description,
            category: app.categories[0] ? tCatNames(app.categories[0]) : undefined,
            image: app.ogImage ?? screenshots[0]?.url,
            features: features.map((feature) => feature.title),
            requirements: requirementItems.map((item) => `${item.label}: ${item.value}`).join('; '),
            canonical: app.canonical,
          }}
        />
      ) : null}
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { name: 'SignageWall', path: '/' },
          { name: t('hero.title'), path: '/apps' },
          { name: app.name },
        ]}
      />
      <SectionStack>
        <Section innerClassName="py-14 md:py-20">
          <ContentBreadcrumbs
            ariaLabel={tc('breadcrumbs')}
            items={[
              { id: 'home', label: 'SignageWall', href: '/' },
              { id: 'apps', label: t('hero.eyebrow'), href: '/apps' },
              { id: app.appKey, label: app.name },
            ]}
          />
          <Link
            href="/apps"
            className="group mt-6 inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            {t('detail.back')}
          </Link>

          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            <span className="flex size-20 shrink-0 items-center justify-center bg-accent text-accent-contrast">
              <AppIcon svg={app.manifest.icon ?? ''} className="size-10" />
            </span>
            <div>
              <Heading className="md:text-5xl">
                {useEditorialCopy ? app.heroTitle : app.manifest.name}
              </Heading>
              <p className="mt-4 max-w-2xl text-lg text-secondary">{tagline}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {app.categories.map((category) => (
                  <Badge key={category}>{tCatNames(category)}</Badge>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <GetInTouch label={tc('getInTouch')} />
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
            {useEditorialCopy && app.content ? <RichText data={app.content} /> : <p>{about}</p>}
          </Prose>
          {!useEditorialCopy || requirementItems.length === 0 ? (
            <p className="mt-8 border-t border-secondary pt-6 text-sm text-secondary">
              {t(`detail.dataSource.${app.manifest.dataSource}`)}
            </p>
          ) : null}
        </Section>

        {benefits.length > 0 ? (
          <Section innerClassName="max-w-3xl">
            <KeyTakeaways title={t('detail.benefitsTitle')} items={benefits} />
          </Section>
        ) : null}

        {features.length > 0 ? (
          <Section>
            <SectionHeader title={t('detail.featuresTitle')} />
            <div className="mt-12 grid gap-px border border-secondary bg-rule md:grid-cols-3">
              {features.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 70} className="bg-page p-8">
                  <Subtitle>{feature.title}</Subtitle>
                  <p className="mt-3 text-sm text-pretty text-secondary">{feature.body}</p>
                </Reveal>
              ))}
            </div>
          </Section>
        ) : null}

        {useCases.length > 0 ? (
          <Section tone="panel">
            <SectionHeader title={t('detail.useCasesTitle')} />
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {useCases.map((useCase) => (
                <div key={useCase.title} className="border-l-2 border-accent bg-page p-6">
                  <Subtitle>{useCase.title}</Subtitle>
                  <p className="mt-3 text-sm text-pretty text-secondary">{useCase.body}</p>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {setupSteps.length > 0 ? (
          <Section>
            <SectionHeader title={t('detail.setupTitle')} />
            <div className="mt-12 grid gap-px border border-secondary bg-rule md:grid-cols-3">
              {setupSteps.map((step, index) => (
                <div key={step.title} className="bg-page p-8">
                  <StepNumber index={index} />
                  <Subtitle className="mt-8">{step.title}</Subtitle>
                  <p className="mt-3 text-sm text-pretty text-secondary">{step.body}</p>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {requirementItems.length > 0 ? (
          <Section innerClassName="max-w-4xl">
            <RequirementsPanel title={t('detail.requirementsTitle')} items={requirementItems} />
          </Section>
        ) : null}

        {screenshots.length > 0 ? (
          <Section tone="panel">
            <SectionHeader title={t('detail.screenshotsTitle')} />
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {screenshots.map((screenshot) => (
                <figure key={screenshot.id}>
                  <div className="relative aspect-video overflow-hidden border border-secondary bg-page">
                    <Image
                      src={screenshot.url}
                      alt={screenshot.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                </figure>
              ))}
            </div>
          </Section>
        ) : null}

        {linkedSolutions.length > 0 ? (
          <Section>
            <RelatedContent title={t('detail.industriesTitle')}>
              {linkedSolutions.map((solution) => (
                <CatalogCard
                  key={solution.slug}
                  href={{
                    pathname: '/solutions/[industry]',
                    params: { industry: solution.slug },
                  }}
                  icon={<SolutionIcon icon={solution.icon} className="size-5" />}
                  name={solution.name}
                  tagline={solution.tagline}
                />
              ))}
            </RelatedContent>
          </Section>
        ) : null}

        {linkedApps.length > 0 ? (
          <Section tone="panel">
            <RelatedContent title={t('detail.relatedTitle')}>
              {linkedApps.map((related) => (
                <AppCard
                  key={related.id}
                  slug={related.slug}
                  name={related.name}
                  tagline={related.summary}
                  icon={related.icon}
                  className="bg-page"
                />
              ))}
            </RelatedContent>
          </Section>
        ) : null}

        {useEditorialCopy && app.relatedPosts.length > 0 ? (
          <Section>
            <RelatedContent title={t('detail.guidesTitle')} gridClassName="gap-6">
              {app.relatedPosts.map((post) => (
                <BlogCard
                  key={post.id}
                  locale={locale}
                  post={{
                    slug: post.slug,
                    title: post.title,
                    excerpt: post.excerpt,
                    date: null,
                    coverUrl: post.coverUrl ?? null,
                    categoryTitle: null,
                  }}
                />
              ))}
            </RelatedContent>
          </Section>
        ) : null}

        {faq.length > 0 ? (
          <Section innerClassName="max-w-3xl">
            <ContentFaq
              title={t('detail.faqTitle')}
              items={faq}
              includeStructuredData={app.indexable}
            />
          </Section>
        ) : null}

        <CtaBand />
      </SectionStack>
    </>
  )
}
