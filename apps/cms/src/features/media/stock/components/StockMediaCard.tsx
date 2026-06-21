import { PlayIcon } from "lucide-react"

import { formatStockDuration } from "@/features/media/stock/lib/stockMediaUtils"
import type { StockMediaItem } from "@/features/media/stock/types/stockMedia.types"
import { cn } from "@/lib/utils"

interface StockMediaCardProps {
  item: StockMediaItem
  onClick: (item: StockMediaItem) => void
}

export function StockMediaCard({ item, onClick }: StockMediaCardProps) {
  const isVideo = item.mediaType === "video"

  return (
    <button
      type="button"
      onClick={() => {
        onClick(item)
      }}
      className={cn(
        "group flex w-full flex-col gap-1.5 text-left",
        "focus-visible:outline-none",
      )}
    >
      <div className="bg-sidebar relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-secondary">
        <img
          src={item.thumbnailUrl}
          alt={item.alt ?? item.author}
          loading="lazy"
          className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        />

        {isVideo ? (
          <>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex size-9 items-center justify-center rounded-full bg-black/55 text-white opacity-90 transition-opacity group-hover:opacity-100">
                <PlayIcon className="size-4 translate-x-px fill-current" />
              </span>
            </span>
            {item.duration !== undefined ? (
              <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-medium text-white">
                {formatStockDuration(item.duration)}
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      <p className="text-secondary truncate text-xs" title={item.author}>
        {item.author}
      </p>
    </button>
  )
}
