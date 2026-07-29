import { APP_CATEGORIES, APP_CATEGORY_MEMBERSHIP, APP_MANIFESTS } from '@signagewall/apps'
import type { AppManifest } from '@signagewall/apps-contract'

/** Catalog data (registry + membership) reused from the product's shared package. */
export const appManifestBySlug = new Map<string, AppManifest>(APP_MANIFESTS.map((m) => [m.slug, m]))

/** Only apps that belong to at least one category are surfaced on the marketing site. */
export const catalogApps: AppManifest[] = APP_MANIFESTS.filter(
  (m) => (APP_CATEGORY_MEMBERSHIP[m.slug] ?? []).length > 0,
)

export function orderedCategories() {
  return [...APP_CATEGORIES].sort((a, b) => a.order - b.order)
}

export function categoriesForApp(slug: string): string[] {
  return APP_CATEGORY_MEMBERSHIP[slug] ?? []
}

/** Up to `limit` other apps sharing a category with `slug`. */
export function relatedApps(slug: string, limit = 3): AppManifest[] {
  const cats = new Set(categoriesForApp(slug))
  return catalogApps
    .filter((m) => m.slug !== slug && categoriesForApp(m.slug).some((c) => cats.has(c)))
    .slice(0, limit)
}
