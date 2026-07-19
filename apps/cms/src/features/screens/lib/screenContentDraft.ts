import type { ContentDraftItem } from "@/features/content/types/contentDraft.types"
import { DEFAULT_MEDIA_DURATION } from "@/features/media/lib/mediaUtils"
import { useOrganizationStore } from "@/features/organizations/store/organizationStore"
import { playlistsQueryKey } from "@/features/playlists/lib/playlistQueryKeys"
import { getPlaylistTotalDuration } from "@/features/playlists/lib/playlistUtils"
import type { PlaylistSummary } from "@/features/playlists/types/playlist.types"
import type {
  Screen,
  ScreenItem,
  ScreenZoneKey,
} from "@/features/screens/types/screen.types"
import { queryClient } from "@/providers/QueryProvider"

function getItemDuration(item: ScreenItem) {
  if (item.type === "media" || item.type === "app") {
    return item.duration ?? DEFAULT_MEDIA_DURATION
  }

  // Playlist items play their whole playlist; resolve the dynamic duration from
  // the cached playlist summaries for display purposes.
  const organizationId = useOrganizationStore.getState().activeOrganizationId
  const playlists =
    queryClient.getQueryData<PlaylistSummary[]>(
      playlistsQueryKey(organizationId),
    ) ?? []
  const playlist = playlists.find((entry) => entry.id === item.playlistId)
  return playlist ? getPlaylistTotalDuration(playlist) : 0
}

export function screenItemsToDraftItems(
  items: ScreenItem[],
): ContentDraftItem[] {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const draft: ContentDraftItem = {
        clientId: item.id,
        serverId: item.id,
        type: item.type,
        duration: getItemDuration(item),
      }

      if (item.type === "media" && item.mediaId) {
        draft.mediaId = item.mediaId
      }

      if (item.type === "playlist" && item.playlistId) {
        draft.playlistId = item.playlistId
      }

      if (item.type === "app" && item.appInstanceId) {
        draft.appInstanceId = item.appInstanceId
      }

      if (item.disabled) {
        draft.disabled = true
      }

      return draft
    })
}

export function screenToDraftItems(screen: Screen): ContentDraftItem[] {
  return screenItemsToDraftItems(screen.items)
}

/**
 * The baseline for one split-screen region: the main items, or a secondary
 * zone's rotation (empty until that zone is first edited).
 */
export function screenZoneToDraftItems(
  screen: Screen,
  zone: 'main' | ScreenZoneKey,
): ContentDraftItem[] {
  if (zone === 'main') {
    return screenToDraftItems(screen)
  }
  const entry = screen.zones?.find((candidate) => candidate.key === zone)
  return screenItemsToDraftItems(entry?.items ?? [])
}
