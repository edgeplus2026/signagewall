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
import { useDeleteAdminUser } from '@/features/super-admin/hooks/useAdminUsers'
import type { AdminUserListItem } from '@/features/super-admin/types/admin.types'
import { getApiErrorMessage } from '@/lib/api-error'

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUserListItem | null
}

/** Super-admin permanent (hard) delete: erases the user and all their data. */
export function DeleteUserDialog({ open, onOpenChange, user }: DeleteUserDialogProps) {
  const { t } = useTranslation()
  const deleteUser = useDeleteAdminUser()

  const handleConfirm = () => {
    if (!user) return
    deleteUser.mutate(user.id, {
      onSuccess: () => {
        toast.success(t('superAdmin.deleteUser.success', { name: user.name }))
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, t('superAdmin.deleteUser.error')))
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('superAdmin.deleteUser.title')}</DialogTitle>
          <DialogDescription>
            {t('superAdmin.deleteUser.description', {
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
          <Button
            variant="danger"
            disabled={deleteUser.isPending}
            onClick={handleConfirm}
          >
            {t('superAdmin.deleteUser.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
