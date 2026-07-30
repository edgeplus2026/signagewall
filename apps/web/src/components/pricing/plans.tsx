import { Check } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { GetInTouch } from '@/components/quote/get-in-touch'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { REGISTER_URL } from '@/lib/app-url'
import { catalogApps } from '@/lib/apps'
import { formattedPrice, TRIAL_DAYS } from '@/lib/pricing'
import { cn } from '@/lib/utils'

/**
 * The two plans, in one component because /pricing and the home page must never
 * disagree about what a screen costs — the page that shows the older wording is
 * the one a visitor quotes back at you.
 *
 * Basic and Enterprise are the same product; the screen count is the only line
 * between them, which is why neither card lists a feature the other lacks.
 */
export async function Plans({ locale, heading = true }: { locale: string; heading?: boolean }) {
  const t = await getTranslations('pricing.plans')
  const values = {
    price: formattedPrice(locale),
    trialDays: TRIAL_DAYS,
    appCount: catalogApps.length,
  }
  const basicIncluded = t.raw('basic.included') as string[]
  const enterpriseIncluded = t.raw('enterprise.included') as string[]

  return (
    /* Narrower than a full plate and centred: two cards spread across the whole
       column read as banners, and the eye stops comparing them. `Container` has
       no max-width of its own, so the centring has to be asked for here. */
    <Section innerClassName="mx-auto max-w-4xl">
      {heading && <SectionHeader title={t('title')} subtitle={t('subtitle')} />}
      {/* Subgrid, not equal heights: the two cards carry different amounts of
          copy under the price, and without shared rows the buttons and the
          feature lists sit at different heights on the two cards. */}
      <div
        className={cn(
          'grid gap-6 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_1fr]',
          heading && 'mt-16',
        )}
      >
        <Reveal className="lg:row-span-4 lg:grid lg:grid-rows-subgrid">
          <Card className="flex h-full flex-col lg:row-span-4 lg:grid lg:grid-rows-subgrid lg:gap-0">
            <PlanHead
              name={t('basic.name')}
              price={t('basic.price', values)}
              unit={t('basic.unit')}
              limit={t('basic.limit')}
            />
            <p className="mt-3 text-sm text-pretty text-secondary">{t('basic.trial', values)}</p>
            <a href={REGISTER_URL} className={cn(buttonVariants({ size: 'lg' }), 'mt-8 w-full')}>
              {t('basic.cta')}
            </a>
            <FeatureList
              items={basicIncluded}
              translate={(i) => t(`basic.included.${i}`, values)}
            />
          </Card>
        </Reveal>

        <Reveal delay={80} className="lg:row-span-4 lg:grid lg:grid-rows-subgrid">
          <Card className="flex h-full flex-col border-t-2 border-t-accent lg:row-span-4 lg:grid lg:grid-rows-subgrid lg:gap-0">
            <PlanHead
              name={t('enterprise.name')}
              price={t('enterprise.price')}
              limit={t('enterprise.limit')}
            />
            <p className="mt-3 text-sm text-pretty text-secondary">{t('enterprise.body')}</p>
            {/* Opens the quote form — there is no number to publish here, so a
                link to a contact page would just be a longer route to asking. */}
            <GetInTouch label={t('enterprise.cta')} size="lg" className="mt-8 w-full" />
            <FeatureList
              items={enterpriseIncluded}
              translate={(i) => t(`enterprise.included.${i}`, values)}
            />
          </Card>
        </Reveal>
      </div>

      {/* The billing model is the surprise on this page, so it sits under both
          cards rather than in an FAQ answer nobody opens. */}
      <p className="mt-6 text-center text-sm text-secondary">{t('billing')}</p>
    </Section>
  )
}

function PlanHead({
  name,
  price,
  unit,
  limit,
}: {
  name: string
  price: string
  unit?: string
  limit: string
}) {
  /* One element, not a fragment: the card is a subgrid and every child takes a
     row, so a two-element head silently pushes the list under the button. */
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-heading text-sm font-semibold tracking-widest uppercase">{name}</p>
        <p className="text-sm text-secondary">{limit}</p>
      </div>
      <p className="mt-6 flex items-baseline gap-2">
        {/* A number carries the big type; "On request" is a sentence and at 5xl
            it wraps and shouts over the plan that has an actual price. */}
        <span
          className={cn(
            'font-heading font-semibold tracking-tight',
            unit ? 'text-5xl tabular-nums' : 'text-3xl',
          )}
        >
          {price}
        </span>
        {unit ? <span className="text-secondary">{unit}</span> : null}
      </p>
    </div>
  )
}

function FeatureList({
  items,
  translate,
}: {
  items: string[]
  translate: (index: string) => string
}) {
  /* content-start, or the shorter list stretches to fill its subgrid row and the
     four Enterprise lines drift apart to match nine Basic ones. */
  return (
    <ul className="mt-8 grid content-start gap-3 border-t border-secondary pt-8">
      {items.map((item, i) => (
        <li key={item} className="flex gap-3 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>{translate(i.toString())}</span>
        </li>
      ))}
    </ul>
  )
}
