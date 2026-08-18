import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { AppEditorSheet } from '@/features/apps/components/AppEditorSheet'
import { AppIcon } from '@/features/apps/components/AppIcon'
import {
  useAdminApps,
  useDeleteApp,
  useSetAppVisibility,
} from '@/features/apps/hooks/useAdminApps'
import {
  APP_CATEGORIES,
  appCategorySlugs,
  categoryName,
} from '@/features/apps/lib/appCopy'
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
  const deleteApp = useDeleteApp()

  const [editorApp, setEditorApp] = useState<AdminApp | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminApp | null>(null)
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

  const openCreate = () => {
    setEditorApp(null)
    setEditorOpen(true)
  }

  const openEdit = (app: AdminApp) => {
    setEditorApp(app)
    setEditorOpen(true)
  }

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

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteApp.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('apps.admin.deleted'))
        setDeleteTarget(null)
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, t('apps.admin.deleteError')))
      },
    })
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
              <p className="truncate text-sm font-medium text-primary">{row.original.name}</p>
              <p className="truncate text-xs text-secondary">{row.original.slug}</p>
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
          const names = appCategorySlugs(row.original.slug).map((slug) =>
            categoryName(t, slug),
          )
          return names.length > 0 ? (
            <span className="text-sm text-secondary">{names.join(', ')}</span>
          ) : (
            <span className="text-sm text-tertiary">{t('apps.categories.uncategorized')}</span>
          )
        },
      },
      {
        accessorKey: 'installCount',
        meta: { width: '12%' },
        header: () => t('apps.admin.columns.installs'),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-primary">{row.original.installCount}</span>
        ),
      },
      {
        accessorKey: 'isPublic',
        sortingFn: (a, b) => Number(a.original.isPublic) - Number(b.original.isPublic),
        meta: { width: '14%' },
        header: () => t('apps.admin.columns.public'),
        cell: ({ row }) => (
          <label
            className="flex w-fit items-center"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <Switch
              checked={row.original.isPublic}
              disabled={setVisibility.isPending}
              onCheckedChange={(checked) => {
                handleToggle(row.original, checked)
              }}
              aria-label={t('apps.admin.public')}
            />
          </label>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        meta: { align: 'right', width: '10%' },
        header: () => <span className="sr-only">{t('common.actions')}</span>,
        cell: ({ row }) => (
          <div
            className="flex justify-end"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="text-secondary">
                  <MoreHorizontalIcon />
                  <span className="sr-only">{t('common.actions')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto min-w-40">
                <DropdownMenuItem
                  onClick={() => {
                    openEdit(row.original)
                  }}
                >
                  <PencilIcon />
                  {t('apps.admin.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="danger"
                  onClick={() => {
                    setDeleteTarget(row.original)
                  }}
                >
                  <Trash2Icon />
                  {t('apps.admin.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setState setters + stable mutate are referentially stable
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
        onRowClick={openEdit}
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
            <Button type="button" size="sm" onClick={openCreate}>
              <PlusIcon data-icon="inline-start" />
              {t('apps.admin.newApp')}
            </Button>
          </div>
        }
      />

      <AppEditorSheet app={editorApp} open={editorOpen} onOpenChange={setEditorOpen} />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('apps.admin.deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('apps.admin.deleteDialog.description', { name: deleteTarget?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="danger" disabled={deleteApp.isPending} onClick={confirmDelete}>
              {t('apps.admin.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
