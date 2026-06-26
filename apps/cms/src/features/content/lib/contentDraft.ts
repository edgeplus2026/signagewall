import { getContentTypeDefinition } from "@/features/content/registry/contentTypeRegistry"
import type { ContentDraftItem } from "@/features/content/types/contentDraft.types"
import {
  DEFAULT_MEDIA_DURATION,
  getMediaPlaybackDuration,
} from "@/features/media/lib/mediaUtils"
import type { MediaItem } from "@/features/media/types/media.types"
import { useOrganizationStore } from "@/features/organizations/store/organizationStore"
import { playlistsQueryKey } from "@/features/playlists/lib/playlistQueryKeys"
import { getPlaylistTotalDuration } from "@/features/playlists/lib/playlistUtils"
import type { PlaylistSummary } from "@/features/playlists/types/playlist.types"
import { queryClient } from "@/providers/QueryProvider"

export function draftSignature(items: ContentDraftItem[]) {
  // The active type's definition contributes its identity field; the other
  // slot is left empty. This reproduces the legacy `mediaId|playlistId` layout
  // exactly (a media item always had an empty playlist slot and vice versa), so
  // signatures stay byte-identical and dirty checks are unaffected.
  return items
    .map((item, index) => {
      const idField = getContentTypeDefinition(item.type).signatureFields(item)
      const mediaField = item.type === "media" ? idField : ""
      const playlistField = item.type === "playlist" ? idField : ""
      const appField = item.type === "app" ? idField : ""
      return `${String(index)}:${item.clientId}|${item.type}|${mediaField}|${playlistField}|${appField}|${String(item.duration)}|${item.disabled ? "1" : "0"}`
    })
    .join(":")
}

export function isDraftDirty(
  draft: ContentDraftItem[],
  baseline: ContentDraftItem[]
) {
  return draftSignature(draft) !== draftSignature(baseline)
}

export function getDraftTotalDuration(items: ContentDraftItem[]) {
  return items.reduce(
    (total, item) => total + (item.disabled ? 0 : item.duration),
    0,
  )
}

export function createMediaDraftItem(
  mediaId: string,
  media: Pick<MediaItem, "type" | "defaultDuration">,
): ContentDraftItem {
  return {
    clientId: `draft-${crypto.randomUUID()}`,
    type: "media",
    mediaId,
    duration: getMediaPlaybackDuration(media),
  }
}

export function createAppDraftItem(appInstanceId: string): ContentDraftItem {
  return {
    clientId: `draft-${crypto.randomUUID()}`,
    type: "app",
    appInstanceId,
    duration: DEFAULT_MEDIA_DURATION,
  }
}

export function createPlaylistDraftItem(playlistId: string): ContentDraftItem {
  const organizationId = useOrganizationStore.getState().activeOrganizationId
  const playlists =
    queryClient.getQueryData<PlaylistSummary[]>(
      playlistsQueryKey(organizationId),
    ) ?? []
  const playlist = playlists.find((entry) => entry.id === playlistId) ?? null

  return {
    clientId: `draft-${crypto.randomUUID()}`,
    type: "playlist",
    playlistId,
    duration: playlist ? getPlaylistTotalDuration(playlist) : 0,
  }
}

/** Insert `item` at `index`, clamped to `[0, items.length]`. */
export function insertDraftItemAt(
  items: ContentDraftItem[],
  item: ContentDraftItem,
  index: number
) {
  const clamped = Math.max(0, Math.min(index, items.length))
  const next = [...items]
  next.splice(clamped, 0, item)
  return next
}
