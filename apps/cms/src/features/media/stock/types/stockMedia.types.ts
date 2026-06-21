export type StockMediaItemType = "image" | "video"

export type StockMediaTypeFilter = "all" | "image" | "video"

export type StockOrientation = "landscape" | "portrait" | "square"

export type StockColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "black"
  | "white"
  | "gray"

/** Provider-agnostic stock item as returned by the backend. */
export interface StockMediaItem {
  id: string
  provider: string
  mediaType: StockMediaItemType
  width: number
  height: number
  thumbnailUrl: string
  previewUrl: string
  videoUrl?: string
  duration?: number
  author: string
  authorUrl?: string
  sourceUrl: string
  alt?: string
}

export interface StockMediaPage {
  items: StockMediaItem[]
  page: number
  perPage: number
  totalResults: number
  hasMore: boolean
}

export interface StockMediaSearchParams {
  query: string
  mediaType: StockMediaTypeFilter
  orientation?: StockOrientation
  color?: StockColor
}

export interface ImportStockMediaRequest {
  id: string
  mediaType: StockMediaItemType
  parentId: string | null
}
