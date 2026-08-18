/* Mirrors MEDIA_MAX_FILE_SIZE_BYTES in apps/be/src/modules/media/media.constants.ts.
   The two are checked independently — the browser rejects an oversized file
   before spending the customer's upload bandwidth, the server rejects it because
   a client check is not a control. Raise BOTH or the lower one silently wins. */
export const MEDIA_MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024
export const MEDIA_MAX_FILES_PER_UPLOAD = 10
export const MEDIA_MAX_CONCURRENT_UPLOADS = 4
export const MEDIA_UPLOAD_POLL_INTERVAL_MS = 2000

/**
 * How long the UI waits for server-side processing after the bytes have landed.
 *
 * 60 attempts (two minutes) was sized for a 10 MB file. A 200 MB video is
 * downloaded from R2, re-encoded by ffmpeg and uploaded back, and on a busy
 * container that can outlast two minutes — at which point the customer was told
 * `processing_failed` about a file that then quietly turned up READY. Giving up
 * early on work that is still running is the worse error, so the window is ten
 * minutes; polling stops the moment the item is ready, so a small image still
 * completes in seconds.
 */
export const MEDIA_UPLOAD_MAX_POLL_ATTEMPTS = 300

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
