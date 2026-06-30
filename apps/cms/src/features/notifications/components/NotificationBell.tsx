import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { NotificationList } from '@/features/notifications/components/NotificationList'
import { NotificationSheet } from '@/features/notifications/components/NotificationSheet'
import {
  useUnreadCount,
} from '@/features/notifications/hooks/useNotifications'
import { useNotificationsRealtime } from '@/features/notifications/hooks/useNotificationsRealtime'
import type { UserNotification } from '@/features/notifications/types/notification.types'

export function NotificationBell() {
  const { t } = useTranslation()
  useNotificationsRealtime()
  const { data: unread } = useUnreadCount()

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [selected, setSelected] = useState<UserNotification | null>(null)

  const count = unread?.count ?? 0

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={t('notifications.bell')}
          >
            <Bell />
            {count > 0 ? (
              <span className="bg-brand text-brand-contrast absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] leading-none font-medium">
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-0">
          <NotificationList
            onSelect={(notification) => {
              setSelected(notification)
              setPopoverOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>

      <NotificationSheet
        notification={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
          }
        }}
      />
    </>
  )
}
