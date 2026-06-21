import { ImageOffIcon, ImagesIcon, TriangleAlertIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { FeaturedCollectionBadges } from "@/features/media/stock/components/FeaturedCollectionBadges"
import { StockMediaFilters } from "@/features/media/stock/components/StockMediaFilters"
import { StockMediaGrid } from "@/features/media/stock/components/StockMediaGrid"
import { StockMediaPreviewDialog } from "@/features/media/stock/components/StockMediaPreviewDialog"
import { useDebouncedValue } from "@/features/media/stock/hooks/useDebouncedValue"
import {
  useStockMediaCurated,
  useStockMediaSearch,
} from "@/features/media/stock/hooks/useStockMedia"
import type {
  StockColor,
  StockMediaItem,
  StockMediaTypeFilter,
  StockOrientation,
} from "@/features/media/stock/types/stockMedia.types"

interface StockMediaTabProps {
  parentId: string | null
  onAddToPlaylist: (mediaId: string) => void
  onAddToScreen: (mediaId: string) => void
}

function StockGridSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
      {Array.from({ length: 10 }).map((_, index) => (
        <Skeleton key={index} className="aspect-[4/3] rounded-xl" />
      ))}
    </div>
  )
}

export function StockMediaTab({
  parentId,
  onAddToPlaylist,
  onAddToScreen,
}: StockMediaTabProps) {
  const { t } = useTranslation()

  const [search, setSearch] = useState("")
  const [mediaType, setMediaType] = useState<StockMediaTypeFilter>("all")
  const [orientation, setOrientation] = useState<StockOrientation | "all">("all")
  const [color, setColor] = useState<StockColor | "all">("all")
  const [previewItem, setPreviewItem] = useState<StockMediaItem | null>(null)

  const debouncedSearch = useDebouncedValue(search, 500)
  const trimmedQuery = debouncedSearch.trim()
  const hasQuery = trimmedQuery.length > 0

  const searchParams = useMemo(
    () => ({
      query: trimmedQuery,
      mediaType,
      ...(orientation !== "all" ? { orientation } : {}),
      ...(mediaType === "image" && color !== "all" ? { color } : {}),
    }),
    [trimmedQuery, mediaType, orientation, color],
  )

  const searchQuery = useStockMediaSearch(searchParams, hasQuery)
  const curatedQuery = useStockMediaCurated(mediaType, !hasQuery)
  const active = hasQuery ? searchQuery : curatedQuery

  const items = useMemo(
    () => active.data?.pages.flatMap((page) => page.items) ?? [],
    [active.data],
  )

  const handleEndReached = () => {
    if (active.hasNextPage && !active.isFetchingNextPage) {
      void active.fetchNextPage()
    }
  }

  const showSkeleton = active.isPending && items.length === 0

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-border pb-4 mb-2">
        <StockMediaFilters
          search={search}
          onSearchChange={setSearch}
          mediaType={mediaType}
          onMediaTypeChange={setMediaType}
          orientation={orientation}
          onOrientationChange={setOrientation}
          color={color}
          onColorChange={setColor}
          refinementsDisabled={!hasQuery}
        />

        <FeaturedCollectionBadges
          activeQuery={trimmedQuery}
          onSelect={setSearch}
        />
      </div>

      <div className="min-h-0 flex-1">
        {showSkeleton ? (
          <StockGridSkeleton />
        ) : active.isError ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlertIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{t("media.stock.error.title")}</EmptyTitle>
              <EmptyDescription>
                {t("media.stock.error.description")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : items.length === 0 ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {hasQuery ? (
                  <ImageOffIcon aria-hidden />
                ) : (
                  <ImagesIcon aria-hidden />
                )}
              </EmptyMedia>
              <EmptyTitle>
                {hasQuery
                  ? t("media.stock.empty.searchTitle")
                  : t("media.stock.empty.title")}
              </EmptyTitle>
              <EmptyDescription>
                {hasQuery
                  ? t("media.stock.empty.searchDescription")
                  : t("media.stock.empty.description")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <StockMediaGrid
            items={items}
            isFetchingNextPage={active.isFetchingNextPage}
            onEndReached={handleEndReached}
            onSelect={setPreviewItem}
          />
        )}
      </div>

      <StockMediaPreviewDialog
        item={previewItem}
        open={!!previewItem}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPreviewItem(null)
        }}
        parentId={parentId}
        onAddToPlaylist={onAddToPlaylist}
        onAddToScreen={onAddToScreen}
      />
    </div>
  )
}
