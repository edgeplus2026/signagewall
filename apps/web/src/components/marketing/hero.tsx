import { getTranslations } from 'next-intl/server'

import { AppBento } from '@/components/marketing/app-bento'
import { Reveal } from '@/components/motion/reveal'
import { buttonVariants } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { Eyebrow, Heading, Lead } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export async function Hero() {
  const t = await getTranslations('home.hero')

  return (
    <Section innerClassName="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
      {/* Positioned against the block, not the column, so the grid fades out
          level with the rails. Absolute, so it takes no grid track. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-x-0 top-0 h-110 mask-[radial-gradient(65%_65%_at_50%_0%,#000,transparent)] opacity-60"
          style={{
            backgroundImage: 'radial-gradient(var(--border-secondary) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <Reveal className="flex flex-col items-start gap-6">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <Heading>{t('title')}</Heading>
        <Lead className="max-w-xl">{t('subtitle')}</Lead>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link href="/contact" className={cn(buttonVariants({ size: 'lg' }))}>
            {t('ctaPrimary')}
          </Link>
          <Link href="/apps" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            {t('ctaSecondary')}
          </Link>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <AppBento />
      </Reveal>
    </Section>
  )
}
