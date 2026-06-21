import { api } from '@/lib/axios'
import { buildMediaListQuery } from '@/features/media/lib/mediaQuery'
import type {
  CreateFolderRequest,
  ImportFromDriveRequest,
  MediaItem,
  MediaListParams,
  MoveMediaRequest,
  UpdateMediaRequest,
} from '@/features/media/types/media.types'

const MEDIA_BASE = '/media'

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

  importFromDrive: async (_payload: ImportFromDriveRequest): Promise<MediaItem[]> => {
    throw new Error('Google Drive import is not implemented yet')
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
