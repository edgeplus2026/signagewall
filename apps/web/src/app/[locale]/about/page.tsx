import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { BreadcrumbJsonLd } from '@/components/seo/json-ld'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Prose } from '@/components/ui/prose'
import { Section, SectionStack } from '@/components/ui/section'
import { Subtitle, Title } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { REGISTER_URL } from '@/lib/app-url'
import { localeAlternates, openGraphMeta } from '@/lib/seo'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about.meta' })
  const title = t('title')
  const description = t('description')
  return {
    title,
    description,
    alternates: localeAlternates(locale, '/about'),
    openGraph: openGraphMeta({ locale, path: '/about', title, description }),
  }
}

/**
 * About, rebuilt around the product rather than around where it was written.
 *
 * The page used to lead with "Software for screens, built in Serbia" and sell
 * "support in your language" — arguments that only land on one market and read
 * as filler on the one we are actually chasing. What replaces them is the part
 * a buyer can check: how the player behaves when the network dies, why there is
 * no plan matrix, and what we refuse to do. That is also the only section on
 * the site that explains the engineering, which is what earns trust from the
 * technical person on the other side of the decision.
 */
export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('about')

  const paragraphs = t.raw('story.paragraphs') as string[]
  const build = t.raw('build.items') as { title: string; body: string }[]
  const values = t.raw('values.items') as { title: string; body: string }[]

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

        <Section innerClassName="max-w-3xl">
          <Title className="text-2xl md:text-3xl">{t('story.title')}</Title>
          <Prose className="mt-6 text-base">
            {paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </Prose>
        </Section>

        <Section tone="panel">
          <SectionHeader
            eyebrow={t('build.eyebrow')}
            title={t('build.title')}
            subtitle={t('build.subtitle')}
          />
          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {build.map((item, i) => (
              <Reveal key={item.title} delay={(i % 2) * 80}>
                <Card className="h-full border-t-2 border-t-accent bg-page">
                  <Subtitle>{item.title}</Subtitle>
                  <p className="mt-3 text-sm text-secondary">{item.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section>
          <SectionHeader title={t('values.title')} />
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={(i % 4) * 70}>
                <Card className="h-full">
                  <Subtitle>{v.title}</Subtitle>
                  <p className="mt-3 text-sm text-secondary">{v.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section tone="panel" innerClassName="max-w-3xl">
          <Title className="text-2xl md:text-3xl">{t('contact.title')}</Title>
          <p className="mt-4 text-lg text-secondary">{t('contact.body')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact" className={cn(buttonVariants({ size: 'lg' }))}>
              {t('contact.cta')}
            </Link>
            <a
              href={REGISTER_URL}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
            >
              {t('contact.ctaSecondary')}
            </a>
          </div>
        </Section>

        <CtaBand />
      </SectionStack>
    </>
  )
}
