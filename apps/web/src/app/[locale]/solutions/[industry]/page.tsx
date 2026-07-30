import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppCard } from '@/components/apps/app-card'
import { BlogCard } from '@/components/blog/blog-card'
import { ContentBreadcrumbs, ContentFaq, ProofBlock, RelatedContent } from '@/components/content'
import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { BreadcrumbJsonLd, ServiceJsonLd } from '@/components/seo/json-ld'
import { SolutionIcon } from '@/components/solutions/solution-icon'
import { CatalogCard } from '@/components/ui/catalog-card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Prose } from '@/components/ui/prose'
import { Section, SectionStack } from '@/components/ui/section'
import { StepNumber } from '@/components/ui/step-number'
import { Subtitle } from '@/components/ui/typography'
import { listAppCatalog } from '@/lib/apps'
import {
  executeContentRedirect,
  findContentRedirect,
  type ContentSearchParams,
} from '@/lib/redirects'
import { pageMetadata, publicPath } from '@/lib/seo'
import { getSolution, listSolutionSlugs } from '@/lib/solutions'

/* ISR rather than `force-dynamic`. The content behind this page changes when
   an editor publishes, not per request, so re-rendering on every hit spent a
   database round trip to produce the same HTML. An hour is well inside how
   often this copy actually moves. */
export const revalidate = 3600

/* See the blog route: one call per locale, that locale's slugs only. */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const industries = await listSolutionSlugs()
  const locale = params.locale === 'sr' ? 'sr' : 'en'
  return industries
    .filter((solution) => solution.availability[locale] === true)
    .map((solution) => ({ industry: solution.slug[locale] }))
}

interface PageProps {
  params: Promise<{ locale: string; industry: string }>
  searchParams: Promise<ContentSearchParams>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, industry } = await params
  const solution = await getSolution(locale, industry)
  if (!solution) return {}

  const paths = {
    sr: { pathname: '/solutions/[industry]' as const, params: { industry: solution.slugs.sr } },
    en: { pathname: '/solutions/[industry]' as const, params: { industry: solution.slugs.en } },
  }
  return pageMetadata({
    locale,
    path: paths,
    title: solution.metaTitle,
    description: solution.metaDescription,
    ogTitle: solution.ogTitle,
    ogDescription: solution.ogDescription,
    image: solution.ogImage,
    canonical: solution.canonical,
    availability: solution.availability,
    indexable: solution.indexable,
  })
}

export default async function IndustryPage({ params, searchParams }: PageProps) {
  const { locale, industry } = await params
  setRequestLocale(locale)

  const solution = await getSolution(locale, industry)
  /* Slugs are localised, so /solutions/ugostiteljstvo names a real page in
     the wrong language. Send it to that page's English URL rather than a 404 —
     a language switch or an old shared link should not dead-end. */
  if (!solution) {
    const other = await getSolution(locale === 'en' ? 'sr' : 'en', industry)
    if (other) {
      const targetSlug = locale === 'en' ? other.slugs.en : other.slugs.sr
      if (targetSlug) {
        executeContentRedirect(
          {
            toPath: publicPath(locale, {
              pathname: '/solutions/[industry]',
              params: { industry: targetSlug },
            }),
            statusCode: 308,
            preserveQuery: true,
          },
          await searchParams,
        )
      }
    }
    const redirect = await findContentRedirect(
      publicPath(locale, {
        pathname: '/solutions/[industry]',
        params: { industry },
      }),
    )
    if (redirect) executeContentRedirect(redirect, await searchParams)
    notFound()
  }

  const tCat = await getTranslations('catalog')
  const appCatalog = await listAppCatalog(locale)
  const appByKey = new Map(appCatalog.map((app) => [app.appKey, app]))
  const relatedApps = solution.recommendedApps.flatMap((appKey) => {
    const app = appByKey.get(appKey)
    return app?.indexable && !app.canonical ? [app] : []
  })
  const t = await getTranslations('solutions')
  const tc = await getTranslations('common')

  return (
    <>
      {solution.indexable ? (
        <ServiceJsonLd
          service={{
            locale,
            path: { pathname: '/solutions/[industry]', params: { industry } },
            name: solution.metaTitle,
            description: solution.metaDescription,
            audience: solution.audience,
            industry: solution.name,
            image: solution.ogImage,
            canonical: solution.canonical,
          }}
        />
      ) : null}
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { name: 'SignageWall', path: '/' },
          { name: t('hero.title'), path: '/solutions' },
          { name: solution.name },
        ]}
      />
      <SectionStack>
        {/* No buttons in this hero on purpose: the page closes with CtaBand, and
            a second pair up here competed with it rather than adding a route. */}
        <Section innerClassName="pb-0 pt-8">
          <ContentBreadcrumbs
            ariaLabel={tc('breadcrumbs')}
            items={[
              { id: 'home', label: 'SignageWall', href: '/' },
              { id: 'solutions', label: t('hero.eyebrow'), href: '/solutions' },
              { id: solution.slug, label: solution.name },
            ]}
          />
        </Section>
        <PageHero eyebrow={solution.name} title={solution.title} subtitle={solution.subtitle} />

        {solution.intro.length > 0 && (
          <Section innerClassName="max-w-3xl">
            <Prose className="text-base">
              {solution.intro.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </Prose>
          </Section>
        )}

        <Section>
          <div className="flex items-center gap-5">
            <IconBadge className="size-14 bg-accent text-accent-contrast [&_svg]:size-7">
              <SolutionIcon icon={solution.icon} />
            </IconBadge>
            <SectionHeader title={t('detail.scenariosTitle')} />
          </div>
          <div className="mt-16 grid gap-px border border-secondary bg-rule md:grid-cols-3">
            {solution.scenarios.map((s, i) => (
              <Reveal key={s.title} delay={i * 70} className="bg-page p-8">
                <StepNumber index={i} />
                <Subtitle className="mt-10">{s.title}</Subtitle>
                <p className="mt-3 text-sm text-pretty text-secondary">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section tone="panel">
          <SectionHeader title={t('detail.benefitsTitle')} />
          {/* Statements set under a coral rule rather than boxed with a tick —
              short claims don't need frames around them. */}
          <div className="mt-16 grid gap-10 sm:grid-cols-3">
            {solution.benefits.map((b, i) => (
              <Reveal key={b} delay={i * 70} className="border-t-2 border-accent pt-6">
                <p className="font-heading text-xl font-semibold tracking-tight text-balance">
                  {b}
                </p>
              </Reveal>
            ))}
          </div>
        </Section>

        {solution.proof && (
          <Section innerClassName="max-w-3xl">
            <ProofBlock title={solution.proof.title} body={solution.proof.body} />
          </Section>
        )}

        {relatedApps.length > 0 && (
          <Section tone="panel">
            <RelatedContent title={t('detail.appsTitle')}>
              {relatedApps.map((app) => (
                <AppCard
                  key={app.slug}
                  slug={app.slug}
                  name={app.name}
                  tagline={
                    app.source === 'editorial' && app.localeReady
                      ? app.tagline
                      : tCat(`${app.appKey}.tagline`)
                  }
                  icon={app.manifest.icon ?? ''}
                  className="bg-page"
                />
              ))}
            </RelatedContent>
          </Section>
        )}

        {solution.relatedPosts.length > 0 ? (
          <Section>
            <RelatedContent title={t('detail.guidesTitle')} gridClassName="gap-6">
              {solution.relatedPosts.map((post) => (
                <BlogCard
                  key={post.id}
                  locale={locale}
                  post={{
                    slug: post.slug,
                    title: post.title,
                    excerpt: post.excerpt,
                    date: null,
                    coverUrl: post.coverUrl,
                    categoryTitle: null,
                  }}
                />
              ))}
            </RelatedContent>
          </Section>
        ) : null}

        {solution.relatedSolutions.length > 0 ? (
          <Section tone="panel">
            <RelatedContent title={t('detail.relatedSolutionsTitle')}>
              {solution.relatedSolutions.map((related) => (
                <CatalogCard
                  key={related.slug}
                  href={{
                    pathname: '/solutions/[industry]',
                    params: { industry: related.slug },
                  }}
                  icon={<SolutionIcon icon={related.icon} className="size-5" />}
                  name={related.name}
                  tagline={related.tagline}
                  className="bg-page"
                />
              ))}
            </RelatedContent>
          </Section>
        ) : null}

        {solution.faq.length > 0 && (
          <Section innerClassName="max-w-3xl">
            <ContentFaq
              title={t('detail.faqTitle')}
              items={solution.faq}
              includeStructuredData={solution.indexable}
            />
          </Section>
        )}

        <CtaBand />
      </SectionStack>
    </>
  )
}
