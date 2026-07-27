import { Check } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Section, SectionStack } from '@/components/ui/section'
import { Link } from '@/i18n/navigation'
import { INDUSTRY_ICONS, INDUSTRY_ORDER, isIndustry } from '@/lib/solutions'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ locale: string; industry: string }>
}

export function generateStaticParams() {
  return INDUSTRY_ORDER.map((industry) => ({ industry }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, industry } = await params
  if (!isIndustry(industry)) return {}
  const t = await getTranslations({ locale, namespace: 'solutions' })
  return {
    title: t(`industries.${industry}.name`),
    description: t(`industries.${industry}.subtitle`),
  }
}

export default async function IndustryPage({ params }: PageProps) {
  const { locale, industry } = await params
  setRequestLocale(locale)
  if (!isIndustry(industry)) notFound()

  const t = await getTranslations('solutions')
  const tc = await getTranslations('common')
  const base = `industries.${industry}`
  const Icon = INDUSTRY_ICONS[industry]
  const scenarios = t.raw(`${base}.scenarios`) as { title: string; body: string }[]
  const benefits = t.raw(`${base}.benefits`) as string[]

  return (
    <SectionStack>
      <PageHero
        eyebrow={t(`${base}.name`)}
        title={t(`${base}.title`)}
        subtitle={t(`${base}.subtitle`)}
      >
        <Link href="/contact" className={cn(buttonVariants({ size: 'lg' }))}>
          {tc('bookDemo')}
        </Link>
        <Link href="/apps" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
          {tc('exploreApps')}
        </Link>
      </PageHero>

      <Section>
        <div className="flex items-center gap-5">
          <IconBadge className="size-14 [&_svg]:size-7">
            <Icon />
          </IconBadge>
          <SectionHeader title={t('detail.scenariosTitle')} />
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {scenarios.map((s, i) => (
            <Reveal key={s.title} delay={i * 70}>
              <Card className="h-full">
                <p className="font-heading text-lg font-semibold tracking-tight">{s.title}</p>
                <p className="mt-3 text-sm text-secondary">{s.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="panel">
        <SectionHeader title={t('detail.benefitsTitle')} />
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {benefits.map((b, i) => (
            <Reveal key={b} delay={i * 70}>
              <Card className="flex h-full items-start gap-3 bg-page p-6">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center bg-brand text-brand-contrast">
                  <Check className="size-3.5" />
                </span>
                <span className="text-sm font-medium">{b}</span>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <CtaBand />
    </SectionStack>
  )
}
