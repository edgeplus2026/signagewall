import type { AppManifest } from '@edge/apps-contract'

/**
 * YouTube — the first real Edge app. Users paste a YouTube link; the player
 * plays the video on screen. Pure client-side (no server connector), so its
 * data source is `static` and its only config is the video URL.
 */
export const youtubeManifest: AppManifest = {
  slug: 'youtube',
  name: 'YouTube',
  tagline: 'Play a YouTube video on your screens',
  description:
    'Paste a YouTube link and play the video across your displays — no downloads, no fuss.',
  runtimeKind: 'native',
  dataSource: 'static',
  version: 1,
  configSchema: [
    {
      key: 'url',
      type: 'url',
      label: 'YouTube video URL',
      help: 'Paste a full YouTube link, e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      required: true,
      placeholder: 'https://www.youtube.com/watch?v=…',
    },
  ],
}
