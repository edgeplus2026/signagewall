import type { AppManifest } from '@signagewall/apps-contract'

import { airqualityManifest } from './airquality/manifest.js'
import { alertManifest } from './alert/manifest.js'
import { canvaManifest } from './canva/manifest.js'
import { clockManifest } from './clock/manifest.js'
import { countdownManifest } from './countdown/manifest.js'
import { cryptoManifest } from './crypto/manifest.js'
import { currencyManifest } from './currency/manifest.js'
import { facebookManifest } from './facebook/manifest.js'
import { gcalManifest } from './gcal/manifest.js'
import { gsheetsManifest } from './gsheets/manifest.js'
import { gslidesManifest } from './gslides/manifest.js'
import { holidaysManifest } from './holidays/manifest.js'
import { instagramManifest } from './instagram/manifest.js'
import { linkedinManifest } from './linkedin/manifest.js'
import { menuManifest } from './menu/manifest.js'
import { onthisdayManifest } from './onthisday/manifest.js'
import { outlookManifest } from './outlook/manifest.js'
import { pdfManifest } from './pdf/manifest.js'
import { powerbiManifest } from './powerbi/manifest.js'
import { powerPricesManifest } from './power-prices/manifest.js'
import { powerpointManifest } from './powerpoint/manifest.js'
import { qrManifest } from './qr/manifest.js'
import { rssManifest } from './rss/manifest.js'
import { NEWS_MANIFESTS } from './rss/news.js'
import { streamManifest } from './stream/manifest.js'
import { teamsManifest } from './teams/manifest.js'
import { textManifest } from './text/manifest.js'
import { tickerManifest } from './ticker/manifest.js'
import { weatherManifest } from './weather/manifest.js'
import { webManifest } from './web/manifest.js'
import { wisdomManifest } from './wisdom/manifest.js'
import { youtubeManifest } from './youtube/manifest.js'

/**
 * The registry of all app manifests. The backend syncs these into the catalog;
 * the CMS/player resolve app-specific behaviour by slug. Add a new app by
 * creating `src/<slug>/manifest.ts` and listing it here. The matching player
 * runtime is the `embed` bundle under `embeds/<slug>/`.
 */
export const APP_MANIFESTS: AppManifest[] = [
  clockManifest,
  textManifest,
  tickerManifest,
  qrManifest,
  countdownManifest,
  menuManifest,
  alertManifest,
  webManifest,
  powerbiManifest,
  youtubeManifest,
  streamManifest,
  weatherManifest,
  airqualityManifest,
  currencyManifest,
  cryptoManifest,
  powerPricesManifest,
  gcalManifest,
  canvaManifest,
  rssManifest,
  wisdomManifest,
  pdfManifest,
  powerpointManifest,
  holidaysManifest,
  onthisdayManifest,
  gsheetsManifest,
  gslidesManifest,
  outlookManifest,
  instagramManifest,
  facebookManifest,
  linkedinManifest,
  teamsManifest,
  // Branded news apps built from the RSS app (CNN, BBC, …) — same runtime,
  // fixed feed URL. See src/rss/news.ts.
  ...NEWS_MANIFESTS,
]

export {
  clockManifest,
  textManifest,
  tickerManifest,
  qrManifest,
  countdownManifest,
  menuManifest,
  alertManifest,
  webManifest,
  powerbiManifest,
  youtubeManifest,
  streamManifest,
  weatherManifest,
  airqualityManifest,
  currencyManifest,
  cryptoManifest,
  powerPricesManifest,
  gcalManifest,
  canvaManifest,
  rssManifest,
  wisdomManifest,
  pdfManifest,
  powerpointManifest,
  holidaysManifest,
  onthisdayManifest,
  gsheetsManifest,
  gslidesManifest,
  outlookManifest,
  instagramManifest,
  facebookManifest,
  linkedinManifest,
  teamsManifest,
}
export {
  NEWS_MANIFESTS,
  NEWS_PRESETS,
  newsFeedManifest,
} from './rss/news.js'
export type { NewsPreset } from './rss/news.js'

export { APP_CATEGORIES, APP_CATEGORY_MEMBERSHIP } from './categories.js'
export type { AppCategoryDef } from './categories.js'
export { parseYouTubeId, toYouTubeEmbedUrl } from './youtube/embed.js'
export {
  FONT_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  STYLE_SECTION,
  styleFields,
} from './_shared/style-fields.js'
export type { StyleFieldDefaults } from './_shared/style-fields.js'
export { DEFAULT_ACCENT } from './_shared/theme.js'

export {
  CURRENCIES,
  DEFAULT_CURRENCY,
  currencyOptions,
  currencySymbol,
} from './_shared/currency.js'
export type { CurrencyCode, CurrencyPosition } from './_shared/currency.js'
export { TABULAR_SOURCES, tabularSourceFields } from './_shared/tabular-source.js'
export type { TabularSource, TabularSourceOptions } from './_shared/tabular-source.js'

export {
  DEFAULT_MENU_TEMPLATE,
  MENU_TEMPLATES,
  menuTemplateOptions,
  RETIRED_MENU_TEMPLATES,
} from './menu/templates.js'
export type { MenuTemplate } from './menu/templates.js'
export type { MenuItem, MenuSyncPayload } from './menu/payload.js'

export {
  DEFAULT_DISPLAY_MODE,
  RSS_DISPLAY_MODES,
  displayModeOptions,
} from './rss/display-modes.js'
export type { RssDisplayMode } from './rss/display-modes.js'

export {
  DEFAULT_WEATHER_MODE,
  WEATHER_DISPLAY_MODES,
  weatherDisplayModeOptions,
} from './weather/display-modes.js'
export type { WeatherDisplayMode } from './weather/display-modes.js'

export {
  CLOCK_FACES,
  DEFAULT_CLOCK_FACE,
  clockFaceOptions,
} from './clock/faces.js'
export type { ClockFace } from './clock/faces.js'

export {
  DEFAULT_CATEGORIES,
  WISDOM_CATEGORIES,
  categoryOptions,
  normalizeCategories,
} from './wisdom/categories.js'
export type { WisdomCategory } from './wisdom/categories.js'
export { WISDOM_DESIGNS } from './wisdom/designs.js'
export type { WisdomDesign } from './wisdom/designs.js'
export {
  MAX_QUOTE_LENGTH,
  QUOTE_COUNT,
  SECONDS_PER_QUOTE,
  UPSTREAM_QUOTES,
} from './wisdom/limits.js'
export type { WisdomPayload, WisdomQuote } from './wisdom/payload.js'

export type {
  WeatherPayload,
  WeatherDaily,
  WeatherHour,
} from './weather/payload.js'
export type { GcalPayload, GcalEvent } from './gcal/payload.js'
export type { CanvaPayload } from './canva/payload.js'
export type { PowerPointPayload } from './powerpoint/payload.js'
export {
  POWERPOINT_EMBED_URL_PATTERN,
  POWERPOINT_SOURCE_EMBED,
  POWERPOINT_SOURCE_MICROSOFT,
  normalizePowerPointEmbedUrl,
  resolvePowerPointSource,
} from './powerpoint/source.js'
export type { PowerPointSource } from './powerpoint/source.js'
export type { RssPayload, RssItem } from './rss/payload.js'
export type { TickerPayload } from './ticker/payload.js'
export type { FxPayload, FxRate } from './currency/payload.js'
export type { AirQualityPayload } from './airquality/payload.js'
export type {
  PowerPricesPayload,
  PowerHour,
} from './power-prices/payload.js'
export {
  AREA_OPTIONS as POWER_AREA_OPTIONS,
  DEFAULT_AREA as DEFAULT_POWER_AREA,
  POWER_AREAS,
  powerAreaByValue,
} from './power-prices/areas.js'
export type { PowerArea } from './power-prices/areas.js'

export { COIN_LIST, COINS_BY_ID, coinOptions } from './crypto/coins.js'
export type { Coin } from './crypto/coins.js'
export type { CryptoPayload, CryptoCoin } from './crypto/payload.js'
export type { HolidaysPayload, Holiday } from './holidays/payload.js'
export { HOLIDAY_COUNTRIES, holidayCountryName } from './holidays/countries.js'
export type { OnThisDayPayload, OnThisDayEvent } from './onthisday/payload.js'
export type { GsheetsPayload } from './gsheets/payload.js'
export type { GslidesPayload } from './gslides/payload.js'
export type { SocialPayload, SocialPost } from './social/payload.js'
