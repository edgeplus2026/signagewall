import { CalendarClock, LayoutGrid, Monitor, Palette, Rss, WifiOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { Card } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Section } from '@/components/ui/section'

const ICONS: LucideIcon[] = [Rss, CalendarClock, LayoutGrid, WifiOff, Monitor, Palette]

export async function Features() {
  const t = await getTranslations('home.features')
  const items = t.raw('items') as { title: string; body: string }[]

  return (
    <Section>
      <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const Icon = ICONS[i] ?? LayoutGrid
          return (
            <Reveal key={item.title} delay={(i % 3) * 80}>
              <Card className="h-full">
                <IconBadge>
                  <Icon />
                </IconBadge>
                <p className="mt-6 font-heading text-lg font-semibold tracking-tight text-balance">
                  {item.title}
                </p>
                <p className="mt-3 text-sm text-secondary">{item.body}</p>
              </Card>
            </Reveal>
          )
        })}
      </div>
    </Section>
  )
}
