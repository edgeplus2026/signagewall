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
  useDemoteSuperAdmin,
  usePromoteSuperAdmin,
} from '@/features/super-admin/hooks/useAdminUsers'
import type { AdminUserListItem } from '@/features/super-admin/types/admin.types'
import { getApiErrorMessage } from '@/lib/api-error'

export type SuperAdminRoleAction = 'promote' | 'demote'

interface PromoteSuperAdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUserListItem | null
  action: SuperAdminRoleAction
}

export function PromoteSuperAdminDialog({
  open,
  onOpenChange,
  user,
  action,
}: PromoteSuperAdminDialogProps) {
  const { t } = useTranslation()
  const promoteSuperAdmin = usePromoteSuperAdmin()
  const demoteSuperAdmin = useDemoteSuperAdmin()
  const isPending = promoteSuperAdmin.isPending || demoteSuperAdmin.isPending

  const handleConfirm = async () => {
    if (!user) return

    try {
      if (action === 'promote') {
        await promoteSuperAdmin.mutateAsync(user.id)
        toast.success(t('superAdmin.promote.success', { name: user.name }))
      } else {
        await demoteSuperAdmin.mutateAsync(user.id)
        toast.success(t('superAdmin.demote.success', { name: user.name }))
      }

      onOpenChange(false)
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          action === 'promote'
            ? t('superAdmin.promote.error')
            : t('superAdmin.demote.error'),
        ),
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {action === 'promote'
              ? t('superAdmin.promote.title')
              : t('superAdmin.demote.title')}
          </DialogTitle>
          <DialogDescription>
            {action === 'promote'
              ? t('superAdmin.promote.description', {
                  name: user?.name,
                  email: user?.email,
                })
              : t('superAdmin.demote.description', {
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
            {action === 'promote'
              ? t('superAdmin.promote.confirm')
              : t('superAdmin.demote.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
