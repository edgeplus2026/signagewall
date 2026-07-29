import { CalendarClock, LayoutGrid, Monitor, Palette, Smartphone, WifiOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { Card } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Section } from '@/components/ui/section'
import { Subtitle } from '@/components/ui/typography'
import { catalogApps } from '@/lib/apps'

/* Positional — keep in step with `home.features.items` in the message files.
   Phone, clock, grid, no-signal, screen, palette. */
const ICONS: LucideIcon[] = [Smartphone, CalendarClock, LayoutGrid, WifiOff, Monitor, Palette]

export async function Features() {
  const t = await getTranslations('home.features')
  /* Resolved through `t()` rather than used raw: one of these titles carries
     the {count} placeholder, and `t.raw` skips ICU interpolation entirely. */
  const items = (t.raw('items') as { title: string; body: string }[]).map((_, i) => ({
    title: t(`items.${i.toString()}.title`, { count: catalogApps.length }),
    body: t(`items.${i.toString()}.body`, { count: catalogApps.length }),
  }))

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
                <Subtitle className="mt-6">{item.title}</Subtitle>
                <p className="mt-3 text-sm text-secondary">{item.body}</p>
              </Card>
            </Reveal>
          )
        })}
      </div>
    </Section>
  )
}
