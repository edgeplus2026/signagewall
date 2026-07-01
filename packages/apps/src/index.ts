import type { AppManifest } from '@edge/apps-contract'

import { canvaManifest } from './canva/manifest.js'
import { clockManifest } from './clock/manifest.js'
import { gcalManifest } from './gcal/manifest.js'
import { qrManifest } from './qr/manifest.js'
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
}
export { parseYouTubeId, toYouTubeEmbedUrl } from './youtube/embed.js'

export type { WeatherPayload, WeatherDaily } from './weather/payload.js'
export type { GcalPayload, GcalEvent } from './gcal/payload.js'
export type { CanvaPayload } from './canva/payload.js'
