/** Tiptap document JSON. */
export type RichTextContent = Record<string, unknown>

export type NotificationStatus = 'draft' | 'published'
export type NotificationAudienceType = 'all' | 'orgs' | 'users'

/** Super-admin broadcast vs. system-generated device alerts. */
export type NotificationKind =
  | 'broadcast'
  | 'device-offline'
  | 'device-recovered'

// --- User-facing (inbox) -----------------------------------------------------

export interface UserNotification {
  id: string
  kind: NotificationKind
  title: string
  content: RichTextContent | null
  read: boolean
  readAt: string | null
  publishedAt: string
  createdAt: string
}

export interface PaginatedNotifications {
  items: UserNotification[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface UnreadCount {
  count: number
}

// --- Admin (authoring) -------------------------------------------------------

export interface NotificationTranslationContent {
  title: string
  content: RichTextContent | null
}

export interface AdminNotification {
  id: string
  translations: {
    en: NotificationTranslationContent
    sr: NotificationTranslationContent
  }
  status: NotificationStatus
  publishedAt: string | null
  expiresAt: string | null
  scheduledAt: string | null
  audience: { type: NotificationAudienceType; ids?: string[] }
  /** Authoring super-admin id; null for system-generated notifications. */
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedAdminNotifications {
  items: AdminNotification[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateNotificationRequest {
  translations: {
    en: { title: string; content: RichTextContent }
    sr?: { title?: string; content?: RichTextContent }
  }
  expiresAt?: string
}

export type UpdateNotificationRequest = Partial<CreateNotificationRequest>

export interface PublishNotificationRequest {
  expiresAt?: string
}
