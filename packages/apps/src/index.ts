import type { AppManifest } from '@edge/apps-contract'

import { airqualityManifest } from './airquality/manifest.js'
import { canvaManifest } from './canva/manifest.js'
import { clockManifest } from './clock/manifest.js'
import { countdownManifest } from './countdown/manifest.js'
import { cryptoManifest } from './crypto/manifest.js'
import { currencyManifest } from './currency/manifest.js'
import { dashboardManifest } from './dashboard/manifest.js'
import { facebookManifest } from './facebook/manifest.js'
import { gcalManifest } from './gcal/manifest.js'
import { gsheetsManifest } from './gsheets/manifest.js'
import { gslidesManifest } from './gslides/manifest.js'
import { gslidesPublicManifest } from './gslides-public/manifest.js'
import { holidaysManifest } from './holidays/manifest.js'
import { instagramManifest } from './instagram/manifest.js'
import { menuManifest } from './menu/manifest.js'
import { newsManifest } from './news/manifest.js'
import { onthisdayManifest } from './onthisday/manifest.js'
import { outlookManifest } from './outlook/manifest.js'
import { powerPricesManifest } from './power-prices/manifest.js'
import { qrManifest } from './qr/manifest.js'
import { rssManifest } from './rss/manifest.js'
import { sportsManifest } from './sports/manifest.js'
import { stocksManifest } from './stocks/manifest.js'
import { streamManifest } from './stream/manifest.js'
import { sunmoonManifest } from './sunmoon/manifest.js'
import { teamsManifest } from './teams/manifest.js'
import { textManifest } from './text/manifest.js'
import { tickerManifest } from './ticker/manifest.js'
import { vimeoManifest } from './vimeo/manifest.js'
import { weatherManifest } from './weather/manifest.js'
import { webManifest } from './web/manifest.js'
import { wisdomManifest } from './wisdom/manifest.js'
import { worldclockManifest } from './worldclock/manifest.js'
import { youtubeManifest } from './youtube/manifest.js'

/**
 * The registry of all app manifests. The backend syncs these into the catalog;
 * the CMS/player resolve app-specific behaviour by slug. Add a new app by
 * creating `src/<slug>/manifest.ts` and listing it here. The matching player
 * runtime is the `embed` bundle under `embeds/<slug>/`.
 */
export const APP_MANIFESTS: AppManifest[] = [
  clockManifest,
  worldclockManifest,
  textManifest,
  tickerManifest,
  qrManifest,
  countdownManifest,
  menuManifest,
  webManifest,
  dashboardManifest,
  youtubeManifest,
  vimeoManifest,
  streamManifest,
  gslidesPublicManifest,
  weatherManifest,
  airqualityManifest,
  currencyManifest,
  cryptoManifest,
  powerPricesManifest,
  gcalManifest,
  canvaManifest,
  rssManifest,
  newsManifest,
  wisdomManifest,
  holidaysManifest,
  onthisdayManifest,
  sunmoonManifest,
  stocksManifest,
  sportsManifest,
  gsheetsManifest,
  gslidesManifest,
  outlookManifest,
  instagramManifest,
  facebookManifest,
  teamsManifest,
]

export {
  clockManifest,
  worldclockManifest,
  textManifest,
  tickerManifest,
  qrManifest,
  countdownManifest,
  menuManifest,
  webManifest,
  dashboardManifest,
  youtubeManifest,
  vimeoManifest,
  streamManifest,
  gslidesPublicManifest,
  weatherManifest,
  airqualityManifest,
  currencyManifest,
  cryptoManifest,
  powerPricesManifest,
  gcalManifest,
  canvaManifest,
  rssManifest,
  newsManifest,
  wisdomManifest,
  holidaysManifest,
  onthisdayManifest,
  sunmoonManifest,
  stocksManifest,
  sportsManifest,
  gsheetsManifest,
  gslidesManifest,
  outlookManifest,
  instagramManifest,
  facebookManifest,
  teamsManifest,
}
export { parseYouTubeId, toYouTubeEmbedUrl } from './youtube/embed.js'
export { parseVimeo, toVimeoEmbedUrl } from './vimeo/embed.js'
export { toGoogleSlidesEmbedUrl } from './gslides-public/embed.js'
export {
  FONT_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  STYLE_SECTION,
  styleFields,
} from './_shared/style-fields.js'
export type { StyleFieldDefaults } from './_shared/style-fields.js'
export { DEFAULT_ACCENT } from './_shared/theme.js'

export {
  DEFAULT_DISPLAY_MODE,
  RSS_DISPLAY_MODES,
  displayModeOptions,
} from './rss/display-modes.js'
export type { RssDisplayMode } from './rss/display-modes.js'

export {
  NEWS_SOURCES,
  DEFAULT_NEWS_SOURCE,
  newsSourceOptions,
} from './news/sources.js'
export type { NewsSource } from './news/sources.js'

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
export type { RssPayload, RssItem } from './rss/payload.js'
export type { FxPayload, FxRate } from './currency/payload.js'
export type { AirQualityPayload } from './airquality/payload.js'
export type {
  PowerPricesPayload,
  PowerHour,
} from './power-prices/payload.js'

export { COIN_LIST, COINS_BY_ID, coinOptions } from './crypto/coins.js'
export type { Coin } from './crypto/coins.js'
export type { CryptoPayload, CryptoCoin } from './crypto/payload.js'
export type { HolidaysPayload, Holiday } from './holidays/payload.js'
export type { OnThisDayPayload, OnThisDayEvent } from './onthisday/payload.js'
export type { SunMoonPayload } from './sunmoon/payload.js'
export type { StocksPayload, StockQuote } from './stocks/payload.js'
export type { SportsPayload, SportsEvent } from './sports/payload.js'
export type { GsheetsPayload } from './gsheets/payload.js'
export type { GslidesPayload } from './gslides/payload.js'
export type { SocialPayload, SocialPost } from './social/payload.js'
