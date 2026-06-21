export type MediaType = "folder" | "image" | "video"

export type MediaSource = "local" | "google_drive" | "pexels"

export type MediaStatus = "processing" | "ready" | "failed"

export type MediaSortField = "name" | "createdAt" | "type" | "size"

export type MediaSortDirection = "asc" | "desc"

export type MediaTypeFilter = "all" | "image" | "video"

export type MediaViewMode = "grid" | "list"

export interface MediaItem {
  id: string
  name: string
  type: MediaType
  parentId: string | null
  createdAt: string
  updatedAt: string
  size?: number
  mimeType?: string
  thumbnailUrl?: string
  thumbnailLargeUrl?: string
  fileUrl?: string
  width?: number
  height?: number
  defaultDuration?: number
  source: MediaSource
  status?: MediaStatus
}

export interface UpdateMediaRequest {
  name?: string
  defaultDuration?: number
}

export interface CreateFolderRequest {
  name: string
  parentId: string | null
}

export interface UploadFileEntry {
  file: File
  width?: number
  height?: number
}

export interface UploadMediaRequest {
  files: UploadFileEntry[]
  type: "image" | "video"
  parentId: string | null
}

export interface MoveMediaRequest {
  ids: string[]
  targetFolderId: string | null
}

export interface ImportFromDriveRequest {
  parentId: string | null
  files: {
    name: string
    type: "image" | "video"
    size: number
    width?: number
    height?: number
  }[]
}

export interface MediaListParams {
  parentId: string | null
  search?: string
  typeFilter?: MediaTypeFilter
  sortBy?: MediaSortField
  sortDirection?: MediaSortDirection
}
