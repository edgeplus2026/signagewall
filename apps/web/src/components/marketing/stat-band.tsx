import { getTranslations } from 'next-intl/server'

import { Section } from '@/components/ui/section'

export async function StatBand() {
  const t = await getTranslations('home.stats')
  const items = t.raw('items') as { value: string; label: string }[]

  return (
    <Section tone="panel" innerClassName="grid grid-cols-2 gap-10 py-14 md:grid-cols-4 md:py-16">
      {items.map((s) => (
        /* Values are words as often as numbers, so a wrapping one must not drag
           its label out of line with the rest — the labels bottom-align. */
        <div key={s.label} className="flex h-full flex-col">
          <p className="font-heading text-3xl leading-tight font-semibold tracking-tight text-balance tabular-nums md:text-4xl">
            {s.value}
          </p>
          <p className="mt-4 text-sm text-secondary">{s.label}</p>
        </div>
      ))}
    </Section>
  )
}
