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

interface UnpairDeviceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}

/** Confirms detaching the physical display from this screen before unpairing. */
export function UnpairDeviceDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: UnpairDeviceDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('screens.device.unpair.title')}</DialogTitle>
          <DialogDescription>
            {t('screens.device.unpair.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t('screens.device.unpair.cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={isPending}
            onClick={onConfirm}
          >
            {t('screens.device.unpair.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
