import type { AppManifest } from '@edge/apps-contract'

import { canvaManifest } from './canva/manifest.js'
import { clockManifest } from './clock/manifest.js'
import { gcalManifest } from './gcal/manifest.js'
import { qrManifest } from './qr/manifest.js'
import { rssManifest } from './rss/manifest.js'
import { textManifest } from './text/manifest.js'
import { weatherManifest } from './weather/manifest.js'
import { webManifest } from './web/manifest.js'
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
  qrManifest,
  webManifest,
  youtubeManifest,
  weatherManifest,
  gcalManifest,
  canvaManifest,
  rssManifest,
]

export {
  clockManifest,
  textManifest,
  qrManifest,
  webManifest,
  youtubeManifest,
  weatherManifest,
  gcalManifest,
  canvaManifest,
  rssManifest,
}
export { parseYouTubeId, toYouTubeEmbedUrl } from './youtube/embed.js'
export {
  FONT_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  STYLE_SECTION,
  styleFields,
} from './_shared/style-fields.js'
export type { StyleFieldDefaults } from './_shared/style-fields.js'

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

export type {
  WeatherPayload,
  WeatherDaily,
  WeatherHour,
} from './weather/payload.js'
export type { GcalPayload, GcalEvent } from './gcal/payload.js'
export type { CanvaPayload } from './canva/payload.js'
export type { RssPayload, RssItem } from './rss/payload.js'
