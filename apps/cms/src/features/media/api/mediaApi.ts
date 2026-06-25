import { buildMediaListQuery } from '@/features/media/lib/mediaQuery'
import type {
  CloudImportResponse,
  CreateFolderRequest,
  ImportCloudMediaRequest,
  MediaItem,
  MediaListParams,
  MoveMediaRequest,
  UpdateMediaRequest,
} from '@/features/media/types/media.types'
import { api } from '@/lib/axios'

const MEDIA_BASE = '/media'

// Cloud import downloads each asset from the provider server-side, so it can
// run well past the default request timeout.
const CLOUD_IMPORT_TIMEOUT_MS = 120_000

export const mediaApi = {
  list: async (params: MediaListParams): Promise<MediaItem[]> => {
    const { data } = await api.get<MediaItem[]>(MEDIA_BASE, {
      params: buildMediaListQuery(params),
    })
    return data
  },

  listMedia: async (params: MediaListParams): Promise<MediaItem[]> => {
    const { data } = await api.get<MediaItem[]>(`${MEDIA_BASE}/files`, {
      params: buildMediaListQuery(params),
    })
    return data
  },

  listAllFolders: async (): Promise<MediaItem[]> => {
    const { data } = await api.get<MediaItem[]>(MEDIA_BASE, {
      params: buildMediaListQuery({ parentId: null, foldersOnly: true, all: true }),
    })
    return data.filter((item) => item.type === 'folder')
  },

  listAllMediaFiles: async (): Promise<MediaItem[]> => {
    const { data } = await api.get<MediaItem[]>(`${MEDIA_BASE}/files`, {
      params: buildMediaListQuery({ parentId: null, all: true }),
    })
    return data
  },

  listFolders: async (parentId: string | null): Promise<MediaItem[]> => {
    const { data } = await api.get<MediaItem[]>(`${MEDIA_BASE}/folders`, {
      params: parentId ? { parentId } : undefined,
    })
    return data
  },

  get: async (id: string): Promise<MediaItem | null> => {
    const { data } = await api.get<MediaItem>(`${MEDIA_BASE}/${id}`)
    return data
  },

  getFolderPath: async (folderId: string | null): Promise<MediaItem[]> => {
    if (!folderId) {
      return []
    }

    const { data } = await api.get<MediaItem[]>(`${MEDIA_BASE}/path`, {
      params: { folderId },
    })
    return data
  },

  createFolder: async (payload: CreateFolderRequest): Promise<MediaItem> => {
    const { data } = await api.post<MediaItem>(`${MEDIA_BASE}/folders`, payload)
    return data
  },

  importCloud: async (
    payload: ImportCloudMediaRequest,
    signal?: AbortSignal,
  ): Promise<CloudImportResponse> => {
    const { data } = await api.post<CloudImportResponse>(
      `${MEDIA_BASE}/import`,
      payload,
      {
        timeout: CLOUD_IMPORT_TIMEOUT_MS,
        ...(signal ? { signal } : {}),
      },
    )
    return data
  },

  update: async (id: string, payload: UpdateMediaRequest): Promise<MediaItem> => {
    const { data } = await api.patch<MediaItem>(`${MEDIA_BASE}/${id}`, payload)
    return data
  },

  move: async (payload: MoveMediaRequest): Promise<void> => {
    await api.post(`${MEDIA_BASE}/move`, payload)
  },

  delete: async (ids: string[]): Promise<void> => {
    await api.post(`${MEDIA_BASE}/delete`, { ids })
  },
}

export { MEDIA_BASE }
