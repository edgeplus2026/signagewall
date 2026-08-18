import axios from 'axios'

import { mediaApi } from '@/features/media/api/mediaApi'
import type { MediaItem } from '@/features/media/types/media.types'
import { api } from '@/lib/axios'

/**
 * How long the browser waits on one upload.
 *
 * A flat two minutes was fine while nothing over 10 MB could be sent. At the
 * 200 MB ceiling it became a bandwidth test the customer always loses: 200 MB
 * in 120s demands ~13 Mbit/s of upload, and a shop on business ADSL got a
 * failed upload for a file that was transferring perfectly.
 *
 * So the budget is derived from the file instead, assuming a deliberately
 * pessimistic 150 KB/s (~1.2 Mbit/s) floor plus a fixed allowance for the
 * server's own work. It is a ceiling, not a wait — the request resolves when it
 * resolves, and the upload can always be cancelled from the UI. Kept under the
 * API's 20-minute `requestTimeout` so the browser gives up first and can say
 * something useful, rather than the connection dying underneath it.
 */
const UPLOAD_BASE_TIMEOUT_MS = 60_000
const UPLOAD_ASSUMED_BYTES_PER_SECOND = 150 * 1024
const UPLOAD_MAX_TIMEOUT_MS = 18 * 60_000

export function uploadTimeoutFor(sizeBytes: number): number {
  const transferMs = (sizeBytes / UPLOAD_ASSUMED_BYTES_PER_SECOND) * 1000

  return Math.min(
    UPLOAD_BASE_TIMEOUT_MS + Math.ceil(transferMs),
    UPLOAD_MAX_TIMEOUT_MS,
  )
}

interface UploadMediaFileOptions {
  file: File
  parentId: string | null
  poster?: Blob | null
  durationSeconds?: number
  signal?: AbortSignal
  onProgress?: (progress: number) => void
}

export async function uploadMediaFile({
  file,
  parentId,
  poster,
  durationSeconds,
  signal,
  onProgress,
}: UploadMediaFileOptions): Promise<MediaItem> {
  const formData = new FormData()
  formData.append('file', file)

  if (poster) {
    formData.append('poster', poster, 'poster.jpg')
  }

  if (durationSeconds !== undefined) {
    formData.append('duration', String(durationSeconds))
  }

  if (parentId) {
    formData.append('parentId', parentId)
  }

  const { data } = await api.post<MediaItem>('/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: uploadTimeoutFor(file.size),
    ...(signal ? { signal } : {}),
    onUploadProgress: (event) => {
      if (!event.total) {
        return
      }

      onProgress?.(Math.round((event.loaded / event.total) * 100))
    },
  })

  return data
}

export async function pollMediaUntilReady(
  mediaId: string,
  {
    signal,
    intervalMs = 2000,
    maxAttempts = 60,
  }: {
    signal?: AbortSignal
    intervalMs?: number
    maxAttempts?: number
  } = {},
): Promise<MediaItem> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) {
      throw new axios.CanceledError('Upload polling cancelled')
    }

    const item = await mediaApi.get(mediaId)

    if (!item) {
      throw new Error('Uploaded media item was not found')
    }

    if (item.status === 'ready') {
      return item
    }

    if (item.status === 'failed') {
      throw new Error('Media processing failed')
    }

    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(resolve, intervalMs)

      signal?.addEventListener(
        'abort',
        () => {
          window.clearTimeout(timeoutId)
          reject(new axios.CanceledError('Upload polling cancelled'))
        },
        { once: true },
      )
    })
  }

  throw new Error('Media processing timed out')
}
