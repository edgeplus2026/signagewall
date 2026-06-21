import type {
  ImportStockMediaRequest,
  StockMediaItem,
  StockMediaItemType,
  StockMediaPage,
  StockMediaSearchParams,
  StockMediaTypeFilter,
} from "@/features/media/stock/types/stockMedia.types"
import type { MediaItem } from "@/features/media/types/media.types"
import { api } from "@/lib/axios"

const STOCK_BASE = "/stock-media"

// Import downloads the asset from the provider and uploads it to storage
// server-side, so it can run well past the default request timeout.
const IMPORT_TIMEOUT_MS = 120_000

interface PageRequest {
  page: number
  perPage: number
  signal?: AbortSignal
}

export const stockMediaApi = {
  search: async (
    params: StockMediaSearchParams & PageRequest,
  ): Promise<StockMediaPage> => {
    const { signal, ...rest } = params
    const { data } = await api.get<StockMediaPage>(`${STOCK_BASE}/search`, {
      params: {
        query: rest.query,
        page: rest.page,
        perPage: rest.perPage,
        mediaType: rest.mediaType,
        ...(rest.orientation ? { orientation: rest.orientation } : {}),
        ...(rest.color ? { color: rest.color } : {}),
      },
      ...(signal ? { signal } : {}),
    })
    return data
  },

  curated: async (
    params: PageRequest & { mediaType: StockMediaTypeFilter },
  ): Promise<StockMediaPage> => {
    const { data } = await api.get<StockMediaPage>(`${STOCK_BASE}/curated`, {
      params: {
        page: params.page,
        perPage: params.perPage,
        mediaType: params.mediaType,
      },
      ...(params.signal ? { signal: params.signal } : {}),
    })
    return data
  },

  getItem: async (
    id: string,
    mediaType: StockMediaItemType,
  ): Promise<StockMediaItem> => {
    const { data } = await api.get<StockMediaItem>(`${STOCK_BASE}/item/${id}`, {
      params: { mediaType },
    })
    return data
  },

  import: async (payload: ImportStockMediaRequest): Promise<MediaItem> => {
    const { data } = await api.post<MediaItem>(`${STOCK_BASE}/import`, payload, {
      timeout: IMPORT_TIMEOUT_MS,
    })
    return data
  },
}

export { STOCK_BASE }
