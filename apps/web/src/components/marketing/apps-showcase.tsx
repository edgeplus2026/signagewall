import {
  CalendarClock,
  CloudSun,
  Megaphone,
  Newspaper,
  Share2,
  TrendingUp,
  Utensils,
  Video,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { SectionHeader } from '@/components/marketing/section-header'
import { buttonVariants } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const ICONS: LucideIcon[] = [
  Utensils,
  CloudSun,
  TrendingUp,
  Newspaper,
  Share2,
  CalendarClock,
  Video,
  Megaphone,
]

export async function AppsShowcase() {
  const t = await getTranslations('home.apps')
  const categories = t.raw('categories') as string[]

  return (
    <Section>
      <SectionHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        subtitle={t('body')}
        action={
          <Link href="/apps" className={cn(buttonVariants())}>
            {t('cta')}
          </Link>
        }
      />

      {/* Hairline grid: one shared rule between cells, so the catalogue reads as
          a drawn index rather than as eight detached chips. */}
      <div className="mt-16 grid grid-cols-2 gap-px border border-secondary bg-rule sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c, i) => {
          const Icon = ICONS[i] ?? Megaphone
          return (
            <div
              key={c}
              className="group flex items-center gap-4 bg-page p-5 transition-colors hover:bg-panel"
            >
              <span className="flex size-9 shrink-0 items-center justify-center border border-secondary transition-colors group-hover:border-primary group-hover:bg-brand group-hover:text-brand-contrast">
                <Icon className="size-4" />
              </span>
              <span className="text-sm font-medium">{c}</span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
