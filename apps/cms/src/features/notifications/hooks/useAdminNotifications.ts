import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import {
  adminNotificationsApi,
  type ListAdminNotificationsParams,
} from '@/features/notifications/api/notificationsApi'
import { NOTIFICATIONS_QUERY_KEY } from '@/features/notifications/hooks/useNotifications'
import type {
  CreateNotificationRequest,
  PublishNotificationRequest,
  UpdateNotificationRequest,
} from '@/features/notifications/types/notification.types'

export const ADMIN_NOTIFICATIONS_QUERY_KEY = ['admin', 'notifications'] as const
const DEFAULT_PAGE_SIZE = 20

/** Authoring changes affect both the admin list and what users see. */
function invalidateAll(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ADMIN_NOTIFICATIONS_QUERY_KEY,
  })
  void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
}

export function useAdminNotifications(params: ListAdminNotificationsParams) {
  const { page = 1, limit = DEFAULT_PAGE_SIZE, status } = params

  return useQuery({
    queryKey: [...ADMIN_NOTIFICATIONS_QUERY_KEY, 'list', page, limit, status],
    queryFn: () =>
      adminNotificationsApi.list({ page, limit, ...(status ? { status } : {}) }),
    placeholderData: keepPreviousData,
  })
}

export function useCreateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateNotificationRequest) =>
      adminNotificationsApi.create(payload),
    onSuccess: () => { invalidateAll(queryClient); },
  })
}

export function useUpdateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateNotificationRequest
    }) => adminNotificationsApi.update(id, payload),
    onSuccess: () => { invalidateAll(queryClient); },
  })
}

export function usePublishNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload?: PublishNotificationRequest
    }) => adminNotificationsApi.publish(id, payload),
    onSuccess: () => { invalidateAll(queryClient); },
  })
}

export function useUnpublishNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminNotificationsApi.unpublish(id),
    onSuccess: () => { invalidateAll(queryClient); },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminNotificationsApi.remove(id),
    onSuccess: () => { invalidateAll(queryClient); },
  })
}

export { DEFAULT_PAGE_SIZE }
