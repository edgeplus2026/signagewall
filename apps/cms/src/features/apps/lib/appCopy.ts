import { APP_CATEGORIES, APP_CATEGORY_MEMBERSHIP } from '@signagewall/apps'
import type { TFunction } from 'i18next'

/**
 * App-store copy (tagline/description/about) and the category taxonomy are
 * code-defined and translated in the CMS i18n bundle — the backend no longer
 * serves them. Copy is keyed by app slug under `apps.catalog.<slug>.*`; category
 * names under `apps.categories.names.<slug>`. The category set + each app's
 * membership come from the `@signagewall/apps` code registry.
 */
export { APP_CATEGORIES, APP_CATEGORY_MEMBERSHIP }

export function appTagline(t: TFunction, slug: string): string {
  return t(`apps.catalog.${slug}.tagline`, { defaultValue: '' })
}

export function appDescription(t: TFunction, slug: string): string {
  return t(`apps.catalog.${slug}.description`, { defaultValue: '' })
}

export function appAbout(t: TFunction, slug: string): string {
  return t(`apps.catalog.${slug}.about`, { defaultValue: '' })
}

/**
 * The user-facing noun for one configured copy of an app — "countdown", "menu",
 * "location". Per-app override under `apps.itemNouns.<slug>`, falling back to the
 * generic `apps.instances.itemNoun(Plural)` so every app reads naturally without
 * the word "instance". `plural` picks the heading/count form.
 */
export function appItemNoun(t: TFunction, slug: string, plural = false): string {
  const form = plural ? 'other' : 'one'
  const generic = t(`apps.instances.${plural ? 'itemNounPlural' : 'itemNoun'}`)
  return t(`apps.itemNouns.${slug}.${form}`, { defaultValue: generic })
}

export function categoryName(t: TFunction, slug: string): string {
  return t(`apps.categories.names.${slug}`, { defaultValue: slug })
}

/** The category slugs an app belongs to (empty if unlisted). */
export function appCategorySlugs(slug: string): string[] {
  return APP_CATEGORY_MEMBERSHIP[slug] ?? []
}
