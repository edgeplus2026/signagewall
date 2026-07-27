import { getTranslations } from 'next-intl/server'

import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'

export async function HowItWorks() {
  const t = await getTranslations('home.steps')
  const items = t.raw('items') as { title: string; body: string }[]

  return (
    <Section>
      <SectionHeader eyebrow={t('eyebrow')} title={t('title')} />

      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 80}>
            <Card className="h-full">
              <span className="font-heading text-5xl leading-none font-semibold tracking-tight text-primary/25 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="mt-8 font-heading text-lg font-semibold tracking-tight text-balance">
                {item.title}
              </p>
              <p className="mt-3 text-sm text-secondary">{item.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
