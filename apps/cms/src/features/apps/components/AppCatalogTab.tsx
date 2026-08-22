import { type ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Combobox } from '@/components/ui/combobox'
import { DataTable } from '@/components/ui/data-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { AppIcon } from '@/features/apps/components/AppIcon'
import { useAdminApps, useSetAppVisibility } from '@/features/apps/hooks/useAdminApps'
import { APP_CATEGORIES, appCategorySlugs, categoryName } from '@/features/apps/lib/appCopy'
import type { AdminApp } from '@/features/apps/types/app.types'
import { getApiErrorMessage } from '@/lib/api-error'

const ALL_CATEGORIES = 'all'
const ALL_VISIBILITY = 'all'
const PUBLIC_ONLY = 'public'
const INVISIBLE_ONLY = 'invisible'

export function AppCatalogTab() {
  const { t } = useTranslation()
  const { data: apps = [], isLoading } = useAdminApps()
  const setVisibility = useSetAppVisibility()

  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES)
  const [visibilityFilter, setVisibilityFilter] = useState<string>(ALL_VISIBILITY)

  const visibleApps = useMemo(() => {
    return apps.filter((app) => {
      if (categoryId !== ALL_CATEGORIES && !appCategorySlugs(app.slug).includes(categoryId)) {
        return false
      }
      if (visibilityFilter === PUBLIC_ONLY) return app.isPublic
      if (visibilityFilter === INVISIBLE_ONLY) return !app.isPublic
      return true
    })
  }, [apps, categoryId, visibilityFilter])

  const handleToggle = (app: AdminApp, isPublic: boolean) => {
    setVisibility.mutate(
      { id: app.id, isPublic },
      {
        onError: (error) => {
          toast.error(getApiErrorMessage(error, t('apps.admin.visibilityError')))
        },
      },
    )
  }

  const columns = useMemo<ColumnDef<AdminApp>[]>(
    () => [
      {
        accessorKey: 'name',
        meta: { width: '36%' },
        header: () => t('apps.admin.columns.name'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <AppIcon
              iconSvg={row.original.iconSvg}
              color={row.original.color}
              className="size-9 shrink-0 rounded-lg"
            />
            <div className="min-w-0">
              <p className="text-primary truncate text-sm font-medium">{row.original.name}</p>
              <p className="text-secondary truncate text-xs">{row.original.slug}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'category',
        enableSorting: false,
        meta: { width: '26%' },
        header: () => t('apps.admin.columns.category'),
        cell: ({ row }) => {
          const names = appCategorySlugs(row.original.slug).map((slug) => categoryName(t, slug))
          return names.length > 0 ? (
            <span className="text-secondary text-sm">{names.join(', ')}</span>
          ) : (
            <span className="text-tertiary text-sm">{t('apps.categories.uncategorized')}</span>
          )
        },
      },
      {
        accessorKey: 'installCount',
        meta: { width: '12%' },
        header: () => t('apps.admin.columns.installs'),
        cell: ({ row }) => (
          <span className="text-primary text-sm tabular-nums">{row.original.installCount}</span>
        ),
      },
      {
        accessorKey: 'isPublic',
        sortingFn: (a, b) => Number(a.original.isPublic) - Number(b.original.isPublic),
        meta: { width: '24%' },
        header: () => t('apps.admin.columns.public'),
        cell: ({ row }) => (
          <Switch
            checked={row.original.isPublic}
            disabled={setVisibility.isPending}
            onCheckedChange={(checked) => {
              handleToggle(row.original, checked)
            }}
            aria-label={t('apps.admin.public')}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable mutate wrapper
    [t, setVisibility.isPending],
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-secondary text-sm">{t('apps.admin.description')}</p>

      <DataTable
        columns={columns}
        data={visibleApps}
        searchPlaceholder={t('apps.search')}
        emptyMessage={t('apps.admin.empty.title')}
        toolbar={
          <div className="flex items-center gap-2">
            <Combobox
              value={categoryId}
              onChange={setCategoryId}
              options={[
                { label: t('apps.categories.filter.all'), value: ALL_CATEGORIES },
                ...[...APP_CATEGORIES]
                  .sort((a, b) => a.order - b.order)
                  .map((category) => ({
                    label: categoryName(t, category.slug),
                    value: category.slug,
                  })),
              ]}
              searchPlaceholder={t('apps.categories.filter.searchPlaceholder')}
              emptyLabel={t('apps.categories.uncategorized')}
              aria-label={t('apps.categories.filter.all')}
              className="w-44"
            />
            <Combobox
              value={visibilityFilter}
              onChange={setVisibilityFilter}
              options={[
                { label: t('apps.admin.visibilityFilter.all'), value: ALL_VISIBILITY },
                { label: t('apps.admin.visibilityFilter.public'), value: PUBLIC_ONLY },
                { label: t('apps.admin.visibilityFilter.invisible'), value: INVISIBLE_ONLY },
              ]}
              aria-label={t('apps.admin.columns.public')}
              className="w-36"
            />
          </div>
        }
      />
    </div>
  )
}
