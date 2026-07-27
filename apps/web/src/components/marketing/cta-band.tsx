import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/motion/reveal'
import { buttonVariants } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { Title } from '@/components/ui/typography'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export async function CtaBand() {
  const t = await getTranslations('home.cta')

  return (
    /* The one inverted plate on the page — it closes the stack the way a solid
       bar closes a printed sheet. */
    <Section tone="invert">
      <Reveal className="flex flex-col items-start gap-6">
        <Title className="max-w-3xl">{t('title')}</Title>
        <p className="max-w-xl text-lg opacity-80">{t('body')}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/contact" className={cn(buttonVariants({ variant: 'inverse', size: 'lg' }))}>
            {t('primary')}
          </Link>
          <Link
            href="/contact"
            className={cn(buttonVariants({ variant: 'inverseOutline', size: 'lg' }))}
          >
            {t('secondary')}
          </Link>
        </div>
      </Reveal>
    </Section>
  )
}
