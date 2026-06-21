/**
 * Quick-access discovery shortcuts shown above the results grid. Each badge
 * runs its `query` against the search endpoint. `labelKey` resolves under
 * `media.stock.collections.*`.
 */
export interface FeaturedCollection {
  labelKey: string
  query: string
}

export const FEATURED_COLLECTIONS: FeaturedCollection[] = [
  { labelKey: "business", query: "business" },
  { labelKey: "technology", query: "technology" },
  { labelKey: "office", query: "office" },
  { labelKey: "food", query: "food" },
  { labelKey: "travel", query: "travel" },
  { labelKey: "nature", query: "nature" },
]
