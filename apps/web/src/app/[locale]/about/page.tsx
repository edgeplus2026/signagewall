import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { Card } from '@/components/ui/card'
import { Section, SectionStack } from '@/components/ui/section'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('about')
  const paragraphs = t.raw('story.paragraphs') as string[]
  const values = t.raw('values.items') as { title: string; body: string }[]

  return (
    <SectionStack>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <Section innerClassName="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <SectionHeader title={t('story.title')} />
        <Reveal delay={80} className="space-y-5 text-lg text-secondary">
          {paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Reveal>
      </Section>

      <Section tone="panel">
        <SectionHeader title={t('values.title')} />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={(i % 4) * 70}>
              <Card className="h-full bg-page">
                <p className="font-heading text-lg font-semibold tracking-tight">{v.title}</p>
                <p className="mt-3 text-sm text-secondary">{v.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <CtaBand />
    </SectionStack>
  )
}
