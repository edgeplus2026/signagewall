import type { AppManifest } from '@signagewall/apps-contract'

/** White play glyph — sits on the red brand tile. */
const YOUTUBE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 7.5v9l7-4.5-7-4.5z"/></svg>'

/** Accepts youtube.com/watch, youtu.be, shorts and embed links. */
const YOUTUBE_URL_PATTERN =
  '^https?://(www\\.|m\\.)?(youtube\\.com/(watch\\?v=|embed/|shorts/|v/)|youtu\\.be/).+'

/**
 * YouTube — the first real SignageWall app. Users paste a YouTube link; the player
 * plays the video on screen. Pure client-side (no server connector), so its
 * data source is `static` and its only config is the video URL.
 *
 * Runs as an `embed` bundle (`/apps/youtube/`) like every other app — the
 * player has no per-app native code.
 */
export const youtubeManifest: AppManifest = {
  slug: 'youtube',
  name: 'YouTube',
  tagline: 'Play a YouTube video on your screens',
  description:
    'Paste a YouTube link and play the video across your displays: no downloads, no fuss.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  // Streams the video live from YouTube — nothing to show offline.
  requiresNetwork: true,
  /**
   * Holds one of the device's few video decoders while on screen. Plays video by definition.
   * Signage hardware has very few — the measured Android TV advertises two —
   * and the engine uses this to avoid warming a second video behind it.
   */
  usesVideoDecoder: true,
  icon: YOUTUBE_ICON,
  color: '#FF0000',
  configSchema: [
    {
      key: 'url',
      type: 'url',
      label: 'YouTube link',
      // The old help ("Paste a full YouTube link") only repeated the label. This
      // one says where to get the link, and names the limit up front — a playlist
      // link fails the pattern, and the operator deserves to know why before the
      // form rejects it.
      help: "Copy it from YouTube's address bar, or from its Share button. One video per app, playlists aren't supported.",
      required: true,
      placeholder: 'https://www.youtube.com/watch?v=…',
      validation: { pattern: YOUTUBE_URL_PATTERN },
    },
  ],
}
