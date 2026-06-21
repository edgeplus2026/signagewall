import type {
  AddMediaToPlaylistsRequest,
  CreatePlaylistRequest,
  DuplicatePlaylistRequest,
  Playlist,
  PlaylistDetail,
  PlaylistItem,
  PlaylistSummary,
  ReplacePlaylistItemsRequest,
  UpdatePlaylistRequest,
} from "@/features/playlists/types/playlist.types"
import type { ScreenSummary } from "@/features/screens/types/screen.types"
import { ApiError } from "@/lib/api-error"
import { api } from "@/lib/axios"

const PLAYLISTS_BASE = "/playlists"

export const playlistsApi = {
  list: async (): Promise<PlaylistSummary[]> => {
    const { data } = await api.get<PlaylistSummary[]>(PLAYLISTS_BASE)
    return data
  },

  get: async (id: string): Promise<PlaylistDetail | null> => {
    try {
      const { data } = await api.get<PlaylistDetail>(`${PLAYLISTS_BASE}/${id}`)
      return data
    } catch (error) {
      // The axios interceptor normalizes errors to ApiError before they reach
      // here, so match on the error code rather than the raw HTTP response.
      if (error instanceof ApiError && error.code === "NOT_FOUND") {
        return null
      }
      throw error
    }
  },

  getItems: async (id: string): Promise<PlaylistItem[]> => {
    const { data } = await api.get<PlaylistItem[]>(`${PLAYLISTS_BASE}/${id}/items`)
    return data
  },

  getScreensUsing: async (id: string): Promise<ScreenSummary[]> => {
    const { data } = await api.get<ScreenSummary[]>(
      `${PLAYLISTS_BASE}/${id}/screens`,
    )
    return data
  },

  create: async (payload: CreatePlaylistRequest): Promise<PlaylistDetail> => {
    const { data } = await api.post<PlaylistDetail>(PLAYLISTS_BASE, payload)
    return data
  },

  update: async (
    id: string,
    payload: UpdatePlaylistRequest,
  ): Promise<PlaylistDetail> => {
    const { data } = await api.patch<PlaylistDetail>(
      `${PLAYLISTS_BASE}/${id}`,
      payload,
    )
    return data
  },

  delete: async (ids: string[]): Promise<void> => {
    await api.post(`${PLAYLISTS_BASE}/delete`, { ids })
  },

  duplicate: async (
    id: string,
    payload: DuplicatePlaylistRequest,
  ): Promise<PlaylistDetail> => {
    const { data } = await api.post<PlaylistDetail>(
      `${PLAYLISTS_BASE}/${id}/duplicate`,
      payload,
    )
    return data
  },

  replaceItems: async (
    id: string,
    payload: ReplacePlaylistItemsRequest,
  ): Promise<Playlist> => {
    const { data } = await api.put<Playlist>(
      `${PLAYLISTS_BASE}/${id}/items`,
      payload,
    )
    return data
  },

  addMedia: async (payload: AddMediaToPlaylistsRequest): Promise<void> => {
    await api.post(`${PLAYLISTS_BASE}/add-media`, payload)
  },
}

export { PLAYLISTS_BASE }
