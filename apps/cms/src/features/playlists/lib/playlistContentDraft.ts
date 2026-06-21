import type { ContentDraftItem } from "@/features/content/types/contentDraft.types"
import type { Playlist, PlaylistItem } from "@/features/playlists/types/playlist.types"

export function playlistItemsToDraftItems(
  items: PlaylistItem[],
): ContentDraftItem[] {
  return items.map((item) => ({
    clientId: item.id,
    serverId: item.id,
    type: "media",
    mediaId: item.mediaId,
    duration: item.duration,
    ...(item.disabled ? { disabled: true } : {}),
  }))
}

export function playlistToDraftItems(playlist: Playlist): ContentDraftItem[] {
  return playlistItemsToDraftItems(playlist.items)
}
