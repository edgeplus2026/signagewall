import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppCard } from '@/components/apps/app-card'
import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { BreadcrumbJsonLd, FaqJsonLd, ServiceJsonLd } from '@/components/seo/json-ld'
import { SolutionIcon } from '@/components/solutions/solution-icon'
import { buttonVariants } from '@/components/ui/button'
import { Faq } from '@/components/ui/faq'
import { IconBadge } from '@/components/ui/icon-badge'
import { Prose } from '@/components/ui/prose'
import { Section, SectionStack } from '@/components/ui/section'
import { StepNumber } from '@/components/ui/step-number'
import { Subtitle, Title } from '@/components/ui/typography'
import { Link, permanentRedirect } from '@/i18n/navigation'
import { appManifestBySlug } from '@/lib/apps'
import { localeAlternates, openGraphMeta } from '@/lib/seo'
import { getSolution, listSolutionSlugs } from '@/lib/solutions'
import { cn } from '@/lib/utils'

/* ISR rather than `force-dynamic`. The content behind this page changes when
   an editor publishes, not per request, so re-rendering on every hit spent a
   database round trip to produce the same HTML. An hour is well inside how
   often this copy actually moves. */
export const revalidate = 3600

/* See the blog route: one call per locale, that locale's slugs only. */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const industries = await listSolutionSlugs()
  return industries.map((s) => ({ industry: params.locale === 'en' ? s.slug.en : s.slug.sr }))
}

interface PageProps {
  params: Promise<{ locale: string; industry: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, industry } = await params
  const solution = await getSolution(locale, industry)
  if (!solution) return {}

  const paths = {
    sr: { pathname: '/solutions/[industry]' as const, params: { industry: solution.slugs.sr } },
    en: { pathname: '/solutions/[industry]' as const, params: { industry: solution.slugs.en } },
  }
  return {
    title: solution.metaTitle,
    description: solution.metaDescription,
    alternates: localeAlternates(locale, paths),
    openGraph: openGraphMeta({
      locale,
      path: paths,
      type: 'article',
      title: solution.metaTitle,
      description: solution.metaDescription,
    }),
  }
}

export default async function IndustryPage({ params }: PageProps) {
  const { locale, industry } = await params
  setRequestLocale(locale)

  const solution = await getSolution(locale, industry)
  /* Slugs are localised, so /en/solutions/ugostiteljstvo names a real page in
     the wrong language. Send it to that page's English URL rather than a 404 —
     a language switch or an old shared link should not dead-end. */
  if (!solution) {
    const other = await getSolution(locale === 'en' ? 'sr' : 'en', industry)
    if (other) {
      permanentRedirect({
        href: {
          pathname: '/solutions/[industry]',
          params: { industry: locale === 'en' ? other.slugs.en : other.slugs.sr },
        },
        locale,
      })
    }
    notFound()
  }

  const tCat = await getTranslations('catalog')
  const relatedApps = solution.recommendedApps
    .map((slug) => appManifestBySlug.get(slug))
    .filter((m) => m !== undefined)
  const t = await getTranslations('solutions')
  const tc = await getTranslations('common')

  return (
    <>
      <ServiceJsonLd
        service={{
          locale,
          path: { pathname: '/solutions/[industry]', params: { industry } },
          name: solution.metaTitle,
          description: solution.metaDescription,
        }}
      />
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { name: 'SignageWall', path: '/' },
          { name: t('hero.title'), path: '/solutions' },
          { name: solution.name },
        ]}
      />
      {/* Only emitted because the same questions are rendered below — FAQ markup
          that isn't visible on the page is a manual-action risk. */}
      <FaqJsonLd items={solution.faq} />

      <SectionStack>
        <PageHero eyebrow={solution.name} title={solution.title} subtitle={solution.subtitle}>
          <Link href="/contact" className={cn(buttonVariants({ size: 'lg' }))}>
            {tc('bookDemo')}
          </Link>
          <Link href="/apps" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            {tc('exploreApps')}
          </Link>
        </PageHero>

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
            {/* A number a reader can repeat to a colleague does more than any
                adjective on this page. */}
            <Title className="text-2xl md:text-3xl">{solution.proof.title}</Title>
            <p className="mt-5 border-l-2 border-accent pl-5 text-lg text-pretty">
              {solution.proof.body}
            </p>
          </Section>
        )}

        {relatedApps.length > 0 && (
          <Section tone="panel">
            <SectionHeader title={t('detail.appsTitle')} />
            {/* The industry pages had no internal links at all; these are the
                natural ones — the apps this industry actually uses. */}
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedApps.map((app) => (
                <AppCard
                  key={app.slug}
                  slug={app.slug}
                  name={app.name}
                  tagline={tCat(`${app.slug}.tagline`)}
                  icon={app.icon ?? ''}
                  className="bg-page"
                />
              ))}
            </div>
          </Section>
        )}

        {solution.faq.length > 0 && (
          <Section innerClassName="max-w-3xl">
            <Title className="text-2xl md:text-3xl">{t('detail.faqTitle')}</Title>
            <div className="mt-10">
              <Faq items={solution.faq} />
            </div>
          </Section>
        )}

        <CtaBand />
      </SectionStack>
    </>
  )
}
