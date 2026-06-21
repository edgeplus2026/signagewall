import type { AppManifest } from '@edge/apps-contract'

/** White play glyph — sits on the red brand tile. */
const YOUTUBE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 7.5v9l7-4.5-7-4.5z"/></svg>'

/** Accepts youtube.com/watch, youtu.be, shorts and embed links. */
const YOUTUBE_URL_PATTERN =
  '^https?://(www\\.|m\\.)?(youtube\\.com/(watch\\?v=|embed/|shorts/|v/)|youtu\\.be/).+'

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
  icon: YOUTUBE_ICON,
  color: '#FF0000',
  configSchema: [
    {
      key: 'url',
      type: 'url',
      label: 'YouTube video URL',
      help: 'Paste a full YouTube link',
      required: true,
      placeholder: 'https://www.youtube.com/watch?v=…',
      validation: { pattern: YOUTUBE_URL_PATTERN },
    },
  ],
}
