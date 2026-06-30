import type {
  AdminNotification,
  CreateNotificationRequest,
  NotificationStatus,
  PaginatedAdminNotifications,
  PaginatedNotifications,
  PublishNotificationRequest,
  UnreadCount,
  UpdateNotificationRequest,
} from '@/features/notifications/types/notification.types'
import { api } from '@/lib/axios'

const BASE = '/notifications'
const ADMIN_BASE = '/admin/notifications'

export interface ListNotificationsParams {
  page?: number
  limit?: number
}

export interface ListAdminNotificationsParams extends ListNotificationsParams {
  status?: NotificationStatus
}

/** Inbox endpoints available to every authenticated CMS user. */
export const notificationsApi = {
  list: async (
    params: ListNotificationsParams = {},
  ): Promise<PaginatedNotifications> => {
    const { data } = await api.get<PaginatedNotifications>(BASE, { params })
    return data
  },

  unreadCount: async (): Promise<UnreadCount> => {
    const { data } = await api.get<UnreadCount>(`${BASE}/unread-count`)
    return data
  },

  markRead: async (id: string): Promise<void> => {
    await api.post(`${BASE}/${id}/read`)
  },

  markAllRead: async (): Promise<void> => {
    await api.post(`${BASE}/read-all`)
  },
}

/** Authoring endpoints, guarded server-side by the super-admin guard. */
export const adminNotificationsApi = {
  list: async (
    params: ListAdminNotificationsParams = {},
  ): Promise<PaginatedAdminNotifications> => {
    const { data } = await api.get<PaginatedAdminNotifications>(ADMIN_BASE, {
      params,
    })
    return data
  },

  get: async (id: string): Promise<AdminNotification> => {
    const { data } = await api.get<AdminNotification>(`${ADMIN_BASE}/${id}`)
    return data
  },

  create: async (
    payload: CreateNotificationRequest,
  ): Promise<AdminNotification> => {
    const { data } = await api.post<AdminNotification>(ADMIN_BASE, payload)
    return data
  },

  update: async (
    id: string,
    payload: UpdateNotificationRequest,
  ): Promise<AdminNotification> => {
    const { data } = await api.patch<AdminNotification>(
      `${ADMIN_BASE}/${id}`,
      payload,
    )
    return data
  },

  publish: async (
    id: string,
    payload: PublishNotificationRequest = {},
  ): Promise<AdminNotification> => {
    const { data } = await api.post<AdminNotification>(
      `${ADMIN_BASE}/${id}/publish`,
      payload,
    )
    return data
  },

  unpublish: async (id: string): Promise<AdminNotification> => {
    const { data } = await api.post<AdminNotification>(
      `${ADMIN_BASE}/${id}/unpublish`,
    )
    return data
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`${ADMIN_BASE}/${id}`)
  },
}
