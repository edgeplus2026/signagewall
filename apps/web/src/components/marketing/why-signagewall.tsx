import { getTranslations } from 'next-intl/server'

import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { Subtitle } from '@/components/ui/typography'
import { formattedPrice } from '@/lib/pricing'

/**
 * The differentiation section the page never had.
 *
 * Everything above this point describes what the product does — which every
 * competitor also does. This is the only section that answers "why you and not
 * Yodeck", and it does it with the four things that are actually different
 * rather than with adjectives.
 */
export async function WhySignageWall({ locale }: { locale: string }) {
  const t = await getTranslations('home.why')
  const values = { price: formattedPrice(locale) }
  const items = (t.raw('items') as { title: string; body: string }[]).map((_, i) => ({
    title: t(`items.${i.toString()}.title`, values),
    body: t(`items.${i.toString()}.body`, values),
  }))

  return (
    <Section>
      <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <div className="mt-16 grid gap-6 sm:grid-cols-2">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={(i % 2) * 80}>
            <Card className="h-full border-t-2 border-t-accent">
              <Subtitle>{item.title}</Subtitle>
              <p className="mt-3 text-sm text-secondary">{item.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
