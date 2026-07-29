import { getTranslations } from 'next-intl/server'

import { Section } from '@/components/ui/section'
import { formattedPrice, TRIAL_DAYS } from '@/lib/pricing'

/**
 * Replaces the old stat band.
 *
 * That band led with "25+ organizations" and "100+ screens online". Against
 * Yodeck's 65,000 companies and OptiSigns' 190,000 screens those numbers argue
 * for the competition — a small true number is worse than no number. These are
 * commitments instead, which are true on day one and do not shrink in
 * comparison with anyone.
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
