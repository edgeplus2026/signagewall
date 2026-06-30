import { Plus } from 'lucide-react'
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
import { AdminNotificationsList } from '@/features/notifications/components/AdminNotificationsList'
import { NotificationFormSheet } from '@/features/notifications/components/NotificationFormSheet'
import { useDeleteNotification } from '@/features/notifications/hooks/useAdminNotifications'
import type { AdminNotification } from '@/features/notifications/types/notification.types'
import { getApiErrorMessage } from '@/lib/api-error'

interface FormState {
  open: boolean
  mode: 'create' | 'edit'
  notification: AdminNotification | null
}

export default function AdminNotificationsPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>({
    open: false,
    mode: 'create',
    notification: null,
  })
  const [toDelete, setToDelete] = useState<AdminNotification | null>(null)
  const deleteMutation = useDeleteNotification()

  const confirmDelete = () => {
    if (!toDelete) {
      return
    }
    deleteMutation.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success(t('notifications.admin.delete.success'))
        setToDelete(null)
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, t('notifications.form.error'))),
    })
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-primary text-xl font-medium tracking-tight">
          {t('notifications.admin.title')}
        </h1>
        <Button
          onClick={() =>
            { setForm({ open: true, mode: 'create', notification: null }); }
          }
        >
          <Plus />
          {t('notifications.admin.create')}
        </Button>
      </div>

      <AdminNotificationsList
        onEdit={(notification) =>
          { setForm({ open: true, mode: 'edit', notification }); }
        }
        onDelete={(notification) => { setToDelete(notification); }}
      />

      <NotificationFormSheet
        open={form.open}
        mode={form.mode}
        notification={form.notification}
        onOpenChange={(open) => { setForm((current) => ({ ...current, open })); }}
      />

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setToDelete(null)
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('notifications.admin.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('notifications.admin.delete.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setToDelete(null); }}>
              {t('notifications.admin.delete.cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
            >
              {t('notifications.admin.delete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
