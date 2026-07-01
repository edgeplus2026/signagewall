import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { ADMIN_NOTIFICATIONS_QUERY_KEY } from '@/features/notifications/hooks/useAdminNotifications'
import { NOTIFICATIONS_QUERY_KEY } from '@/features/notifications/hooks/useNotifications'
import { getRealtimeSocket, onNotificationsChanged } from '@/lib/realtime'

/**
 * Keeps the bell's unread count and inbox live: refetches on the server's
 * `notifications:changed` broadcast, and re-invalidates on socket (re)connect
 * to recover any events missed while disconnected.
 */
export function useNotificationsRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getRealtimeSocket()
    const invalidate = () => {
      // Refresh both the user inbox and the super-admin authoring list, so a
      // change made by one super-admin shows up live for another.
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: ADMIN_NOTIFICATIONS_QUERY_KEY,
      })
    }

    const off = onNotificationsChanged(invalidate)
    socket.on('connect', invalidate)

    return () => {
      off()
      socket.off('connect', invalidate)
    }
  }, [queryClient])
}
