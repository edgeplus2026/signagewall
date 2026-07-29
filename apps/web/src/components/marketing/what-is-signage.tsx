import { ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/motion/reveal'
import { buttonVariants } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { Eyebrow, Lead, Title } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * For the visitor who does not know the term.
 *
 * The hero eyebrow says "Digital signage" and the rest of the page assumes you
 * know what that is. A bakery owner who found us through "menu screen for my
 * shop" does not, and bounces. Three sentences and a link to the full guide.
 */
export async function WhatIsSignage() {
  const t = await getTranslations('home.whatIs')

  return (
    <Section innerClassName="max-w-3xl">
      <Reveal className="flex flex-col items-start gap-5">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <Title className="text-2xl md:text-4xl">{t('title')}</Title>
        <Lead>{t('body')}</Lead>
        <Link
          href="/what-is-digital-signage"
          className={cn(buttonVariants({ variant: 'link' }), 'mt-2 gap-1.5')}
        >
          {t('cta')}
          <ArrowRight />
        </Link>
      </Reveal>
    </Section>
  )
}
