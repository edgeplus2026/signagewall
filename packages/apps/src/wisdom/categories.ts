import type { FieldOption } from '@signagewall/apps-contract'

/**
 * The quote categories — the app's whole reason for existing.
 *
 * A gym wants Motivation and Sports on its wall; a doctor's waiting room wants
 * Health & wellness and Life. That is the difference between "a quote app" and an
 * app somebody chooses, and it is why the operator picks SEVERAL of these rather
 * than one: the pools are small enough that a single category on a screen running
 * all day would start repeating itself.
 *
 * These slugs are the contract with the backend's vendored quote corpus
 * (`apps/be/.../connectors/wisdom/quotes.json`, whose rows carry a `categories`
 * array of exactly these strings). A slug listed here with nothing behind it in
 * the corpus is an empty screen, so the connector's spec asserts that every one of
 * them still resolves to a usable pool.
 *
 * The counts below are what the corpus held when it was vendored — recorded so the
 * next person can see at a glance which categories are thin, and think twice before
 * shipping a screen pinned to just one of them.
 */
export const WISDOM_CATEGORIES = [
  { value: 'famous', label: 'Famous quotes' }, // 1015
  { value: 'wisdom', label: 'Wisdom' }, // 878
  { value: 'life', label: 'Life' }, // 668
  { value: 'motivation', label: 'Motivation' }, // 595
  { value: 'love', label: 'Love & friendship' }, // 587
  { value: 'health_wellness', label: 'Health & wellness' }, // 463
  { value: 'humor', label: 'Humor' }, // 451
  { value: 'business', label: 'Business' }, // 443
  { value: 'success', label: 'Success' }, // 434
  { value: 'technology', label: 'Technology & science' }, // 334
  { value: 'sports', label: 'Sports' }, // 123
  { value: 'leadership', label: 'Leadership' }, // 121
] as const

/** The `categories` config values, narrowed to the ones we actually ship. */
export type WisdomCategory = (typeof WISDOM_CATEGORIES)[number]['value']

/**
 * What a screen shows when the operator has picked nothing.
 *
 * Not an empty list: an app whose default is "no categories" is an app whose
 * default is a blank wall. Motivation and Wisdom are the two that suit almost any
 * room, which is exactly what a default has to do.
 */
export const DEFAULT_CATEGORIES: WisdomCategory[] = ['motivation', 'wisdom']

/** The category list as the `multiselect` field's options. */
export function categoryOptions(): FieldOption[] {
  return WISDOM_CATEGORIES.map((category) => ({
    label: category.label,
    value: category.value,
  }))
}

/**
 * The operator's selection, cleaned: unknown slugs dropped (a config can outlive
 * the category it names), duplicates removed, and SORTED.
 *
 * The sort is not cosmetic — it is what makes the connector's cache key stable.
 * `['wisdom','motivation']` and `['motivation','wisdom']` are the same request,
 * and without normalizing here they would be two cache entries and two fetches
 * over the same corpus.
 *
 * An empty selection falls back to the defaults rather than to nothing, for the
 * same reason the default is not empty.
 */
export function normalizeCategories(value: unknown): WisdomCategory[] {
  const known = new Set<string>(WISDOM_CATEGORIES.map((c) => c.value))
  const raw = Array.isArray(value) ? value : []

  const picked = [
    ...new Set(
      raw.filter(
        (item): item is WisdomCategory =>
          typeof item === 'string' && known.has(item),
      ),
    ),
  ].sort()

  return picked.length > 0 ? picked : [...DEFAULT_CATEGORIES].sort()
}
