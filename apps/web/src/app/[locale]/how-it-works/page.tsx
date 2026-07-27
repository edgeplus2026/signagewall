import { CalendarClock, LayoutGrid, LayoutTemplate, WifiOff } from 'lucide-react'
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

const CAP_ICONS: LucideIcon[] = [LayoutGrid, CalendarClock, LayoutTemplate, WifiOff]

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'howItWorks.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function HowItWorksPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('howItWorks')
  const steps = t.raw('steps.items') as { title: string; body: string }[]
  const caps = t.raw('capabilities.items') as { title: string; body: string }[]
  const faq = t.raw('faq.items') as { q: string; a: string }[]

  return (
    <SectionStack>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <Section>
        <SectionHeader title={t('steps.title')} />
        <div className="mt-16 space-y-6">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <Card className="flex flex-col gap-4 md:flex-row md:items-start md:gap-10">
                <span className="font-heading text-4xl leading-none font-semibold tracking-tight text-primary/25 tabular-nums md:w-20">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="font-heading text-lg font-semibold tracking-tight">{s.title}</p>
                  <p className="mt-3 max-w-2xl text-secondary">{s.body}</p>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="panel">
        <SectionHeader eyebrow={t('capabilities.eyebrow')} title={t('capabilities.title')} />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {caps.map((c, i) => {
            const Icon = CAP_ICONS[i] ?? LayoutGrid
            return (
              <Reveal key={c.title} delay={(i % 4) * 60}>
                <Card className="h-full bg-page">
                  <IconBadge>
                    <Icon />
                  </IconBadge>
                  <p className="mt-6 font-heading text-lg font-semibold tracking-tight text-balance">
                    {c.title}
                  </p>
                  <p className="mt-3 text-sm text-secondary">{c.body}</p>
                </Card>
              </Reveal>
            )
          })}
        </div>
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
