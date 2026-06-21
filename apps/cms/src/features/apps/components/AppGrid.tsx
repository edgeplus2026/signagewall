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
import type { EdgeApp } from '@/features/apps/types/app.types'

interface AppGridProps {
  apps: EdgeApp[]
  isLoading?: boolean
  emptyTitle: string
  emptyDescription: string
  onShowDetails: (app: EdgeApp) => void
  onRequestUninstall: (app: EdgeApp) => void
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (query.length === 0) return apps
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(query) ||
        app.tagline.toLowerCase().includes(query),
    )
  }, [apps, search])

  const hasActiveSearch = search.trim().length > 0

  return (
    <div className="flex flex-col gap-5">
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty className="min-h-48 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RocketIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
          {hasActiveSearch ? (
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('')
                }}
              >
                {t('apps.empty.clearFilters')}
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onShowDetails={onShowDetails}
              onRequestUninstall={onRequestUninstall}
            />
          ))}
        </div>
      )}
    </div>
  )
}
