import { StagingItemCard } from "@/features/media/components/StagingItemCard"
import { mediaGridClassName } from "@/features/media/lib/mediaActionCardStyles"
import { useStagingStore } from "@/features/media/store/stagingStore"

export function StagingGrid() {
  const items = useStagingStore((state) => state.items)
  const removeItem = useStagingStore((state) => state.removeItem)

  return (
    <div className={mediaGridClassName}>
      {items.map((item) => (
        <StagingItemCard key={item.id} item={item} onRemove={removeItem} />
      ))}
    </div>
  )
}
