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

interface ApplyDeviceUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}

/**
 * Confirms installing a pending player update on this one screen.
 *
 * It asks first because the display goes dark for the restart, and a signage
 * screen is usually in front of customers when an operator clicks this.
 */
export function ApplyDeviceUpdateDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ApplyDeviceUpdateDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('screens.device.applyUpdate.title')}</DialogTitle>
          <DialogDescription>
            {t('screens.device.applyUpdate.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t('screens.device.applyUpdate.cancel')}
          </Button>
          <Button disabled={isPending} onClick={onConfirm}>
            {t('screens.device.applyUpdate.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
