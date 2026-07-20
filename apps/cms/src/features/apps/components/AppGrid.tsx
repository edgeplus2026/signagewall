import type { TFunction } from 'i18next'
import { RocketIcon, SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AppCard } from '@/features/apps/components/AppCard'
import {
  APP_CATEGORIES,
  appCategorySlugs,
  appTagline,
  categoryName,
} from '@/features/apps/lib/appCopy'
import type { EdgeApp } from '@/features/apps/types/app.types'

type InstallFilter = 'all' | 'installed' | 'not-installed'

interface AppGridProps {
  apps: EdgeApp[]
  isLoading?: boolean
  emptyTitle: string
  emptyDescription: string
  onShowDetails: (app: EdgeApp) => void
  onRequestUninstall: (app: EdgeApp) => void
}

const UNCATEGORIZED = '__uncategorized__'

interface AppSection {
  /** Category id, or UNCATEGORIZED for apps without one. */
  id: string
  title: string
  apps: EdgeApp[]
}

function AppCardSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-panel p-5 ring-1 ring-quaternary">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="size-12 rounded-2xl" />
        <Skeleton className="size-7 rounded-md" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-1/2 rounded-md" />
        <Skeleton className="h-3 w-4/5 rounded-md" />
        <Skeleton className="h-3 w-3/5 rounded-md" />
      </div>
    </div>
  )
}

/**
 * Group apps into ordered category sections from the code registry; an app is
 * shown under each category it belongs to. Category names come from i18n.
 */
function buildSections(apps: EdgeApp[], t: TFunction): AppSection[] {
  const ordered = [...APP_CATEGORIES].sort((a, b) => a.order - b.order)
  const sections: AppSection[] = []

  for (const category of ordered) {
    const inCategory = apps.filter((app) =>
      appCategorySlugs(app.slug).includes(category.slug),
    )
    if (inCategory.length > 0) {
      sections.push({
        id: category.slug,
        title: categoryName(t, category.slug),
        apps: inCategory,
      })
    }
  }

  const uncategorized = apps.filter((app) => appCategorySlugs(app.slug).length === 0)
  if (uncategorized.length > 0) {
    sections.push({
      id: UNCATEGORIZED,
      title: t('apps.categories.uncategorized'),
      apps: uncategorized,
    })
  }

  return sections
}

export function AppGrid({
  apps,
  isLoading = false,
  emptyTitle,
  emptyDescription,
  onShowDetails,
  onRequestUninstall,
}: AppGridProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [installFilter, setInstallFilter] = useState<InstallFilter>('all')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return apps.filter((app) => {
      if (installFilter === 'installed' && !app.isInstalled) return false
      if (installFilter === 'not-installed' && app.isInstalled) return false
      if (query.length === 0) return true
      return (
        app.name.toLowerCase().includes(query) ||
        appTagline(t, app.slug).toLowerCase().includes(query)
      )
    })
  }, [apps, search, installFilter, t])

  const sections = useMemo(() => buildSections(filtered, t), [filtered, t])

  const hasActiveFilters = search.trim().length > 0 || installFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setInstallFilter('all')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
            placeholder={t('apps.search')}
            className="pl-9"
          />
        </div>
        <Select
          value={installFilter}
          onValueChange={(value) => {
            setInstallFilter(value as InstallFilter)
          }}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label={t('apps.filter.label')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('apps.filter.all')}</SelectItem>
            <SelectItem value="installed">{t('apps.filter.installed')}</SelectItem>
            <SelectItem value="not-installed">{t('apps.filter.notInstalled')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-8">
          {Array.from({ length: 2 }).map((_, sectionIndex) => (
            <div key={sectionIndex} className="flex flex-col gap-4">
              <Skeleton className="h-5 w-32 rounded-md" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <AppCardSkeleton key={index} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : sections.length === 0 ? (
        <Empty className="min-h-48 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RocketIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
          {hasActiveFilters ? (
            <EmptyContent>
              <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                {t('apps.empty.clearFilters')}
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.id} className="flex flex-col gap-4">
              <h2 className="text-primary text-sm font-semibold tracking-tight">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {section.apps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    onShowDetails={onShowDetails}
                    onRequestUninstall={onRequestUninstall}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
