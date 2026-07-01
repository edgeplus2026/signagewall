import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { notificationsApi } from '@/features/notifications/api/notificationsApi'

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const
const DEFAULT_PAGE_SIZE = 20

export function useNotificationsList(page = 1, limit = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, 'list', page, limit],
    queryFn: () => notificationsApi.list({ page, limit }),
    placeholderData: keepPreviousData,
    // The list lives inside the bell popover, which mounts on open — refetch
    // every time the menu is opened so it always shows the latest.
    refetchOnMount: 'always',
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchOnWindowFocus: true,
    // Poll the unread count once a minute so the bell stays current without a
    // realtime event.
    refetchInterval: 60_000,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
  })
}

export { DEFAULT_PAGE_SIZE }
