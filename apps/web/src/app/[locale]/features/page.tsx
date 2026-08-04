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
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo/json-ld'
import { Card } from '@/components/ui/card'
import { Faq } from '@/components/ui/faq'
import { IconBadge } from '@/components/ui/icon-badge'
import { Section, SectionStack } from '@/components/ui/section'
import { Subtitle, Title } from '@/components/ui/typography'
import { catalogApps } from '@/lib/apps'
import { formattedPrice } from '@/lib/pricing'
import { pageMetadata } from '@/lib/seo'

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
  return pageMetadata({
    locale,
    path: '/features',
    title: t('title'),
    description: t('description', { count: catalogApps.length }),
  })
}

export default async function FeaturesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('features')
  /* Through `t()` so the {count} placeholder in one title interpolates —
     `t.raw` returns the message untouched. */
  const grid = (t.raw('grid.items') as { title: string; body: string }[]).map((_, i) => ({
    title: t(`grid.items.${i.toString()}.title`, { count: catalogApps.length }),
    body: t(`grid.items.${i.toString()}.body`, { count: catalogApps.length }),
  }))
  const points = t.raw('spotlight.points') as string[]
  const deepValues = { appCount: catalogApps.length, price: formattedPrice(locale) }
  const deep = (
    t.raw('deep.items') as { id: string; title: string; body: string; example: string }[]
  ).map((item, i) => ({
    id: item.id,
    title: t(`deep.items.${i.toString()}.title`, deepValues),
    body: t(`deep.items.${i.toString()}.body`, deepValues),
    example: t(`deep.items.${i.toString()}.example`, deepValues),
  }))
  const faq = (t.raw('faq.items') as { q: string; a: string }[]).map((_, i) => ({
    q: t(`faq.items.${i.toString()}.q`, deepValues),
    a: t(`faq.items.${i.toString()}.a`, deepValues),
  }))

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
                    <Subtitle className="mt-6">{item.title}</Subtitle>
                    <p className="mt-3 text-sm text-secondary">{item.body}</p>
                  </Card>
                </Reveal>
              )
            })}
          </div>
        </Section>

        {/* The nine cards above are the index; this is the page. Each capability
            gets a heading, a paragraph that says what it solves rather than what
            it is called, and one concrete example — which is the part a reader
            remembers and the part an assistant quotes. */}
        <Section innerClassName="max-w-3xl">
          <Title className="text-2xl md:text-3xl">{t('deep.title')}</Title>
          <div className="mt-14 flex flex-col gap-14">
            {deep.map((item, i) => (
              <Reveal key={item.id} delay={(i % 3) * 60}>
                <article id={item.id}>
                  <Subtitle className="text-xl md:text-2xl">{item.title}</Subtitle>
                  <p className="mt-4 text-pretty text-secondary">{item.body}</p>
                  <p className="mt-5 border-l-2 border-accent pl-5 text-sm">
                    <span className="font-medium">{t('deep.exampleLab')}: </span>
                    {item.example}
                  </p>
                </article>
              </Reveal>
            ))}
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
    </>
  )
}
