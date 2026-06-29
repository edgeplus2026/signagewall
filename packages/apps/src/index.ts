import type { AppManifest } from '@edge/apps-contract'

import { clockManifest } from './clock/manifest.js'
import { countdownManifest } from './countdown/manifest.js'
import { fxManifest } from './fx/manifest.js'
import { gcalManifest } from './gcal/manifest.js'
import { onedriveManifest } from './onedrive/manifest.js'
import { qrManifest } from './qr/manifest.js'
import { rssManifest } from './rss/manifest.js'
import { slidesManifest } from './slides/manifest.js'
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
  countdownManifest,
  webManifest,
  youtubeManifest,
  weatherManifest,
  rssManifest,
  fxManifest,
  gcalManifest,
  slidesManifest,
  onedriveManifest,
]

export {
  clockManifest,
  textManifest,
  qrManifest,
  countdownManifest,
  webManifest,
  youtubeManifest,
  weatherManifest,
  rssManifest,
  fxManifest,
  gcalManifest,
  slidesManifest,
  onedriveManifest,
}
export { parseYouTubeId, toYouTubeEmbedUrl } from './youtube/embed.js'

export type { WeatherPayload, WeatherDaily } from './weather/payload.js'
export type { RssPayload, RssItem } from './rss/payload.js'
export type { FxPayload } from './fx/payload.js'
export type { GcalPayload, GcalEvent } from './gcal/payload.js'
export type { OneDrivePayload } from './onedrive/payload.js'
