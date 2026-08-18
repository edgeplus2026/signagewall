import type { CloudProvider } from "@/features/media/cloud/types/cloudPick.types"

export type MediaType = "folder" | "image" | "video"

/** Mirrors the backend's `MediaItemSource`; see the note there on retired values. */
export type MediaSource =
  | "local"
  | "google_drive"
  // Retired importer — still present on items imported before it was removed.
  | "google_photos"
  | "onedrive"
  | "sharepoint"
  | "dropbox"
  | "pexels"

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

/** How the backend obtains the bytes for one cloud-imported item. */
export type CloudImportStrategy = "url" | "google-drive" | "msgraph"

/** Flat per-item payload sent to `POST /media/import` (keyed by strategy). */
export interface CloudImportItem {
  provider: CloudProvider
  strategy: CloudImportStrategy
  externalId: string
  name: string
  mimeType: string
  sizeBytes?: number
  width?: number
  height?: number
  // strategy === "url"
  downloadUrl?: string
  authToken?: string
  // strategy === "google-drive"
  fileId?: string
  // strategy === "msgraph"
  endpoint?: string
  driveId?: string
  itemId?: string
  // shared by "google-drive" + "msgraph"
  accessToken?: string
}

export interface ImportCloudMediaRequest {
  parentId: string | null
  items: CloudImportItem[]
}

export interface CloudImportResultItem {
  externalId: string
  status: "imported" | "failed"
  mediaId?: string
  error?: string
  media?: MediaItem
}

export interface CloudImportResponse {
  results: CloudImportResultItem[]
  importedCount: number
  failedCount: number
}

export interface MediaListParams {
  parentId: string | null
  search?: string
  typeFilter?: MediaTypeFilter
  sortBy?: MediaSortField
  sortDirection?: MediaSortDirection
}
