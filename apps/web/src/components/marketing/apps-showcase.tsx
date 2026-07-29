import { ArrowUpRight, LayoutGrid } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { CategoryIcon } from '@/components/apps/category-icon'
import { SectionHeader } from '@/components/marketing/section-header'
import { buttonVariants } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { Link } from '@/i18n/navigation'
import { catalogApps, categoriesForApp, orderedCategories } from '@/lib/apps'
import { cn } from '@/lib/utils'

export async function AppsShowcase() {
  const t = await getTranslations('home.apps')
  const tCatNames = await getTranslations('categories')

  /* The taxonomy is the one in @signagewall/apps — the same registry /apps groups by,
     so a category added there shows up here without anyone editing a second
     list that would otherwise drift out of sync with the catalogue. */
  const categories = orderedCategories().map((c) => ({
    slug: c.slug,
    name: tCatNames(c.slug),
    count: catalogApps.filter((m) => categoriesForApp(m.slug).includes(c.slug)).length,
  }))

  return (
    <Section>
      <SectionHeader
        eyebrow={t('eyebrow')}
        title={t('title', { count: catalogApps.length })}
        subtitle={t('body')}
        action={
          <Link href="/apps" className={cn(buttonVariants())}>
            {t('cta')}
          </Link>
        }
      />

      {/* Hairline grid: one shared rule between cells, so the catalogue reads as
          a drawn index rather than as detached chips. The trailing "all apps"
          cell is also what keeps the last row full — an empty cell here shows up
          as a grey box, the rule colour coming through from behind. */}
      <div className="mt-16 grid grid-cols-2 gap-px border border-secondary bg-rule sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={{ pathname: '/apps', hash: `#${c.slug}` }}
            className="group flex items-center gap-4 bg-page p-5 transition-colors hover:bg-panel"
          >
            <span className="flex size-9 shrink-0 items-center justify-center border border-secondary transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-accent-contrast">
              <CategoryIcon slug={c.slug} className="size-4" />
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium">{c.name}</span>
            <span className="text-xs text-secondary tabular-nums">{c.count}</span>
            <ArrowUpRight className="size-4 shrink-0 text-secondary transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
          </Link>
        ))}

        <Link
          href="/apps"
          className="group flex items-center gap-4 bg-panel p-5 transition-colors hover:bg-accent hover:text-accent-contrast"
        >
          <span className="group-hover:border-accent-contrast flex size-9 shrink-0 items-center justify-center border border-secondary transition-colors">
            <LayoutGrid className="size-4" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium">{t('all')}</span>
          <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </Section>
  )
}
