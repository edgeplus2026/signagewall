import { CalendarClock, LayoutGrid, LayoutTemplate, WifiOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo/json-ld'
import { Card } from '@/components/ui/card'
import { Faq } from '@/components/ui/faq'
import { IconBadge } from '@/components/ui/icon-badge'
import { Section, SectionStack } from '@/components/ui/section'
import { StepNumber } from '@/components/ui/step-number'
import { Subtitle } from '@/components/ui/typography'
import { catalogApps } from '@/lib/apps'
import { localeAlternates } from '@/lib/seo'

interface PageProps {
  params: Promise<{ locale: string }>
}

const CAP_ICONS: LucideIcon[] = [LayoutGrid, CalendarClock, LayoutTemplate, WifiOff]

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'howItWorks.meta' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: localeAlternates(locale, '/how-it-works'),
  }
}

export default async function HowItWorksPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('howItWorks')
  /* See features: one step body names the app count. */
  const steps = (t.raw('steps.items') as { title: string; body: string }[]).map((_, i) => ({
    title: t(`steps.items.${i.toString()}.title`, { count: catalogApps.length }),
    body: t(`steps.items.${i.toString()}.body`, { count: catalogApps.length }),
  }))
  const caps = t.raw('capabilities.items') as { title: string; body: string }[]
  const faq = t.raw('faq.items') as { q: string; a: string }[]

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        items={[{ name: 'SignageWall', path: '/' }, { name: t('hero.title') }]}
      />
      {/* Only emitted because the same questions render below. */}
      <FaqJsonLd items={faq} />
      <SectionStack>
        <PageHero
          eyebrow={t('hero.eyebrow')}
          title={t('hero.title')}
          subtitle={t('hero.subtitle')}
        />

        <Section>
          <SectionHeader title={t('steps.title')} />
          <div className="mt-16 space-y-6">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 60}>
                <Card className="flex flex-col gap-4 md:flex-row md:items-start md:gap-10">
                  <StepNumber index={i} className="text-4xl md:w-20" />
                  <div>
                    <Subtitle>{s.title}</Subtitle>
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
                    <Subtitle className="mt-6">{c.title}</Subtitle>
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
    </>
  )
}
