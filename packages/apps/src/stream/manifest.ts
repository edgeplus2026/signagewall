import type { AppManifest } from '@signagewall/apps-contract'

const STREAM_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>'

/** Any http(s) URL. The embed figures out the format from the link (or the Source override). */
const STREAM_URL_PATTERN = '^https?://.+'

/**
 * Live stream — plays a live video from many sources: an HLS/DASH stream, a
 * direct video file, a WebRTC (WHEP) feed, or a channel/clip on Twitch, Kick,
 * YouTube, Vimeo, Facebook or Dailymotion. The embed auto-detects the format
 * from the link (or the operator can force it with "Source"). Stream libraries
 * (hls.js / dash.js) load on demand; the platform players run in a sandboxed
 * iframe.
 *
 * Streams live, so it `requiresNetwork` and is hidden from rotation while
 * offline. Like YouTube it is torn down while off-screen (a preloaded, hidden
 * item must not keep a socket open or make noise) and mounted on activation.
 *
 * Note: RTMP (`rtmp://`) and RTSP (`rtsp://`) can't play in a browser — convert
 * them to HLS/WebRTC at the source. The form rejects those protocols with a
 * clear message rather than failing silently.
 */
export const streamManifest: AppManifest = {
  slug: 'stream',
  name: 'Live stream',
  tagline: 'Play a live video stream on your screens',
  description:
    'Show a live video — an HLS/DASH stream, a video file, a WebRTC feed, or a Twitch, Kick, YouTube, Vimeo, Facebook or Dailymotion channel.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 2,
  requiresNetwork: true,
  icon: STREAM_ICON,
  color: '#DC2626',
  configSchema: [
    {
      key: 'url',
      type: 'url',
      label: 'Stream link',
      // The failure mode is a silent black screen, so tell them exactly what a
      // good link looks like across the formats we accept.
      help: 'Paste the stream link — an .m3u8 / .mpd URL, a direct video file, a WebRTC (WHEP) endpoint, or the page of a Twitch / Kick / YouTube / Vimeo / Facebook / Dailymotion video or channel.',
      required: true,
      placeholder: 'https://example.com/live/stream.m3u8',
      validation: { pattern: STREAM_URL_PATTERN },
    },
    {
      key: 'source',
      type: 'select',
      label: 'Source',
      help: 'Leave on Auto-detect — SignageWall reads the format from the link. Only override it if a link is unusual (e.g. a WHEP endpoint with no .mpd/.m3u8 ending).',
      default: 'auto',
      options: [
        { label: 'Auto-detect (recommended)', value: 'auto' },
        { label: 'HLS stream (.m3u8)', value: 'hls' },
        { label: 'MPEG-DASH (.mpd)', value: 'dash' },
        { label: 'Video file (MP4 / WebM)', value: 'file' },
        { label: 'WebRTC (WHEP)', value: 'whep' },
        { label: 'Twitch', value: 'twitch' },
        { label: 'Kick', value: 'kick' },
        { label: 'YouTube', value: 'youtube' },
        { label: 'Vimeo', value: 'vimeo' },
        { label: 'Facebook', value: 'facebook' },
        { label: 'Dailymotion', value: 'dailymotion' },
      ],
    },
    {
      key: 'fit',
      type: 'select',
      label: 'Fit',
      help: 'Contain shows the whole picture (with bars if needed). Cover fills the screen and may crop the edges. Only applies to direct streams — platform players size themselves.',
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
