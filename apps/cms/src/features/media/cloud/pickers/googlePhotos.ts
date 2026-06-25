import { CloudPickerError } from "@/features/media/cloud/lib/cloudPickerError"
import { getGoogleAccessToken } from "@/features/media/cloud/lib/googleAuth"
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
    const body = await response.text().catch(() => "")
    console.error("[google_photos] API error", response.status, url, body)
    throw new CloudPickerError(
      "failed",
      `Photos API error ${String(response.status)}`,
    )
  }
  return (await response.json()) as T
}

/**
 * Google Photos has no embedded picker widget: we create a picker session,
 * open the hosted picker, poll until the user finishes, then read the selected
 * media items. Each result downloads from `${baseUrl}=d` (photo) / `=dv`
 * (video) with the bearer token, server-side.
 *
 * The picker tab is opened synchronously on the click (so the browser doesn't
 * block it), then we acquire the token and navigate it to the session — so the
 * whole flow runs from a single user click, no "click again" step.
 */
export async function openGooglePhotosPicker(): Promise<CloudPickResult[]> {
  // Open the picker tab synchronously within the click gesture, before any
  // await — otherwise the browser treats the later window.open as a blocked
  // pop-up. The Google consent prompt (if needed) renders in its own GIS popup.
  //
  // A stable window name reuses the same tab across imports: we leave the
  // success screen open (per product requirement), but reusing one tab avoids
  // piling up an "All set" tab on every import.
  const pickerWindow = window.open("", "googlePhotosPicker")
  if (!pickerWindow) {
    throw new CloudPickerError("failed", "Popup was blocked")
  }
  pickerWindow.document.title = "Google Photos"
  const notice = pickerWindow.document.createElement("p")
  notice.textContent = "Opening Google Photos…"
  notice.style.font = "14px sans-serif"
  notice.style.padding = "24px"
  pickerWindow.document.body.appendChild(notice)

  try {
    // Force the consent dialog (not just account selection): the Photos Picker
    // scope is sensitive, so a silent grant yields a token that lacks it and the
    // picker bounces with "connect again". `requireGrantedScope` rejects loudly
    // if the user proceeds without granting Photos. The token is cached, so this
    // consent only shows on the first import (until the token expires).
    const token = await getGoogleAccessToken(PHOTOS_SCOPE, {
      prompt: "consent",
      requireGrantedScope: PHOTOS_SCOPE,
    })
    return await runGooglePhotosSession(pickerWindow, token)
  } catch (error) {
    // Once navigated to Google's COOP page, reading `.closed` throws — just try
    // to close and ignore any cross-origin error.
    try {
      pickerWindow.close()
    } catch {
      // ignore: COOP severed the opener handle
    }
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

    // Detecting a user-closed tab via `pickerWindow.closed` is intentionally
    // NOT done here: Google serves the picker with Cross-Origin-Opener-Policy,
    // which severs the opener link and makes `.closed` throw COOP errors on
    // every read. We rely on session polling + the server's timeout instead.
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

  // Selection done. Leave the picker tab on Google's "all set" success screen
  // (don't close it) — the user dismisses it themselves.

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

  console.info(
    `[google_photos] selection done — ${String(items.length)} item(s) returned`,
  )

  return items
    .filter((item) => {
      const mime = item.mediaFile.mimeType
      return mime.startsWith("image/") || mime.startsWith("video/")
    })
    .map((item) => {
      const isVideo =
        item.type === "VIDEO" || item.mediaFile.mimeType.startsWith("video/")
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
