/**
 * URL building for the Live channel app (Twitch / Kick). Kept as a pure,
 * exported helper so it is unit-testable independently of the DOM bundle.
 *
 * Twitch's embed REQUIRES a `parent` query parameter naming the host the iframe
 * is embedded on, or it refuses to play. The bundle passes `window.location
 * .hostname` (the player's own origin, since the embed is served same-origin
 * under `/apps/<slug>/`), which is exactly what Twitch wants. Kick has no such
 * requirement.
 */

export type LivePlatform = 'twitch' | 'kick'

/**
 * Reduce a raw input to a bare channel handle. Accepts the handle itself or a
 * full/partial channel URL (`twitch.tv/shroud`, `https://kick.com/xqc`, a
 * trailing slash, a `?query`), taking the last path segment.
 */
export function parseChannel(input: string): string {
  const raw = input.trim()
  if (!raw) return ''
  let candidate = raw
  if (raw.includes('/')) {
    const withScheme = raw.includes('://') ? raw : `https://${raw}`
    try {
      const segments = new URL(withScheme).pathname.split('/').filter(Boolean)
      candidate = segments[segments.length - 1] ?? ''
    } catch {
      const segments = raw.split('/').filter(Boolean)
      candidate = segments[segments.length - 1] ?? ''
    }
  }
  // Drop any leftover query/hash and a leading '@'.
  return (candidate.split(/[?#]/)[0] ?? '').replace(/^@/, '')
}

// Twitch handles: letters, digits, underscore. Kick also allows hyphen.
const TWITCH_HANDLE = /^[a-zA-Z0-9_]{1,60}$/
const KICK_HANDLE = /^[a-zA-Z0-9_-]{1,60}$/
// A plausible host for Twitch's `parent` (domain or localhost; not an IP-only
// deployment — Twitch rejects those, which the field help calls out).
const HOST = /^[a-z0-9.-]+$/i

/**
 * Build the platform's embed iframe URL, or null when the channel is missing or
 * malformed (the bundle then shows an error rather than a broken frame).
 */
export function toLiveChannelEmbedUrl(
  platform: LivePlatform,
  rawChannel: string,
  opts: { muted: boolean; parent?: string },
): string | null {
  const channel = parseChannel(rawChannel)
  if (!channel) return null
  const muted = opts.muted ? 'true' : 'false'

  if (platform === 'kick') {
    if (!KICK_HANDLE.test(channel)) return null
    const query = new URLSearchParams({ autoplay: 'true', muted })
    return `https://player.kick.com/${encodeURIComponent(channel)}?${query.toString()}`
  }

  // Twitch (default).
  if (!TWITCH_HANDLE.test(channel)) return null
  const parent = opts.parent && HOST.test(opts.parent) ? opts.parent : 'localhost'
  const query = new URLSearchParams({
    channel,
    parent,
    autoplay: 'true',
    muted,
  })
  return `https://player.twitch.tv/?${query.toString()}`
}
