import { CloudPickerError } from "@/features/media/cloud/lib/cloudPickerError"
import {
  getCachedGoogleToken,
  getGoogleAccessToken,
} from "@/features/media/cloud/lib/googleAuth"
import type { CloudPickResult } from "@/features/media/cloud/types/cloudPick.types"

const PHOTOS_SCOPE =
  "https://www.googleapis.com/auth/photospicker.mediaitems.readonly"
const PHOTOS_API = "https://photospicker.googleapis.com/v1"

interface PhotosSession {
  id: string
  pickerUri: string
  mediaItemsSet?: boolean
  pollingConfig?: { pollInterval?: string; timeoutIn?: string }
}

interface PhotosMediaFile {
  baseUrl: string
  mimeType: string
  filename?: string
  mediaFileMetadata?: { width?: number; height?: number }
}

interface PhotosPickedMediaItem {
  id: string
  type?: string
  mediaFile: PhotosMediaFile
}

interface PhotosMediaItemsResponse {
  mediaItems?: PhotosPickedMediaItem[]
  nextPageToken?: string
}

function parseSeconds(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function photosFetch<T>(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  })
  if (!response.ok) {
    throw new CloudPickerError("failed", `Photos API error ${String(response.status)}`)
  }
  return (await response.json()) as T
}

/**
 * Google Photos has no embedded picker widget: we create a picker session,
 * open the hosted picker, poll until the user finishes, then read the selected
 * media items. Each result downloads from `${baseUrl}=d` (photo) / `=dv`
 * (video) with the bearer token, server-side.
 */
export async function openGooglePhotosPicker(): Promise<CloudPickResult[]> {
  // One popup per click. Photos needs the consent popup AND a separate picker
  // window, so split them: first click spends the gesture's popup on consent
  // (no picker window yet), then the user clicks again to open the picker with
  // the cached token (no second popup).
  const token = getCachedGoogleToken(PHOTOS_SCOPE)
  if (!token) {
    await getGoogleAccessToken(PHOTOS_SCOPE)
    throw new CloudPickerError("signed_in_retry")
  }

  // Open the picker tab synchronously (this gesture's single popup), then
  // navigate it to the session URL once we have one.
  const pickerWindow = window.open("", "_blank")
  if (!pickerWindow) {
    throw new CloudPickerError("failed", "Popup was blocked")
  }

  try {
    return await runGooglePhotosSession(pickerWindow, token)
  } catch (error) {
    pickerWindow.close()
    throw error
  }
}

async function runGooglePhotosSession(
  pickerWindow: Window,
  token: string,
): Promise<CloudPickResult[]> {
  const session = await photosFetch<PhotosSession>(`${PHOTOS_API}/sessions`, token, {
    method: "POST",
    body: "{}",
  })

  pickerWindow.location.href = session.pickerUri

  const pollMs = parseSeconds(session.pollingConfig?.pollInterval, 3) * 1000
  const timeoutMs = parseSeconds(session.pollingConfig?.timeoutIn, 300) * 1000
  const deadline = Date.now() + timeoutMs

  let ready = false
  while (Date.now() < deadline) {
    await delay(pollMs)
    const current = await photosFetch<PhotosSession>(
      `${PHOTOS_API}/sessions/${session.id}`,
      token,
    )
    if (current.mediaItemsSet) {
      ready = true
      break
    }
  }

  if (!ready) {
    void deleteSession(session.id, token)
    throw new CloudPickerError("cancelled")
  }

  // Selection done — close the picker tab and collect the chosen items.
  pickerWindow.close()

  const items: PhotosPickedMediaItem[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({
      sessionId: session.id,
      pageSize: "100",
    })
    if (pageToken) params.set("pageToken", pageToken)
    const page = await photosFetch<PhotosMediaItemsResponse>(
      `${PHOTOS_API}/mediaItems?${params.toString()}`,
      token,
    )
    if (page.mediaItems) items.push(...page.mediaItems)
    pageToken = page.nextPageToken
  } while (pageToken)

  void deleteSession(session.id, token)

  return items.map((item) => {
    const isVideo = item.type === "VIDEO"
    const metadata = item.mediaFile.mediaFileMetadata
    return {
      provider: "google_photos",
      externalId: item.id,
      name: item.mediaFile.filename ?? item.id,
      mimeType: item.mediaFile.mimeType,
      sizeBytes: 0,
      ...(metadata?.width ? { width: metadata.width } : {}),
      ...(metadata?.height ? { height: metadata.height } : {}),
      download: {
        kind: "url",
        url: `${item.mediaFile.baseUrl}=${isVideo ? "dv" : "d"}`,
        authToken: token,
      },
    }
  })
}

function deleteSession(sessionId: string, token: string): Promise<void> {
  return photosFetch(`${PHOTOS_API}/sessions/${sessionId}`, token, {
    method: "DELETE",
  })
    .then(() => undefined)
    .catch(() => undefined)
}
