import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { stockMediaApi } from "@/features/media/stock/api/stockMediaApi"
import type {
  ImportStockMediaRequest,
  StockMediaItemType,
  StockMediaPage,
  StockMediaSearchParams,
  StockMediaTypeFilter,
} from "@/features/media/stock/types/stockMedia.types"

const STOCK_QUERY_KEY = ["stock-media"] as const

export const STOCK_MEDIA_PER_PAGE = 24

function getNextPageParam(lastPage: StockMediaPage): number | undefined {
  return lastPage.hasMore ? lastPage.page + 1 : undefined
}

export function useStockMediaSearch(
  params: StockMediaSearchParams,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: [...STOCK_QUERY_KEY, "search", params],
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      stockMediaApi.search({
        ...params,
        page: pageParam,
        perPage: STOCK_MEDIA_PER_PAGE,
        signal,
      }),
    getNextPageParam,
  })
}

export function useStockMediaCurated(
  mediaType: StockMediaTypeFilter,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: [...STOCK_QUERY_KEY, "curated", mediaType],
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      stockMediaApi.curated({
        page: pageParam,
        perPage: STOCK_MEDIA_PER_PAGE,
        mediaType,
        signal,
      }),
    getNextPageParam,
  })
}

export function useStockMediaItem(
  id: string | null,
  mediaType: StockMediaItemType | null,
) {
  return useQuery({
    queryKey: [...STOCK_QUERY_KEY, "item", id, mediaType],
    enabled: !!id && !!mediaType,
    queryFn: () => {
      if (!id || !mediaType) {
        throw new Error("Missing stock media item parameters")
      }
      return stockMediaApi.getItem(id, mediaType)
    },
  })
}

export function useImportStockMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ImportStockMediaRequest) =>
      stockMediaApi.import(payload),
    onSuccess: () => {
      // Imported assets are first-class media items — refresh the library.
      void queryClient.invalidateQueries({ queryKey: ["media"] })
    },
  })
}
