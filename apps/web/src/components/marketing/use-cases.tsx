import { Building2, Dumbbell, HeartPulse, Hotel, ShoppingBag, Utensils } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { SectionHeader } from '@/components/marketing/section-header'
import { Reveal } from '@/components/motion/reveal'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const ICONS: LucideIcon[] = [Utensils, ShoppingBag, Building2, HeartPulse, Hotel, Dumbbell]

export async function UseCases() {
  const t = await getTranslations('home.useCases')
  const items = t.raw('items') as { title: string; body: string }[]

  return (
    <Section tone="panel">
      <SectionHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Link href="/solutions" className={cn(buttonVariants({ variant: 'outline' }))}>
            {t('cta')}
          </Link>
        }
      />

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const Icon = ICONS[i] ?? Building2
          return (
            <Reveal key={item.title} delay={(i % 3) * 80}>
              <Card className="group h-full bg-page transition-colors hover:border-primary">
                <Icon className="size-6 text-secondary transition-colors group-hover:text-primary" />
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
