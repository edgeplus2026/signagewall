import {
  CalendarClock,
  Check,
  LayoutGrid,
  LayoutTemplate,
  Monitor,
  Palette,
  Radio,
  ShieldCheck,
  Users,
  WifiOff,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { Card } from '@/components/ui/card'
import { Faq } from '@/components/ui/faq'
import { IconBadge } from '@/components/ui/icon-badge'
import { Section, SectionStack } from '@/components/ui/section'

interface PageProps {
  params: Promise<{ locale: string }>
}

const GRID_ICONS: LucideIcon[] = [
  Radio,
  CalendarClock,
  LayoutGrid,
  LayoutTemplate,
  WifiOff,
  Users,
  Palette,
  Monitor,
  ShieldCheck,
]

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'features.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function FeaturesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('features')
  const grid = t.raw('grid.items') as { title: string; body: string }[]
  const points = t.raw('spotlight.points') as string[]
  const faq = t.raw('faq.items') as { q: string; a: string }[]

  return (
    <SectionStack>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <Section>
        <SectionHeader title={t('grid.title')} />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {grid.map((item, i) => {
            const Icon = GRID_ICONS[i] ?? LayoutGrid
            return (
              <Reveal key={item.title} delay={(i % 3) * 70}>
                <Card className="h-full">
                  <IconBadge>
                    <Icon />
                  </IconBadge>
                  <p className="mt-6 font-heading text-lg font-semibold tracking-tight text-balance">
                    {item.title}
                  </p>
                  <p className="mt-3 text-sm text-secondary">{item.body}</p>
                </Card>
              </Reveal>
            )
          })}
        </div>
      </Section>

      <Section tone="panel" innerClassName="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <SectionHeader eyebrow={t('spotlight.eyebrow')} title={t('spotlight.title')} />
          <p className="mt-5 text-lg text-secondary">{t('spotlight.body')}</p>
        </Reveal>
        <Reveal delay={120}>
          <Card className="bg-page">
            <ul className="flex flex-col gap-4">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center bg-brand text-brand-contrast">
                    <Check className="size-3.5" />
                  </span>
                  <span className="text-sm">{p}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      </Section>

      <Section innerClassName="max-w-3xl">
        <SectionHeader title={t('faq.title')} />
        <div className="mt-10">
          <Faq items={faq} />
        </div>
      </Section>

      <CtaBand />
    </SectionStack>
  )
}
