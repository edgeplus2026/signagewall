const POSTER_TIMEOUT_MS = 10_000
const POSTER_MIME = 'image/jpeg'
const POSTER_QUALITY = 0.85

export function normalizeVideoDurationSeconds(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1
  }

  return Math.min(3600, Math.max(1, Math.round(raw)))
}

/**
 * Captures a poster frame and reads the video duration in a single decode pass.
 * Best-effort: returns null poster and/or duration on failure.
 */
export function prepareVideoUpload(file: File): Promise<{
  poster: Blob | null
  durationSeconds: number | null
}> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    let settled = false
    let durationSeconds: number | null = null

    const finish = (poster: Blob | null) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      URL.revokeObjectURL(objectUrl)
      resolve({ poster, durationSeconds })
    }

    const timeoutId = window.setTimeout(() => {
      finish(null)
    }, POSTER_TIMEOUT_MS)

    const drawFrame = () => {
      try {
        if (!video.videoWidth || !video.videoHeight) {
          finish(null)
          return
        }

        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          finish(null)
          return
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            finish(blob)
          },
          POSTER_MIME,
          POSTER_QUALITY,
        )
      } catch {
        finish(null)
      }
    }

    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onerror = () => {
      finish(null)
    }
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        durationSeconds = normalizeVideoDurationSeconds(video.duration)
      }
    }
    video.onloadeddata = () => {
      const target = Math.min(1, (video.duration || 1) / 2)

      if (Number.isFinite(target) && target > 0) {
        video.onseeked = drawFrame
        video.currentTime = target
      } else {
        drawFrame()
      }
    }

    video.src = objectUrl
  })
}

/** @deprecated Use prepareVideoUpload instead. */
export function captureVideoPoster(file: File): Promise<Blob | null> {
  return prepareVideoUpload(file).then((result) => result.poster)
}
