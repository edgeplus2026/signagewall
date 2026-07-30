import { getTranslations } from 'next-intl/server'

import { Section } from '@/components/ui/section'
import { formattedPrice, TRIAL_DAYS } from '@/lib/pricing'

/**
 * The band under the hero: the free trial, then what is actually running.
 *
 * These numbers are counted, not aspirational — keep them that way. The band
 * briefly carried commitments instead ("no contract", "works offline") because
 * the counts were too small to help; they are worth showing now, and the same
 * test applies next time: a number goes here only while it argues for us.
 */
export async function TrustStrip({ locale }: { locale: string }) {
  const t = await getTranslations('home.trust')
  const values = { price: formattedPrice(locale), trialDays: TRIAL_DAYS }
  const items = (t.raw('items') as { value: string; label: string }[]).map((_, i) => ({
    value: t(`items.${i.toString()}.value`, values),
    label: t(`items.${i.toString()}.label`, values),
  }))

  return (
    <Section tone="panel" innerClassName="grid grid-cols-2 gap-10 py-14 md:grid-cols-4 md:py-16">
      {items.map((item) => (
        <div key={item.label} className="flex h-full flex-col items-center text-center">
          <p className="font-heading text-2xl leading-tight font-semibold tracking-tight text-balance md:text-3xl">
            {item.value}
          </p>
          <p className="mt-auto pt-3 text-sm text-balance text-secondary">{item.label}</p>
        </div>
      ))}
    </Section>
  )
}
