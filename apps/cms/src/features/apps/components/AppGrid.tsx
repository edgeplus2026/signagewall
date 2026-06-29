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
import { Skeleton } from '@/components/ui/skeleton'
import { AppCard } from '@/features/apps/components/AppCard'
import { useCategories } from '@/features/apps/hooks/useCategories'
import type { AppCategory, EdgeApp } from '@/features/apps/types/app.types'

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
        <Skeleton className="size-14 rounded-2xl" />
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

/** Group apps into ordered category sections; an app shown under each of its categories. */
function buildSections(
  apps: EdgeApp[],
  categories: AppCategory[],
  uncategorizedTitle: string,
): AppSection[] {
  const ordered = [...categories].sort((a, b) => a.order - b.order)
  const sections: AppSection[] = []

  for (const category of ordered) {
    const inCategory = apps.filter((app) => app.categoryIds.includes(category.id))
    if (inCategory.length > 0) {
      sections.push({ id: category.id, title: category.name, apps: inCategory })
    }
  }

  const knownIds = new Set(categories.map((category) => category.id))
  const uncategorized = apps.filter(
    (app) => !app.categoryIds.some((id) => knownIds.has(id)),
  )
  if (uncategorized.length > 0) {
    sections.push({ id: UNCATEGORIZED, title: uncategorizedTitle, apps: uncategorized })
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
  const { data: categories = [] } = useCategories()

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (query.length === 0) return apps
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(query) ||
        app.tagline.toLowerCase().includes(query),
    )
  }, [apps, search])

  const sections = useMemo(
    () => buildSections(filtered, categories, t('apps.categories.uncategorized')),
    [filtered, categories, t],
  )

  const hasActiveFilters = search.trim().length > 0

  const clearFilters = () => {
    setSearch('')
  }

  return (
    <div className="flex flex-col gap-6">
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
