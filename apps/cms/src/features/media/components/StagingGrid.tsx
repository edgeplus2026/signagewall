import { StagingItemCard } from "@/features/media/components/StagingItemCard"
import { mediaGridClassName } from "@/features/media/lib/mediaActionCardStyles"
import { useStagingStore } from "@/features/media/store/stagingStore"

interface StagingGridProps {
  /** Per-item validation errors, keyed by staged item id. */
  errorById: Record<string, string>
}

export function StagingGrid({ errorById }: StagingGridProps) {
  const items = useStagingStore((state) => state.items)
  const removeItem = useStagingStore((state) => state.removeItem)

  return (
    <div className={mediaGridClassName}>
      {items.map((item) => (
        <StagingItemCard
          key={item.id}
          item={item}
          error={errorById[item.id]}
          onRemove={removeItem}
        />
      ))}
    </div>
  )
}
