import {
  ArrowDownAZIcon,
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
  LayoutGridIcon,
  ListIcon,
  MonitorIcon,
  WifiIcon,
} from 'lucide-react'
import { useCallback, useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { mediaGridClassName } from '@/features/media/lib/mediaActionCardStyles'
import { DeleteScreenDialog } from '@/features/screens/components/DeleteScreenDialog'
import { ScreensBulkActionsBar } from '@/features/screens/components/ScreensBulkActionsBar'
import { ScreensGrid } from '@/features/screens/components/ScreensGrid'
import { ScreensTable } from '@/features/screens/components/ScreensTable'
import { PresenceContext } from '@/features/screens/providers/presenceContext'
import type {
  ScreenManageTab,
  ScreenSortDirection,
  ScreenSortField,
  ScreenStatusFilter,
  ScreenSummary,
} from '@/features/screens/types/screen.types'
import { useViewMode } from '@/hooks/useViewMode'

function ScreensGridSkeleton() {
  return (
    <div className={mediaGridClassName}>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

function ScreensTableSkeleton() {
  return <Skeleton className="h-64 w-full rounded-xl" />
}

interface ScreensBrowserProps {
  screens: ScreenSummary[]
  isLoading: boolean
  onCreateClick: () => void
}

export function ScreensBrowser({ screens, isLoading, onCreateClick }: ScreensBrowserProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<ScreenSortField>('name')
  const [sortDirection, setSortDirection] = useState<ScreenSortDirection>('asc')
  const [statusFilter, setStatusFilter] = useState<ScreenStatusFilter>('all')
  const [viewMode, setViewMode] = useViewMode('screens')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteIds, setDeleteIds] = useState<string[]>([])

  const presence = useContext(PresenceContext)
  const isOnline = useCallback(
    (screenId: string) => presence[screenId]?.online === true,
    [presence],
  )

  const filteredScreens = useMemo(() => {
    const query = search.trim().toLowerCase()
    let matched = query
      ? screens.filter((screen) => screen.name.toLowerCase().includes(query))
      : screens

    if (statusFilter !== 'all') {
      matched = matched.filter((screen) =>
        statusFilter === 'online' ? isOnline(screen.id) : !isOnline(screen.id),
      )
    }

    const direction = sortDirection === 'asc' ? 1 : -1
    return [...matched].sort((a, b) => {
      let comparison: number
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy === 'createdAt') {
        comparison = a.createdAt.localeCompare(b.createdAt)
      } else {
        // status: online screens first when ascending.
        comparison = Number(isOnline(b.id)) - Number(isOnline(a.id))
      }
      return comparison * direction
    })
  }, [screens, search, statusFilter, sortBy, sortDirection, isOnline])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedIds(new Set(filteredScreens.map((screen) => screen.id)))
      } else {
        clearSelection()
      }
    },
    [clearSelection, filteredScreens],
  )

  const openScreen = useCallback(
    (screen: ScreenSummary, tab: ScreenManageTab = 'content') => {
      const path =
        tab === 'settings' ? `/screens/${screen.id}?tab=settings` : `/screens/${screen.id}`
      void navigate(path)
    },
    [navigate],
  )

  const hasActiveSearch = search.trim().length > 0

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
            placeholder={t('screens.search')}
            className="h-8 w-full sm:max-w-xs"
          />

          <TooltipProvider delayDuration={300}>
            <div className="flex min-w-0 flex-wrap items-center gap-2 self-end sm:shrink-0 sm:justify-end sm:self-auto">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as ScreenStatusFilter)
                }}
              >
                <SelectTrigger size="default" className="h-8 w-28">
                  <WifiIcon className="text-secondary size-3.5" />
                  <SelectValue placeholder={t('screens.filter.label')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('screens.filter.all')}</SelectItem>
                  <SelectItem value="online">{t('screens.filter.online')}</SelectItem>
                  <SelectItem value="offline">{t('screens.filter.offline')}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value as ScreenSortField)
                }}
              >
                <SelectTrigger size="default" className="h-8 w-28">
                  <ArrowDownAZIcon className="text-secondary size-3.5" />
                  <SelectValue placeholder={t('screens.sort.label')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{t('screens.sort.name')}</SelectItem>
                  <SelectItem value="createdAt">{t('screens.sort.createdAt')}</SelectItem>
                  <SelectItem value="status">{t('screens.sort.status')}</SelectItem>
                </SelectContent>
              </Select>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-8 shrink-0"
                    aria-label={
                      sortDirection === 'asc' ? t('screens.sort.asc') : t('screens.sort.desc')
                    }
                    onClick={() => {
                      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
                    }}
                  >
                    {sortDirection === 'asc' ? (
                      <ArrowUpNarrowWideIcon />
                    ) : (
                      <ArrowDownWideNarrowIcon />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {sortDirection === 'asc' ? t('screens.sort.asc') : t('screens.sort.desc')}
                </TooltipContent>
              </Tooltip>

              <div
                aria-hidden
                className="bg-quaternary hidden h-8 w-px shrink-0 self-center sm:block"
              />

              <div className="border-secondary flex h-8 shrink-0 items-center rounded-lg border p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon-sm"
                      className="size-7 shrink-0"
                      aria-label={t('screens.view.grid')}
                      aria-pressed={viewMode === 'grid'}
                      onClick={() => {
                        setViewMode('grid')
                      }}
                    >
                      <LayoutGridIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('screens.view.grid')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon-sm"
                      className="size-7 shrink-0"
                      aria-label={t('screens.view.list')}
                      aria-pressed={viewMode === 'list'}
                      onClick={() => {
                        setViewMode('list')
                      }}
                    >
                      <ListIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('screens.view.list')}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </div>

        <ScreensBulkActionsBar
          selectedCount={selectedIds.size}
          onDelete={() => {
            setDeleteIds(Array.from(selectedIds))
          }}
          onClear={clearSelection}
        />

        {isLoading ? (
          viewMode === 'grid' ? (
            <ScreensGridSkeleton />
          ) : (
            <ScreensTableSkeleton />
          )
        ) : filteredScreens.length === 0 ? (
          <Empty className="min-h-48 py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MonitorIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle>
                {hasActiveSearch ? t('screens.emptySearch') : t('screens.empty')}
              </EmptyTitle>
              <EmptyDescription>
                {hasActiveSearch
                  ? t('screens.emptySearchDescription')
                  : t('screens.emptyDescription')}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {hasActiveSearch ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                  }}
                >
                  {t('screens.emptyClearSearch')}
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={onCreateClick}>
                  <MonitorIcon data-icon="inline-start" />
                  {t('screens.create.button')}
                </Button>
              )}
            </EmptyContent>
          </Empty>
        ) : viewMode === 'grid' ? (
          <ScreensGrid
            screens={filteredScreens}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onOpen={openScreen}
            onDelete={setDeleteIds}
            onCreate={onCreateClick}
          />
        ) : (
          <ScreensTable
            screens={filteredScreens}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onOpen={openScreen}
            onDelete={setDeleteIds}
          />
        )}
      </div>

      <DeleteScreenDialog
        open={deleteIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setDeleteIds([])
        }}
        screenIds={deleteIds}
        onSuccess={clearSelection}
      />
    </>
  )
}
