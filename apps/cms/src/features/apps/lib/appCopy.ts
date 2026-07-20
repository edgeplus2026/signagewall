import { APP_CATEGORIES, APP_CATEGORY_MEMBERSHIP } from '@edge/apps'
import type { TFunction } from 'i18next'

/**
 * App-store copy (tagline/description/about) and the category taxonomy are
 * code-defined and translated in the CMS i18n bundle — the backend no longer
 * serves them. Copy is keyed by app slug under `apps.catalog.<slug>.*`; category
 * names under `apps.categories.names.<slug>`. The category set + each app's
 * membership come from the `@edge/apps` code registry.
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

export function categoryName(t: TFunction, slug: string): string {
  return t(`apps.categories.names.${slug}`, { defaultValue: slug })
}

/** The category slugs an app belongs to (empty if unlisted). */
export function appCategorySlugs(slug: string): string[] {
  return APP_CATEGORY_MEMBERSHIP[slug] ?? []
}
