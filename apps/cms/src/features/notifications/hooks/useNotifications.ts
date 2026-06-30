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
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchOnWindowFocus: true,
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
