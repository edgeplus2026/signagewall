import { useState } from 'react'
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
import { useImpersonateUser } from '@/features/super-admin/hooks/useImpersonateUser'
import type { AdminUserListItem } from '@/features/super-admin/types/admin.types'

interface SwitchUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUserListItem | null
}

export function SwitchUserDialog({ open, onOpenChange, user }: SwitchUserDialogProps) {
  const { t } = useTranslation()
  const { impersonate } = useImpersonateUser()
  const [isPending, setIsPending] = useState(false)

  const handleConfirm = async () => {
    if (!user) return

    setIsPending(true)

    try {
      await impersonate(user.id)
      onOpenChange(false)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('superAdmin.switch.title')}</DialogTitle>
          <DialogDescription>
            {t('superAdmin.switch.description', {
              name: user?.name,
              email: user?.email,
            })}
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
          <Button disabled={isPending} onClick={() => void handleConfirm()}>
            {t('superAdmin.switch.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
