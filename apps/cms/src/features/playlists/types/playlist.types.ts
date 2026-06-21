export type PlaylistViewMode = "grid" | "list"

export type PlaylistSortField = "name" | "createdAt"

export type PlaylistSortDirection = "asc" | "desc"

export interface PlaylistItem {
  id: string
  mediaId: string
  order: number
  duration: number
  disabled?: boolean
}

export interface PlaylistSummary {
  id: string
  name: string
  itemCount: number
  thumbnailUrl?: string
  totalDuration: number
  createdAt: string
  updatedAt: string
}

export interface PlaylistDetail extends PlaylistSummary {
  description?: string
}

export type Playlist = PlaylistDetail & {
  items: PlaylistItem[]
}

export interface CreatePlaylistRequest {
  name: string
  description?: string
}

export type PlaylistDetailTab = "content" | "settings"

export interface UpdatePlaylistRequest {
  name?: string
  description?: string
}

export interface DuplicatePlaylistRequest {
  copySuffix?: string
}

export interface ReplacePlaylistItemInput {
  id?: string
  mediaId: string
  duration: number
  disabled?: boolean
}

export interface ReplacePlaylistItemsRequest {
  items: ReplacePlaylistItemInput[]
  /** The `updatedAt` last observed by the client, for lost-update protection. */
  expectedUpdatedAt?: string
}

export interface AddMediaToPlaylistsRequest {
  playlistIds: string[]
  mediaIds: string[]
}
