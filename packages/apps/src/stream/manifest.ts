import type { AppManifest } from '@edge/apps-contract'

const STREAM_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>'

/** Any http(s) URL; the embed treats it as an HLS source. */
const STREAM_URL_PATTERN = '^https?://.+'

/**
 * Live stream — plays an HLS (`.m3u8`) video stream: a camera feed, a TV
 * channel, a live event. Pure client-side (`static`); the player uses hls.js
 * where the browser has no native HLS (i.e. everywhere but Safari), so it works
 * on the Chromium-based players. Streams live, so it `requiresNetwork` and is
 * hidden from the rotation while offline.
 *
 * Like the YouTube app, the stream is torn down while off-screen (a preloaded,
 * hidden item must not keep a socket open or make noise) and mounted on activation.
 */
export const streamManifest: AppManifest = {
  slug: 'stream',
  name: 'Live stream',
  tagline: 'Play a live video stream on your screens',
  description:
    'Show a live HLS video stream — a camera, a TV channel, an event feed. Paste the stream\'s .m3u8 link.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 1,
  requiresNetwork: true,
  icon: STREAM_ICON,
  color: '#DC2626',
  configSchema: [
    {
      key: 'url',
      type: 'url',
      label: 'Stream link',
      help: 'The stream\'s HLS address — a link ending in .m3u8.',
      required: true,
      placeholder: 'https://example.com/live/stream.m3u8',
      validation: { pattern: STREAM_URL_PATTERN },
    },
    {
      key: 'fit',
      type: 'select',
      label: 'Fit',
      help: 'Contain shows the whole picture (with bars if needed). Cover fills the screen and may crop the edges.',
      default: 'contain',
      options: [
        { label: 'Contain (show all)', value: 'contain' },
        { label: 'Cover (fill screen)', value: 'cover' },
      ],
    },
    {
      key: 'audio',
      type: 'switch',
      label: 'Play audio',
      // The default is silent: most signage streams are cameras, and audio also
      // depends on the screen's own volume — say both.
      help: 'Off for a silent feed like a camera. On to play the stream\'s sound — it still follows the screen\'s volume.',
      default: false,
    },
  ],
}
