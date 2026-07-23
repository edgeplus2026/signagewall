import type {
  Playlist,
  PlaylistDetail,
  PlaylistSummary,
} from "@/features/playlists/types/playlist.types"

type PlaylistWithCounts = Playlist | PlaylistDetail | PlaylistSummary

/**
 * The three playlist shapes come from different endpoints, and every one of
 * them *declares* `itemCount` — so narrowing by `in` left the rest of this
 * function typed `never` while the fallback it guards is still needed at
 * runtime. Reading through a `Partial` view says the honest thing: these fields
 * may or may not be on the object in hand.
 */
type PartialPlaylistShape = Partial<Playlist & PlaylistSummary>

export function getPlaylistItemCount(playlist: PlaylistWithCounts) {
  const shape = playlist as PartialPlaylistShape

  if (typeof shape.itemCount === "number") {
    return shape.itemCount
  }

  return shape.items?.length ?? 0
}

export function getPlaylistTotalDuration(playlist: PlaylistWithCounts) {
  if ("items" in playlist && playlist.items.length > 0) {
    return playlist.items.reduce(
      (total, item) => total + (item.disabled ? 0 : item.duration),
      0,
    )
  }

  if ("totalDuration" in playlist) {
    return playlist.totalDuration
  }

  return 0
}

export function formatDurationSeconds(totalSeconds: number) {
  if (totalSeconds < 60) {
    return `${String(totalSeconds)}s`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (seconds === 0) {
    return `${String(minutes)}m`
  }

  return `${String(minutes)}m ${String(seconds)}s`
}
