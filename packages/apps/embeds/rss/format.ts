/**
 * Rendering helpers shared by the RSS templates.
 *
 * Everything a template renders came out of somebody else's feed, so this file
 * is where that data stops being trusted: text is escaped before it reaches
 * `innerHTML`, and URLs are checked to be http(s) before they reach an `src`
 * attribute or a QR code. A feed that ships `javascript:…` as its image gets
 * nothing rendered rather than a script executed.
 */

/** Escape text for interpolation into HTML. */
export function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

/**
 * The value if it is an http(s) URL, else undefined. Applies to every URL that
 * reaches the DOM — `javascript:`, `data:` and `vbscript:` are all rejected.
 */
export function httpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value === '') {
    return undefined
  }
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? value
      : undefined
  } catch {
    return undefined
  }
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * "2h ago" / "3 days ago" — how a newsroom stamps a story, and the reason the
 * publish date is worth showing at all. Uses the player's locale.
 *
 * Returns '' for a missing or unparseable date. A story dated in the future
 * (a feed with a skewed clock — common enough) reads as "now" rather than
 * "in 3 hours", which would look like a bug on the wall.
 */
export function timeAgo(iso: string | undefined, now: number = Date.now()): string {
  if (iso === undefined || iso === '') {
    return ''
  }
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return ''
  }

  const elapsed = Math.max(0, now - then)
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (elapsed < MINUTE) {
    return format.format(0, 'minute')
  }
  if (elapsed < HOUR) {
    return format.format(-Math.floor(elapsed / MINUTE), 'minute')
  }
  if (elapsed < DAY) {
    return format.format(-Math.floor(elapsed / HOUR), 'hour')
  }
  return format.format(-Math.floor(elapsed / DAY), 'day')
}
