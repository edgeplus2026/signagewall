import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { Card } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Section, SectionStack } from '@/components/ui/section'
import { Link } from '@/i18n/navigation'
import { INDUSTRY_ICONS, INDUSTRY_ORDER } from '@/lib/solutions'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'solutions.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function SolutionsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('solutions')
  const tc = await getTranslations('common')

  return (
    <SectionStack>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <Section>
        <SectionHeader title={t('overview.title')} />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRY_ORDER.map((slug, i) => {
            const Icon = INDUSTRY_ICONS[slug]
            return (
              <Reveal key={slug} delay={(i % 3) * 70}>
                <Link href={`/solutions/${slug}`} className="block h-full">
                  <Card className="group flex h-full flex-col transition-colors hover:border-primary">
                    <IconBadge>
                      <Icon />
                    </IconBadge>
                    <p className="mt-6 font-heading text-lg font-semibold tracking-tight">
                      {t(`industries.${slug}.name`)}
                    </p>
                    <p className="mt-3 text-sm text-secondary">{t(`industries.${slug}.tagline`)}</p>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-secondary transition-colors group-hover:text-primary">
                      {tc('learnMore')}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Card>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </Section>

      <CtaBand />
    </SectionStack>
  )
}
