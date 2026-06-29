import { LayersIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
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
import { CategoryEditorSheet } from '@/features/apps/components/CategoryEditorSheet'
import {
  useAdminCategories,
  useDeleteCategory,
} from '@/features/apps/hooks/useAdminCategories'
import type { AppCategory } from '@/features/apps/types/app.types'
import { getApiErrorMessage } from '@/lib/api-error'

export function CategoryManageTab() {
  const { t } = useTranslation()
  const { data: categories = [], isLoading } = useAdminCategories()
  const deleteCategory = useDeleteCategory()

  const [editorCategory, setEditorCategory] = useState<AppCategory | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AppCategory | null>(null)

  const openCreate = () => {
    setEditorCategory(null)
    setEditorOpen(true)
  }

  const openEdit = (category: AppCategory) => {
    setEditorCategory(category)
    setEditorOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteCategory.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('apps.categories.deleted'))
        setDeleteTarget(null)
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, t('apps.categories.deleteError')))
      },
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-secondary text-sm">{t('apps.categories.description')}</p>
        <Button type="button" size="sm" onClick={openCreate}>
          <PlusIcon data-icon="inline-start" />
          {t('apps.categories.newCategory')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Empty className="min-h-48 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayersIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>{t('apps.categories.empty.title')}</EmptyTitle>
            <EmptyDescription>{t('apps.categories.empty.description')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-4 rounded-xl bg-panel p-3 ring-1 ring-quaternary"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-medium text-primary">{category.name}</p>
                <p className="truncate text-xs text-secondary">{category.slug}</p>
              </div>

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
                      openEdit(category)
                    }}
                  >
                    <PencilIcon />
                    {t('apps.categories.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="danger"
                    onClick={() => {
                      setDeleteTarget(category)
                    }}
                  >
                    <Trash2Icon />
                    {t('apps.categories.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <CategoryEditorSheet
        category={editorCategory}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('apps.categories.deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('apps.categories.deleteDialog.description', {
                name: deleteTarget?.name ?? '',
              })}
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
            <Button
              variant="danger"
              disabled={deleteCategory.isPending}
              onClick={confirmDelete}
            >
              {t('apps.categories.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
