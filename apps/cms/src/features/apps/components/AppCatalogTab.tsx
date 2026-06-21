import { MoreHorizontalIcon, PencilIcon, PlusIcon, RocketIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { AppEditorSheet } from '@/features/apps/components/AppEditorSheet'
import {
  useAdminApps,
  useDeleteApp,
  useSetAppVisibility,
} from '@/features/apps/hooks/useAdminApps'
import type { AdminApp } from '@/features/apps/types/app.types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

export function AppCatalogTab() {
  const { t } = useTranslation()
  const { data: apps = [], isLoading } = useAdminApps()
  const setVisibility = useSetAppVisibility()
  const deleteApp = useDeleteApp()

  const [editorApp, setEditorApp] = useState<AdminApp | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminApp | null>(null)

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-secondary text-sm">{t('apps.admin.description')}</p>
        <Button type="button" size="sm" onClick={openCreate}>
          <PlusIcon data-icon="inline-start" />
          {t('apps.admin.newApp')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <Empty className="min-h-48 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RocketIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>{t('apps.admin.empty.title')}</EmptyTitle>
            <EmptyDescription>{t('apps.admin.empty.description')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {apps.map((app) => (
            <div
              key={app.id}
              className="flex items-center gap-4 rounded-xl bg-panel p-3 ring-1 ring-quaternary"
            >
              <div
                className={cn(
                  'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br text-white',
                  app.accent.logo,
                )}
              >
                {app.iconUrl ? (
                  <img src={app.iconUrl} alt="" className="size-full object-cover" />
                ) : (
                  <RocketIcon className="size-5" />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-primary">{app.name}</p>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-medium',
                      app.status === 'published'
                        ? 'bg-success/10 text-success'
                        : 'bg-secondary/15 text-secondary',
                    )}
                  >
                    {t(`apps.admin.status.${app.status}`)}
                  </span>
                </div>
                <p className="truncate text-xs text-secondary">{app.slug}</p>
              </div>

              <label className="flex shrink-0 items-center gap-2 text-xs text-secondary">
                <span className="hidden sm:inline">{t('apps.admin.public')}</span>
                <Switch
                  checked={app.isPublic}
                  disabled={setVisibility.isPending}
                  onCheckedChange={(checked) => {
                    handleToggle(app, checked)
                  }}
                  aria-label={t('apps.admin.public')}
                />
              </label>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-secondary">
                    <MoreHorizontalIcon />
                    <span className="sr-only">{t('common.actions')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-auto min-w-40">
                  <DropdownMenuItem
                    onClick={() => {
                      openEdit(app)
                    }}
                  >
                    <PencilIcon />
                    {t('apps.admin.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="danger"
                    onClick={() => {
                      setDeleteTarget(app)
                    }}
                  >
                    <Trash2Icon />
                    {t('apps.admin.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

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
