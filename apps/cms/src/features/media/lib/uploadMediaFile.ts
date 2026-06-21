import axios from 'axios'

import { mediaApi } from '@/features/media/api/mediaApi'
import type { MediaItem } from '@/features/media/types/media.types'
import { api } from '@/lib/axios'

const UPLOAD_TIMEOUT_MS = 120_000

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
    timeout: UPLOAD_TIMEOUT_MS,
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
