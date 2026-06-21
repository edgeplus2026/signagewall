import type { AppManifest } from '@edge/apps-contract'

import { youtubeManifest } from './youtube/manifest.js'

/**
 * The registry of all app manifests. The backend syncs these into the catalog;
 * the CMS/player resolve app-specific behaviour by slug. Add a new app by
 * creating `src/<slug>/manifest.ts` and listing it here.
 */
export const APP_MANIFESTS: AppManifest[] = [youtubeManifest]

export { youtubeManifest }
export { parseYouTubeId, toYouTubeEmbedUrl } from './youtube/embed.js'
