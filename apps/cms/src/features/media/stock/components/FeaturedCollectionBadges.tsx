import { useTranslation } from "react-i18next"

import { FEATURED_COLLECTIONS } from "@/features/media/stock/lib/featuredCollections"
import { cn } from "@/lib/utils"

interface FeaturedCollectionBadgesProps {
  activeQuery: string
  onSelect: (query: string) => void
}

export function FeaturedCollectionBadges({
  activeQuery,
  onSelect,
}: FeaturedCollectionBadgesProps) {
  const { t } = useTranslation()
  const normalized = activeQuery.trim().toLowerCase()

  return (
    <div className="flex flex-wrap gap-1.5 lg:justify-end">
      {FEATURED_COLLECTIONS.map((collection) => {
        const isActive = normalized === collection.query.toLowerCase()

        return (
          <button
            key={collection.query}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              onSelect(collection.query)
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-brand bg-brand/10 text-brand"
                : "border-secondary text-secondary hover:border-brand/50 hover:text-primary",
            )}
          >
            #{t(`media.stock.collections.${collection.labelKey}`)}
          </button>
        )
      })}
    </div>
  )
}
