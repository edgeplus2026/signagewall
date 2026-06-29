/**
 * A catalog category for grouping apps (e.g. "Productivity", "Media").
 * Managed by the super-admin; apps reference categories by id (an app can
 * belong to several). Categories are presentation/discovery metadata on the
 * catalog — they are not part of an app's code manifest.
 */
export interface AppCategory {
  id: string
  name: string
  /** URL/filter-friendly identifier, derived from the name. */
  slug: string
  /** Display order in the catalog (ascending). */
  order: number
}
