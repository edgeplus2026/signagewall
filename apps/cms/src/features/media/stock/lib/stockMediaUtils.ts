import type { StockMediaItem, StockOrientation } from "@/features/media/stock/types/stockMedia.types"

/** Formats a duration in seconds as `m:ss`. */
export function formatStockDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const remainder = total % 60
  return `${String(minutes)}:${remainder.toString().padStart(2, "0")}`
}

/** Derives a human orientation label key suffix from an item's dimensions. */
export function getOrientation(item: StockMediaItem): StockOrientation {
  if (item.width === item.height) return "square"
  return item.width > item.height ? "landscape" : "portrait"
}
