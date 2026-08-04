import { Download, Monitor, Smartphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CtaBand } from '@/components/marketing/cta-band'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { GetInTouch } from '@/components/quote/get-in-touch'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Section, SectionStack } from '@/components/ui/section'
import { StepNumber } from '@/components/ui/step-number'
import { Subtitle } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { pageMetadata } from '@/lib/seo'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ locale: string }>
}

// Real release URLs come from the player's R2 release pipeline (set at deploy).
// When absent, the CTA falls back to /contact so the button is never dead.
const DOWNLOAD_URLS: Record<'android' | 'desktop', string | undefined> = {
  android: process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL,
  desktop: process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL,
}

const PLATFORMS: { key: 'android' | 'desktop'; icon: LucideIcon }[] = [
  { key: 'android', icon: Smartphone },
  { key: 'desktop', icon: Monitor },
]

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'download.meta' })
  return pageMetadata({
    locale,
    path: '/download',
    title: t('title'),
    description: t('description'),
  })
}

export default async function DownloadPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('download')
  const tc = await getTranslations('common')
  const steps = t.raw('steps.items') as { title: string; body: string }[]

  return (
    <SectionStack>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <Section>
        <SectionHeader title={t('platforms.title')} />
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {PLATFORMS.map(({ key, icon: Icon }, i) => {
            const url = DOWNLOAD_URLS[key]
            const ctaClass = cn(buttonVariants({ size: 'lg' }), 'mt-8 w-full')
            return (
              <Reveal key={key} delay={i * 80}>
                <Card className="flex h-full flex-col">
                  <IconBadge className="size-14 [&_svg]:size-7">
                    <Icon />
                  </IconBadge>
                  <Subtitle className="mt-6 text-xl">{t(`platforms.${key}.name`)}</Subtitle>
                  <p className="mt-3 text-secondary">{t(`platforms.${key}.body`)}</p>
                  <p className="mt-4 text-sm text-secondary">
                    {t(`platforms.${key}.requirements`)}
                  </p>
                  <div className="flex-1" />
                  {url ? (
                    <a href={url} className={ctaClass} download>
                      <Download />
                      {t(`platforms.${key}.cta`)}
                    </a>
                  ) : (
                    /* No release URL configured. The button used to keep saying
                       "Download APK" while quietly going to the contact form —
                       a promise the click does not keep. Say what it does. */
                    <>
                      <Link href="/contact" className={ctaClass}>
                        {t('platforms.ctaUnavailable')}
                      </Link>
                      <p className="mt-3 text-xs text-secondary">
                        {t('platforms.unavailableNote')}
                      </p>
                    </>
                  )}
                </Card>
              </Reveal>
            )
          })}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <p className="max-w-xl text-sm text-secondary">{t('note')}</p>
          <GetInTouch label={tc('getInTouch')} variant="outline" size="sm" />
        </div>
      </Section>

      <Section tone="panel">
        <SectionHeader title={t('steps.title')} />
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 70}>
              <Card className="h-full bg-page">
                <StepNumber index={i} />
                <Subtitle className="mt-8">{s.title}</Subtitle>
                <p className="mt-3 text-sm text-secondary">{s.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <CtaBand />
    </SectionStack>
  )
}
