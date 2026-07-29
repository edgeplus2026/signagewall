import { getTranslations } from 'next-intl/server'

import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { StepNumber } from '@/components/ui/step-number'
import { Subtitle } from '@/components/ui/typography'

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
              <StepNumber index={i} />
              <Subtitle className="mt-8">{item.title}</Subtitle>
              <p className="mt-3 text-sm text-secondary">{item.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
