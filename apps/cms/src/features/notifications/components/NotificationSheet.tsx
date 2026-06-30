import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { RichTextViewer } from '@/features/notifications/components/RichTextViewer'
import { useMarkNotificationRead } from '@/features/notifications/hooks/useNotifications'
import { formatDateTime } from '@/features/notifications/lib/formatDate'
import type { UserNotification } from '@/features/notifications/types/notification.types'

interface NotificationSheetProps {
  notification: UserNotification | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationSheet({
  notification,
  open,
  onOpenChange,
}: NotificationSheetProps) {
  const { t, i18n } = useTranslation()
  const markRead = useMarkNotificationRead()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        {notification ? (
          <>
            <SheetHeader>
              <SheetTitle>{notification.title}</SheetTitle>
              <SheetDescription>
                {formatDateTime(notification.publishedAt, i18n.language)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4">
              <RichTextViewer
                key={notification.id}
                content={notification.content}
              />
            </div>

            {!notification.read ? (
              <SheetFooter className="border-t border-secondary">
                <Button
                  disabled={markRead.isPending}
                  onClick={() =>
                    { markRead.mutate(notification.id, {
                      onSuccess: () => {
                        onOpenChange(false)
                      },
                    }); }
                  }
                >
                  {t('notifications.markRead')}
                </Button>
              </SheetFooter>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
