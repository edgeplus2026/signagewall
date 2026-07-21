/**
 * The app-catalog taxonomy — the single code source of truth for categories.
 *
 * The backend syncs `APP_CATEGORIES` into the `appCategories` collection on boot
 * and assigns each app's categories from `APP_CATEGORY_MEMBERSHIP`; the CMS
 * renders the category *names* from its i18n bundle (`apps.categories.names.<slug>`),
 * so the `name` here is only the English fallback / seed. Categories are NOT
 * hand-edited in the DB — to add a category or recategorize an app, edit this
 * file. This module is intentionally import-free so it can be loaded standalone.
 */
export interface AppCategoryDef {
  /** Stable identifier; the i18n key suffix and catalog filter value. */
  slug: string
  /** English fallback name. Translated in the CMS via i18n. */
  name: string
  /** Display order in the catalog (ascending). */
  order: number
}

export const APP_CATEGORIES: AppCategoryDef[] = [
  { slug: 'announcements', name: 'Announcements & Messages', order: 1 },
  { slug: 'presentations', name: 'Presentations & Documents', order: 2 },
  { slug: 'video', name: 'Video & Streaming', order: 3 },
  { slug: 'dashboards', name: 'Dashboards & Data', order: 4 },
  { slug: 'workplace', name: 'Calendars & Workplace', order: 5 },
  { slug: 'social', name: 'Social Media', order: 6 },
  { slug: 'news', name: 'News & Information', order: 7 },
  { slug: 'weather', name: 'Weather & Environment', order: 8 },
  { slug: 'finance', name: 'Finance & Markets', order: 9 },
  { slug: 'time', name: 'Time & Clocks', order: 10 },
  { slug: 'menus', name: 'Menus & Retail', order: 11 },
]

/**
 * App slug → the category slugs it belongs to. An app may list more than one;
 * it then appears under each. Keep every catalog app present here.
 */
export const APP_CATEGORY_MEMBERSHIP: Record<string, string[]> = {
  // Announcements & Messages
  text: ['announcements'],
  alert: ['announcements'],
  qr: ['announcements'],
  countdown: ['announcements'],
  ticker: ['announcements'],
  // Presentations & Documents
  powerpoint: ['presentations'],
  gslides: ['presentations'],
  pdf: ['presentations'],
  canva: ['presentations'],
  // Video & Streaming
  youtube: ['video'],
  stream: ['video'],
  // Dashboards & Data
  powerbi: ['dashboards'],
  gsheets: ['dashboards'],
  web: ['dashboards'],
  // Calendars & Workplace
  gcal: ['workplace'],
  outlook: ['workplace'],
  teams: ['workplace'],
  // Social Media
  facebook: ['social'],
  instagram: ['social'],
  // News & Information
  rss: ['news'],
  onthisday: ['news'],
  holidays: ['news'],
  wisdom: ['news'],
  // Branded news outlets built from the RSS app (see src/rss/news.ts). Kept in
  // sync with NEWS_PRESETS by hand — this module is intentionally import-free.
  cnn: ['news'],
  bbc: ['news'],
  aljazeera: ['news'],
  guardian: ['news'],
  dw: ['news'],
  france24: ['news'],
  skynews: ['news'],
  // Weather & Environment
  weather: ['weather'],
  airquality: ['weather'],
  // Finance & Markets
  crypto: ['finance'],
  currency: ['finance'],
  'power-prices': ['finance'],
  // Time & Clocks
  clock: ['time'],
  // Menus & Retail
  menu: ['menus'],
}
