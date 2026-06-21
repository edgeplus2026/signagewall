import type {
  Playlist,
  PlaylistDetail,
  PlaylistSummary,
} from "@/features/playlists/types/playlist.types"

type PlaylistWithCounts = Playlist | PlaylistDetail | PlaylistSummary

export function getPlaylistItemCount(playlist: PlaylistWithCounts) {
  if ("itemCount" in playlist && playlist.itemCount !== undefined) {
    return playlist.itemCount
  }

  if ("items" in playlist) {
    return playlist.items.length
  }

  return 0
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
