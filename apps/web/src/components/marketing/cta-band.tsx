import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/motion/reveal'
import { GetInTouch } from '@/components/quote/get-in-touch'
import { buttonVariants } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { Title } from '@/components/ui/typography'
import { REGISTER_URL } from '@/lib/app-url'
import { TRIAL_DAYS } from '@/lib/pricing'
import { cn } from '@/lib/utils'

export async function CtaBand() {
  const t = await getTranslations('home.cta')
  const trialDays = TRIAL_DAYS

  return (
    /* The one inverted plate on the page — it closes the stack the way a solid
       bar closes a printed sheet. */
    <Section tone="invert">
      <Reveal className="flex flex-col items-start gap-6">
        <Title className="max-w-3xl">{t('title')}</Title>
        <p className="max-w-xl text-lg opacity-80">{t('body', { trialDays })}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {/* Primary goes to sign-up, not the contact form — both buttons used
              to land on /contact, which made the choice meaningless. */}
          <a href={REGISTER_URL} className={cn(buttonVariants({ variant: 'inverse', size: 'lg' }))}>
            {t('primary')}
          </a>
          <GetInTouch label={t('secondary')} variant="inverseOutline" size="lg" />
        </div>
      </Reveal>
    </Section>
  )
}
