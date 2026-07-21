import { parseYouTubeId } from '../../src/youtube/embed.js'

/**
 * How a stream link is played. `hls`/`dash`/`file`/`whep` run in a `<video>`
 * (hls.js / dash.js load on demand; whep is native WebRTC); the platform kinds
 * run in a sandboxed `<iframe>` embed. `blocked` is a browser-unplayable
 * protocol (rtmp/rtsp); `invalid` is anything we can't turn into a player.
 */
export type StreamKind =
  | 'hls'
  | 'dash'
  | 'file'
  | 'whep'
  | 'twitch'
  | 'kick'
  | 'youtube'
  | 'vimeo'
  | 'facebook'
  | 'dailymotion'
  | 'blocked'
  | 'invalid'

export interface ResolvedSource {
  kind: StreamKind
  /** For video kinds (hls/dash/file/whep): the media or WHEP endpoint URL. */
  url?: string
  /** For platform kinds: the embed URL to load in an iframe. */
  frameUrl?: string
}

const VIDEO_KINDS = new Set<StreamKind>(['hls', 'dash', 'file', 'whep'])
const FRAME_KINDS = new Set<StreamKind>([
  'twitch',
  'kick',
  'youtube',
  'vimeo',
  'facebook',
  'dailymotion',
])

export function isVideoKind(kind: StreamKind): boolean {
  return VIDEO_KINDS.has(kind)
}
export function isFrameKind(kind: StreamKind): boolean {
  return FRAME_KINDS.has(kind)
}

function host(url: URL): string {
  return url.hostname.replace(/^www\./, '').toLowerCase()
}

/** Detect the kind from the URL alone (used when Source is "auto"). */
function detectKind(url: URL): StreamKind {
  const h = host(url)
  const path = url.pathname.toLowerCase()
  if (h === 'twitch.tv' || h.endsWith('.twitch.tv')) return 'twitch'
  if (h === 'kick.com' || h.endsWith('.kick.com')) return 'kick'
  if (
    h === 'youtu.be' ||
    h === 'youtube.com' ||
    h.endsWith('.youtube.com') ||
    h === 'youtube-nocookie.com'
  ) {
    return 'youtube'
  }
  if (h === 'vimeo.com' || h.endsWith('.vimeo.com')) return 'vimeo'
  if (h === 'facebook.com' || h.endsWith('.facebook.com') || h === 'fb.watch') {
    return 'facebook'
  }
  if (h === 'dailymotion.com' || h.endsWith('.dailymotion.com') || h === 'dai.ly') {
    return 'dailymotion'
  }
  if (path.endsWith('.mpd')) return 'dash'
  if (path.endsWith('.m3u8')) return 'hls'
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)$/.test(path)) return 'file'
  // Unknown extension: most live signage URLs are HLS without a clean suffix.
  return 'hls'
}

function twitchFrame(url: URL, muted: boolean, parent: string): string | null {
  const segments = url.pathname.split('/').filter(Boolean)
  const params = new URLSearchParams({
    parent,
    autoplay: 'true',
    muted: String(muted),
  })
  if (segments[0] === 'videos' && segments[1]) params.set('video', segments[1])
  else if (segments[0]) params.set('channel', segments[0])
  else return null
  return `https://player.twitch.tv/?${params.toString()}`
}

function kickFrame(url: URL, muted: boolean): string | null {
  const channel = url.pathname.split('/').filter(Boolean)[0]
  if (!channel) return null
  return `https://player.kick.com/${encodeURIComponent(channel)}?autoplay=true&muted=${muted}`
}

function youtubeFrame(url: URL, muted: boolean): string | null {
  let id = parseYouTubeId(url.href)
  if (!id) {
    const match = /^\/(?:live|embed|shorts|v)\/([^/?]+)/.exec(url.pathname)
    id = match?.[1] ?? null
  }
  if (!id) return null
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    controls: '0',
    rel: '0',
    playsinline: '1',
    loop: '1',
    playlist: id,
    modestbranding: '1',
  })
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
}

function vimeoFrame(url: URL, muted: boolean): string | null {
  const id = url.pathname
    .split('/')
    .filter((segment) => /^\d+$/.test(segment))
    .pop()
  if (!id) return null
  const params = new URLSearchParams({
    autoplay: '1',
    muted: muted ? '1' : '0',
    loop: '1',
    controls: '0',
    title: '0',
    byline: '0',
    portrait: '0',
  })
  return `https://player.vimeo.com/video/${id}?${params.toString()}`
}

function facebookFrame(url: URL, muted: boolean): string {
  const params = new URLSearchParams({
    href: url.href,
    autoplay: '1',
    mute: muted ? '1' : '0',
    show_text: 'false',
  })
  return `https://www.facebook.com/plugins/video.php?${params.toString()}`
}

function dailymotionFrame(url: URL, muted: boolean): string | null {
  let id = ''
  if (host(url) === 'dai.ly') {
    id = url.pathname.split('/').filter(Boolean)[0] ?? ''
  } else {
    const match = /^\/video\/([^/?_]+)/.exec(url.pathname)
    id = match?.[1] ?? ''
  }
  if (!id) return null
  const params = new URLSearchParams({
    video: id,
    autoplay: '1',
    mute: muted ? '1' : '0',
  })
  return `https://geo.dailymotion.com/player.html?${params.toString()}`
}

/**
 * Turn the operator's link + Source choice into something playable. `parent` is
 * the host page's hostname (Twitch requires it). `muted` bakes into the platform
 * embed URLs (a load-time param), so the caller remounts the iframe when it flips.
 */
export function resolveSource(
  rawUrl: string,
  source: string,
  muted: boolean,
  parent: string,
): ResolvedSource {
  const raw = rawUrl.trim()
  if (/^(rtmp|rtmps|rtsp|rtsps):/i.test(raw)) return { kind: 'blocked' }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { kind: 'invalid' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { kind: 'invalid' }
  }

  const kind =
    source && source !== 'auto' ? (source as StreamKind) : detectKind(url)

  if (isVideoKind(kind)) return { kind, url: url.href }

  let frameUrl: string | null = null
  switch (kind) {
    case 'twitch':
      frameUrl = twitchFrame(url, muted, parent)
      break
    case 'kick':
      frameUrl = kickFrame(url, muted)
      break
    case 'youtube':
      frameUrl = youtubeFrame(url, muted)
      break
    case 'vimeo':
      frameUrl = vimeoFrame(url, muted)
      break
    case 'facebook':
      frameUrl = facebookFrame(url, muted)
      break
    case 'dailymotion':
      frameUrl = dailymotionFrame(url, muted)
      break
    default:
      return { kind: 'invalid' }
  }
  return frameUrl ? { kind, frameUrl } : { kind: 'invalid' }
}
