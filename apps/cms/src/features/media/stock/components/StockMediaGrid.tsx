import { VirtuosoGrid, type GridComponents } from "react-virtuoso"

import { Skeleton } from "@/components/ui/skeleton"
import { StockMediaCard } from "@/features/media/stock/components/StockMediaCard"
import type { StockMediaItem } from "@/features/media/stock/types/stockMedia.types"

interface GridContext {
  isFetchingNextPage: boolean
}

const LIST_CLASS_NAME =
  "grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3"

const GridFooter: NonNullable<GridComponents<GridContext>["Footer"]> = ({
  context,
}) => {
  if (!context.isFetchingNextPage) {
    return null
  }

  return (
    <div className={`${LIST_CLASS_NAME} pt-3`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="aspect-[4/3] rounded-xl" />
      ))}
    </div>
  )
}

interface StockMediaGridProps {
  items: StockMediaItem[]
  isFetchingNextPage: boolean
  onEndReached: () => void
  onSelect: (item: StockMediaItem) => void
}

export function StockMediaGrid({
  items,
  isFetchingNextPage,
  onEndReached,
  onSelect,
}: StockMediaGridProps) {
  return (
    <VirtuosoGrid
      data={items}
      context={{ isFetchingNextPage }}
      endReached={onEndReached}
      // Virtuoso keeps only visible rows in the DOM, so thousands of results
      // never degrade the page.
      overscan={400}
      listClassName={LIST_CLASS_NAME}
      components={{ Footer: GridFooter }}
      itemContent={(_, item) => (
        <StockMediaCard item={item} onClick={onSelect} />
      )}
      style={{ height: "100%" }}
    />
  )
}
