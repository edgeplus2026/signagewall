import { CheckCheck, Wifi, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  useMarkAllNotificationsRead,
  useNotificationsList,
  useUnreadCount,
} from '@/features/notifications/hooks/useNotifications'
import { formatRelativeTime } from '@/features/notifications/lib/formatDate'
import { tiptapToPlainText } from '@/features/notifications/lib/tiptapText'
import type {
  NotificationKind,
  UserNotification,
} from '@/features/notifications/types/notification.types'
import { cn } from '@/lib/utils'

interface NotificationListProps {
  onSelect: (notification: UserNotification) => void
}

/**
 * Leading indicator: a per-kind icon for system device alerts (offline/recovery)
 * so operators can tell them apart from broadcasts at a glance, or the pulsing
 * unread dot for broadcasts.
 */
function NotificationLeadingIcon({
  kind,
  read,
}: {
  kind: NotificationKind
  read: boolean
}) {
  const { t } = useTranslation()

  if (kind === 'device-offline') {
    return (
      <WifiOff
        className={cn(
          'mt-0.5 size-4 shrink-0',
          read ? 'text-secondary' : 'text-danger',
        )}
        aria-label={t('deviceAlerts.inbox.offline')}
      />
    )
  }
  if (kind === 'device-recovered') {
    return (
      <Wifi
        className={cn(
          'mt-0.5 size-4 shrink-0',
          read ? 'text-secondary' : 'text-emerald-600 dark:text-emerald-500',
        )}
        aria-label={t('deviceAlerts.inbox.recovered')}
      />
    )
  }
  return read ? (
    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-transparent" aria-hidden />
  ) : (
    <span className="relative mt-1.5 flex size-2 shrink-0" aria-hidden>
      <span className="bg-danger absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
      <span className="bg-danger relative inline-flex size-2 rounded-full" />
    </span>
  )
}

function NotificationListItem({
  notification,
  onSelect,
}: {
  notification: UserNotification
  onSelect: (notification: UserNotification) => void
}) {
  const { i18n } = useTranslation()
  const preview = tiptapToPlainText(notification.content, 100)

  return (
    <li>
      <button
        type="button"
        onClick={() => { onSelect(notification); }}
        className="hover:bg-sidebar flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors"
      >
        <NotificationLeadingIcon
          kind={notification.kind}
          read={notification.read}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                'truncate text-sm',
                notification.read
                  ? 'text-secondary'
                  : 'text-primary font-medium',
              )}
            >
              {notification.title}
            </span>
            <span className="text-secondary shrink-0 text-xs">
              {formatRelativeTime(notification.publishedAt, i18n.language)}
            </span>
          </span>
          {preview ? (
            <span className="text-secondary mt-0.5 line-clamp-2 block text-xs">
              {preview}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  )
}

export function NotificationList({ onSelect }: NotificationListProps) {
  const { t } = useTranslation()
  const { data, isLoading } = useNotificationsList(1)
  const { data: unread } = useUnreadCount()
  const markAll = useMarkAllNotificationsRead()

  const items = data?.items ?? []
  // Use the server's unread count (over ALL visible notifications), not just the
  // first page shown here — otherwise "Mark all read" is wrongly disabled when
  // the only unread notifications are older than this page.
  const hasUnread = (unread?.count ?? 0) > 0

  return (
    <div className="flex max-h-[28rem] flex-col">
      <div className="border-secondary flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-primary text-sm font-medium">
          {t('notifications.title')}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-secondary p-6 text-center text-sm">
            {t('notifications.loading')}
          </p>
        ) : items.length === 0 ? (
          <p className="text-secondary p-6 text-center text-sm">
            {t('notifications.empty')}
          </p>
        ) : (
          <ul className="divide-secondary/60 divide-y">
            {items.map((notification) => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="border-secondary border-t p-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          disabled={!hasUnread || markAll.isPending}
          onClick={() => { markAll.mutate(); }}
        >
          <CheckCheck />
          {t('notifications.markAllRead')}
        </Button>
      </div>
    </div>
  )
}
