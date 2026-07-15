/**
 * Shared Vimeo URL helpers — used by the CMS preview now and by the player embed
 * bundle, so the parsing logic lives in one place (the app's folder). Mirrors
 * `../youtube/embed.ts`.
 */

/** A picked-apart Vimeo link: the numeric id and, for unlisted videos, the hash. */
export interface VimeoRef {
  id: string
  /** Unlisted/private videos carry a hash — `vimeo.com/<id>/<hash>` or `?h=<hash>`. */
  hash?: string
}

/** Only hex-ish tokens are Vimeo hashes; anything else is dropped, not embedded. */
const HASH = /^[A-Za-z0-9]+$/

/**
 * Extract the video id (and optional unlisted hash) from any common Vimeo URL
 * form, or null if it isn't a Vimeo link. Handles the plain `vimeo.com/<id>`,
 * the unlisted `vimeo.com/<id>/<hash>`, `player.vimeo.com/video/<id>?h=<hash>`,
 * and the channel/group/showcase forms (`vimeo.com/channels/x/<id>`, …) by
 * taking the last all-numeric path segment as the id.
 */
export function parseVimeo(url: string): VimeoRef | null {
  if (!url) return null
  try {
    const parsed = new URL(url.trim())
    const host = parsed.hostname.replace(/^www\./, '')
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null

    const segments = parsed.pathname.split('/').filter(Boolean)
    // The id is the last purely-numeric segment — true for every Vimeo URL shape,
    // whether the id sits at the top level or behind a channel/group/showcase path.
    let idIndex = -1
    for (let i = segments.length - 1; i >= 0; i -= 1) {
      if (/^\d+$/.test(segments[i] ?? '')) {
        idIndex = i
        break
      }
    }
    if (idIndex === -1) return null
    const id = segments[idIndex] as string

    // The unlisted hash: an explicit `?h=` wins; otherwise the segment right after
    // a TOP-LEVEL id (`vimeo.com/<id>/<hash>`). A hash never follows a channel id.
    const queryHash = parsed.searchParams.get('h') ?? undefined
    const pathHash = idIndex === 0 ? segments[idIndex + 1] : undefined
    const candidate = queryHash ?? pathHash
    const hash = candidate && HASH.test(candidate) ? candidate : undefined

    return hash ? { id, hash } : { id }
  } catch {
    return null
  }
}

/**
 * Build an autoplaying, looping embed URL, or null if the input isn't a Vimeo
 * link.
 *
 * `muted` sets the `muted` param: the player passes the screen's mute state
 * (volume 0 ⇒ muted) and the CMS preview always passes `true` (a preview is
 * never audible). It's a load-time param, so the caller remounts the iframe to
 * change it. Chrome is stripped for signage — no title/byline/portrait/controls,
 * `autopause=0` so a second Vimeo elsewhere can't pause this one, and `dnt=1` to
 * opt out of tracking.
 */
export function toVimeoEmbedUrl(
  url: string,
  options: { muted?: boolean } = {},
): string | null {
  const ref = parseVimeo(url)
  if (!ref) return null
  const params = new URLSearchParams({
    autoplay: '1',
    muted: options.muted ? '1' : '0',
    loop: '1',
    autopause: '0',
    controls: '0',
    title: '0',
    byline: '0',
    portrait: '0',
    pip: '0',
    dnt: '1',
  })
  if (ref.hash) params.set('h', ref.hash)
  return `https://player.vimeo.com/video/${ref.id}?${params.toString()}`
}
