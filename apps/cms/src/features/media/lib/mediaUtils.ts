import type { MediaItem } from "@/features/media/types/media.types"
import { api } from "@/lib/axios"

export const DEFAULT_MEDIA_DURATION = 15

export function getMediaPlaybackDuration(
  media: Pick<MediaItem, "type" | "defaultDuration"> | null | undefined,
): number {
  if (media?.defaultDuration !== undefined) {
    return media.defaultDuration
  }

  return DEFAULT_MEDIA_DURATION
}

export function formatFileSize(bytes?: number) {
  if (bytes === undefined) return "—"
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDimensions(width?: number, height?: number) {
  if (!width || !height) return "—"
  return `${String(width)} × ${String(height)}`
}

export function readImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
      URL.revokeObjectURL(url)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to read image dimensions"))
    }
    image.src = url
  })
}

export function readVideoDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")

    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight })
      URL.revokeObjectURL(url)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to read video dimensions"))
    }
    video.src = url
  })
}

export async function downloadMediaFile(item: {
  id: string
  name: string
}): Promise<boolean> {
  try {
    const { data } = await api.get<Blob>(`/media/${item.id}/download`, {
      responseType: "blob",
      timeout: 120_000,
    })

    const objectUrl = URL.createObjectURL(data)
    const link = document.createElement("a")
    link.href = objectUrl
    link.download = item.name
    link.rel = "noopener"
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
    return true
  } catch {
    return false
  }
}
