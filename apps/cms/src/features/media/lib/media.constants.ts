export const MEDIA_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const MEDIA_MAX_FILES_PER_UPLOAD = 10
export const MEDIA_MAX_CONCURRENT_UPLOADS = 4
export const MEDIA_UPLOAD_POLL_INTERVAL_MS = 2000
export const MEDIA_UPLOAD_MAX_POLL_ATTEMPTS = 60

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const

export const ALLOWED_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
] as const

export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number]

export const MEDIA_ACCEPT_ATTRIBUTE = ALLOWED_MEDIA_MIME_TYPES.join(',')

export function formatMaxFileSize(): string {
  return `${String(Math.round(MEDIA_MAX_FILE_SIZE_BYTES / (1024 * 1024)))} MB`
}
