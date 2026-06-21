export const PLAYLISTS_QUERY_ROOT = "playlists" as const

export function playlistsQueryKey(organizationId: string | null | undefined) {
  return [PLAYLISTS_QUERY_ROOT, organizationId ?? "none"] as const
}

export function playlistDetailQueryKey(
  organizationId: string | null | undefined,
  id: string,
) {
  return [...playlistsQueryKey(organizationId), "detail", id] as const
}

export function playlistScreensQueryKey(
  organizationId: string | null | undefined,
  id: string,
) {
  return [...playlistDetailQueryKey(organizationId, id), "screens"] as const
}
