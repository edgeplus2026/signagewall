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
import { useDeleteInstance } from '@/features/apps/hooks/useApps'
import type { AppInstance } from '@/features/apps/types/app.types'
import { getApiErrorMessage } from '@/lib/api-error'

interface DeleteInstanceDialogProps {
  instance: AppInstance | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteInstanceDialog({
  instance,
  open,
  onOpenChange,
  onDeleted,
}: DeleteInstanceDialogProps) {
  const { t } = useTranslation()
  const deleteInstance = useDeleteInstance()

  const handleDelete = () => {
    if (!instance) return
    deleteInstance.mutate(instance.id, {
      onSuccess: () => {
        toast.success(t('apps.instances.delete.success'))
        onOpenChange(false)
        onDeleted?.()
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, t('apps.instances.delete.error')))
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('apps.instances.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('apps.instances.delete.description', { name: instance?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={deleteInstance.isPending}
            onClick={handleDelete}
          >
            {t('apps.instances.delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
