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
import { useUninstallApp } from '@/features/apps/hooks/useApps'
import type { CatalogApp } from '@/features/apps/types/app.types'
import { getApiErrorMessage } from '@/lib/api-error'

interface UninstallAppDialogProps {
  app: CatalogApp | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUninstalled?: () => void
}

export function UninstallAppDialog({
  app,
  open,
  onOpenChange,
  onUninstalled,
}: UninstallAppDialogProps) {
  const { t } = useTranslation()
  const uninstallApp = useUninstallApp()

  const handleUninstall = () => {
    if (!app) return
    uninstallApp.mutate(app.id, {
      onSuccess: () => {
        toast.success(t('apps.uninstall.success', { name: app.name }))
        onOpenChange(false)
        onUninstalled?.()
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, t('apps.uninstall.error')))
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('apps.uninstall.title')}</DialogTitle>
          <DialogDescription>
            {t('apps.uninstall.description', { name: app?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t('apps.uninstall.cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={uninstallApp.isPending}
            onClick={handleUninstall}
          >
            {t('apps.uninstall.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
