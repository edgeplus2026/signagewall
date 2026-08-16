import { DownloadIcon } from 'lucide-react'
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
  SettingsRow,
  SettingsSection,
} from '@/features/settings/components/SettingsSection'
import { useApplyPlayerUpdate } from '@/features/super-admin/hooks/useAdminUsers'
import { getApiErrorMessage } from '@/lib/api-error'

/**
 * Fleet-wide player controls. One action today, and it is deliberately the only
 * one here: everything else about a player belongs to the screen that owns it.
 *
 * This exists for the situation where a release turns out to be faulty and every
 * hour it stays out is an hour of broken screens. Without it the fleet applies an
 * update on its own schedule — at standby, at the nightly reload, or within six
 * hours at worst.
 */
export function PlayerSettingsTab() {
  const { t } = useTranslation()
  const applyUpdate = useApplyPlayerUpdate()
  const [open, setOpen] = useState(false)

  const onConfirm = async () => {
    try {
      await applyUpdate.mutateAsync()
      setOpen(false)
      toast.success(t('superAdmin.player.applyUpdate.success'))
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, t('superAdmin.player.applyUpdate.error')),
      )
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <SettingsSection title={t('superAdmin.player.title')}>
        <SettingsRow
          label={t('superAdmin.player.applyUpdate.title')}
          description={t('superAdmin.player.applyUpdate.rowDescription')}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setOpen(true)
            }}
            disabled={applyUpdate.isPending}
          >
            <DownloadIcon className="size-4" />
            {t('superAdmin.player.applyUpdate.button')}
          </Button>
        </SettingsRow>
      </SettingsSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {t('superAdmin.player.applyUpdate.confirmTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('superAdmin.player.applyUpdate.confirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
              }}
            >
              {t('superAdmin.player.applyUpdate.cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={applyUpdate.isPending}
              onClick={() => void onConfirm()}
            >
              {t('superAdmin.player.applyUpdate.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
