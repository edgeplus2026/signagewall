import { setRequestLocale } from 'next-intl/server'

import { AppsShowcase } from '@/components/marketing/apps-showcase'
import { CtaBand } from '@/components/marketing/cta-band'
import { Features } from '@/components/marketing/features'
import { Hero } from '@/components/marketing/hero'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { Platform } from '@/components/marketing/platform'
import { StatBand } from '@/components/marketing/stat-band'
import { UseCases } from '@/components/marketing/use-cases'
import { SectionStack } from '@/components/ui/section'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <SectionStack>
      <Hero />
      <StatBand />
      <Features />
      <UseCases />
      <HowItWorks />
      <AppsShowcase />
      <Platform />
      <CtaBand />
    </SectionStack>
  )
}
