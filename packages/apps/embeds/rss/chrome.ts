import type { RssItem } from '../../src/rss/payload.js'
import { escapeHtml, httpUrl } from './format.js'

/**
 * The furniture every layout wants, so template number nine doesn't start by
 * copying template number one's markup.
 *
 * These answer questions about the ROTATION and about the DATA, not about any one
 * layout: how long until this changes, how do I keep reading it, and what do we
 * put where a picture should have been. Their base styling lives in `style.css`;
 * a template restyles them by nesting under its own root class.
 */

/** The feed's own mark, for a story that came with no picture. */
const RSS_GLYPH =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.18 15.64a2.18 2.18 0 110 4.36 2.18 2.18 0 010-4.36zM4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44zm0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93V10.1z"/></svg>'

/**
 * A story's picture, in a frame that is ALWAYS there.
 *
 * The placeholder sits underneath, always rendered; the picture simply covers it.
 * So a feed that ships no pictures at all (Hacker News, most mailing lists) and a
 * picture that dies on the way (a stale CDN — or just a player with no network,
 * since the payload is cached in the snapshot but the images are not) both land in
 * the same place, and neither changes the shape of the page. A layout that
 * reshapes itself as stories rotate reads as a fault on a wall.
 *
 * `main.ts` watches for `data-fallback` failing and flags `data-media` as
 * `is-broken`; the CSS then just stops drawing the picture.
 */
export function mediaFrameHtml(item: RssItem, className = ''): string {
  const src = httpUrl(item.imageUrl)
  const img =
    src === undefined
      ? ''
      : `<img class="rs-media-img" src="${escapeHtml(src)}" alt="" data-fallback referrerpolicy="no-referrer" />`

  return `
    <div class="rs-media ${className}" data-media>
      <div class="rs-media-ph">${RSS_GLYPH}</div>
      ${img}
    </div>`
}

/**
 * The QR panel for the story on screen. `code` is the pre-generated data URL from
 * the template context — `null` when the operator turned codes off, the story has
 * no link, or it wouldn't encode — and the panel simply isn't there.
 */
export function qrPanelHtml(code: string | null, label = 'Scan to read'): string {
  if (code === null) {
    return ''
  }
  return `
    <div class="rs-qr">
      <img class="rs-qr-img" src="${escapeHtml(code)}" alt="" />
      <div class="rs-qr-label">${escapeHtml(label)}</div>
    </div>`
}
