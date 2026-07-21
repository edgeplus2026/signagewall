import { mediaFrameHtml, qrPanelHtml } from '../chrome.js'
import { escapeHtml, timeAgo } from '../format.js'
import type { RssTemplate, RssTemplateContext } from './index.js'
import './cover.css'

/**
 * "Cover" — the photo takes the whole screen and the headline sits on top of it.
 *
 * Where the story layout is a page you read, this is a poster you look up at: a
 * full-bleed picture drifting slowly behind a scrim, one enormous headline, and
 * very little else. It is built for the glance from across a room.
 *
 * The headline arrives WORD BY WORD, each one rising out of its own mask. That
 * is the whole trick, and it is worth the ~15 lines it costs: a block of text
 * that simply fades in reads as a page loading, while words that arrive in
 * reading order read as something being said. On a wall, people look up.
 *
 * A feed with no pictures doesn't get a hole where the photo should be — it gets
 * a mesh gradient built from the accent, which is a deliberate-looking cover in
 * its own right rather than an apology for a missing image.
 */

/** Cap the stagger so a 20-word headline doesn't take half the story to land. */
const MAX_WORDS = 24

/**
 * The headline, one masked word per span. `--i` is the word's place in the
 * queue; `cover.css` turns it into a delay. Every word is escaped — this is a
 * stranger's headline going into `innerHTML`.
 */
function kineticHeadline(title: string): string {
  return title
    .split(/\s+/)
    .filter((word) => word !== '')
    .slice(0, MAX_WORDS)
    .map(
      (word, i) =>
        `<span class="cv-word" style="--i:${i}"><span>${escapeHtml(word)}</span></span>`,
    )
    .join(' ')
}

export const coverTemplate: RssTemplate = {
  rotates: true,

  render(ctx: RssTemplateContext): string {
    const item = ctx.items[ctx.index]
    if (item === undefined) {
      return ''
    }

    const qr = qrPanelHtml(ctx.qr(item.link))
    const date = timeAgo(item.publishedAt)
    const summary = item.summary ?? ''

    return `
      <div class="cv${qr ? ' has-qr' : ''}" data-template-root>
        ${mediaFrameHtml(item, 'cv-media')}
        <div class="cv-scrim"></div>
        <div class="cv-content">
          ${ctx.feedTitle ? `<div class="cv-badge">${escapeHtml(ctx.feedTitle)}</div>` : ''}
          <h1 class="cv-headline">${kineticHeadline(item.title)}</h1>
          ${summary ? `<p class="cv-summary">${escapeHtml(summary)}</p>` : ''}
          ${date ? `<div class="cv-date">${escapeHtml(date)}</div>` : ''}
        </div>
        ${qr}
      </div>`
  },
}
