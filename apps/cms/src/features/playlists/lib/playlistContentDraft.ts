import type { ContentDraftItem } from "@/features/content/types/contentDraft.types"
import type { Playlist, PlaylistItem } from "@/features/playlists/types/playlist.types"

export function playlistItemsToDraftItems(
  items: PlaylistItem[],
): ContentDraftItem[] {
  return items.map((item) => {
    const base = {
      clientId: item.id,
      serverId: item.id,
      duration: item.duration,
      ...(item.disabled ? { disabled: true } : {}),
    }
    if (item.type === "app") {
      return {
        ...base,
        type: "app" as const,
        ...(item.appInstanceId ? { appInstanceId: item.appInstanceId } : {}),
      }
    }
    // Media item (also the default for legacy items without a `type`).
    return {
      ...base,
      type: "media" as const,
      ...(item.mediaId ? { mediaId: item.mediaId } : {}),
    }
  })
}

export function playlistToDraftItems(playlist: Playlist): ContentDraftItem[] {
  return playlistItemsToDraftItems(playlist.items)
}
