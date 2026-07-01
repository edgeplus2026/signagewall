import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useAdminNotifications,
  usePublishNotification,
  useUnpublishNotification,
} from '@/features/notifications/hooks/useAdminNotifications'
import { formatDateTime, isExpired } from '@/features/notifications/lib/formatDate'
import type { AdminNotification } from '@/features/notifications/types/notification.types'
import { getApiErrorMessage } from '@/lib/api-error'

interface AdminNotificationsListProps {
  onEdit: (notification: AdminNotification) => void
  onDelete: (notification: AdminNotification) => void
}

function StatusBadge({ notification }: { notification: AdminNotification }) {
  const { t } = useTranslation()

  if (notification.status === 'draft') {
    return <Badge variant="secondary">{t('notifications.status.draft')}</Badge>
  }

  const expired = isExpired(notification.expiresAt)

  return expired ? (
    <Badge variant="outline">{t('notifications.status.expired')}</Badge>
  ) : (
    <Badge variant="success">{t('notifications.status.published')}</Badge>
  )
}

export function AdminNotificationsList({
  onEdit,
  onDelete,
}: AdminNotificationsListProps) {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<{
    type: 'publish' | 'unpublish'
    notification: AdminNotification
  } | null>(null)
  const { data, isLoading } = useAdminNotifications({ page })
  const publishMutation = usePublishNotification()
  const unpublishMutation = useUnpublishNotification()

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1
  const confirmPending = publishMutation.isPending || unpublishMutation.isPending

  const handleConfirm = () => {
    if (!confirm) {
      return
    }
    const onError = (error: unknown) =>
      toast.error(getApiErrorMessage(error, t('notifications.form.error')))

    if (confirm.type === 'publish') {
      publishMutation.mutate(
        { id: confirm.notification.id },
        {
          onSuccess: () => {
            toast.success(t('notifications.actions.publishSuccess'))
            setConfirm(null)
          },
          onError,
        },
      )
    } else {
      unpublishMutation.mutate(confirm.notification.id, {
        onSuccess: () => {
          toast.success(t('notifications.actions.unpublishSuccess'))
          setConfirm(null)
        },
        onError,
      })
    }
  }

  const confirmKey = confirm ? `${confirm.type}Confirm` : 'publishConfirm'

  if (isLoading) {
    return (
      <p className="text-secondary py-10 text-center text-sm">
        {t('notifications.loading')}
      </p>
    )
  }

  if (items.length === 0) {
    return (
      <p className="text-secondary py-10 text-center text-sm">
        {t('notifications.admin.empty')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-secondary overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-sidebar text-secondary text-xs">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">
                {t('notifications.admin.columns.title')}
              </th>
              <th className="px-4 py-2.5 text-left font-medium">
                {t('notifications.admin.columns.status')}
              </th>
              <th className="px-4 py-2.5 text-left font-medium">
                {t('notifications.admin.columns.published')}
              </th>
              <th className="w-12 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-secondary/60 divide-y">
            {items.map((notification) => {
              const isDraft = notification.status === 'draft'
              return (
                <tr key={notification.id} className="text-primary">
                  <td className="max-w-xs truncate px-4 py-3">
                    {notification.translations.en.title}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge notification={notification} />
                  </td>
                  <td className="text-secondary px-4 py-3">
                    {notification.publishedAt
                      ? formatDateTime(notification.publishedAt, i18n.language)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('notifications.admin.actions.menu')}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isDraft ? (
                          <DropdownMenuItem onClick={() => { onEdit(notification); }}>
                            {t('notifications.admin.actions.edit')}
                          </DropdownMenuItem>
                        ) : null}
                        {isDraft ? (
                          <DropdownMenuItem
                            onClick={() => {
                              setConfirm({ type: 'publish', notification })
                            }}
                          >
                            {t('notifications.admin.actions.publish')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => {
                              setConfirm({ type: 'unpublish', notification })
                            }}
                          >
                            {t('notifications.admin.actions.unpublish')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          variant="danger"
                          onClick={() => { onDelete(notification); }}
                        >
                          {t('notifications.admin.actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => { setPage((current) => Math.max(1, current - 1)); }}
          >
            {t('notifications.admin.pagination.previous')}
          </Button>
          <span className="text-secondary text-sm">
            {t('notifications.admin.pagination.page', {
              page,
              totalPages,
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() =>
              { setPage((current) => Math.min(totalPages, current + 1)); }
            }
          >
            {t('notifications.admin.pagination.next')}
          </Button>
        </div>
      ) : null}

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirm(null)
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {t(`notifications.admin.${confirmKey}.title`)}
            </DialogTitle>
            <DialogDescription>
              {t(`notifications.admin.${confirmKey}.description`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setConfirm(null); }}
            >
              {t('notifications.form.cancel')}
            </Button>
            <Button disabled={confirmPending} onClick={handleConfirm}>
              {t(`notifications.admin.${confirmKey}.confirm`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
