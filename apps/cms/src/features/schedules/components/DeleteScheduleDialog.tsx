import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduleName?: string | undefined
  onConfirm: () => void
  isPending: boolean
}

export function DeleteScheduleDialog({
  open,
  onOpenChange,
  scheduleName,
  onConfirm,
  isPending,
}: DeleteScheduleDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('schedules.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('schedules.delete.description', { name: scheduleName ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="danger" disabled={isPending} onClick={onConfirm}>
            {t('schedules.delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
