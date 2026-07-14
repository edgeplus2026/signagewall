import { mediaFrameHtml, progressBarHtml, qrPanelHtml } from '../chrome.js'
import { escapeHtml, timeAgo } from '../format.js'
import type { RssTemplate, RssTemplateContext } from './index.js'
import './broadcast.css'

/**
 * "Broadcast" — a news channel.
 *
 * The grammar of television, borrowed wholesale: a live flag with a breathing dot,
 * the picture up top, a lower third with the headline, and a crawl of everything
 * else along the bottom. People have been trained to read this shape since before
 * they could read, which is the entire argument for it.
 *
 * The crawl is a real marquee: the headlines are laid out TWICE, end to end, and
 * the track is slid exactly half its width. When it reaches the halfway point the
 * second copy is sitting precisely where the first one started, so it can snap back
 * to zero and nobody sees the join. It's the oldest trick there is and it is still
 * the only one that loops seamlessly without measuring anything in JavaScript.
 */
/**
 * A comfortable reading pace for a crawl. Characters rather than pixels because
 * the template can count characters and cannot measure pixels — and for a single
 * line of one size, the two are proportional enough that the eye can't tell.
 */
const CHARS_PER_SECOND = 11

/** The gap and the ◆ between headlines, in character-widths. */
const SEPARATOR_CHARS = 8

export const broadcastTemplate: RssTemplate = {
  rotates: true,

  render(ctx: RssTemplateContext): string {
    const total = ctx.items.length
    const item = ctx.items[ctx.index]
    if (item === undefined) {
      return ''
    }

    const qr = qrPanelHtml(ctx.qr(item.link))
    const date = timeAgo(item.publishedAt)

    // Everything that isn't on screen right now, in order.
    const rest = Array.from(
      { length: total - 1 },
      (_unused, i) => ctx.items[(ctx.index + i + 1) % total]!,
    )
    const others = rest
      .map((next) => `<span class="bc-crawl-item">${escapeHtml(next.title)}</span>`)
      .join('')

    // A crawl has ONE correct speed, and it isn't "however long the feed is".
    // The animation slides the track by a fixed fraction, so a constant duration
    // would make a two-story crawl inch along and a twenty-story one rip past.
    // Estimate the run's width from the text it holds and hand CSS a duration that
    // holds the pace steady instead.
    const chars = rest.reduce((sum, next) => sum + next.title.length + SEPARATOR_CHARS, 0)
    const seconds = Math.round(chars / CHARS_PER_SECOND)

    // Laid out twice: see the note above about the join.
    const crawl =
      others === ''
        ? ''
        : `<div class="bc-crawl">
             <div class="bc-crawl-track" style="--bc-crawl-seconds:${seconds}s">
               <div class="bc-crawl-run">${others}</div>
               <div class="bc-crawl-run" aria-hidden="true">${others}</div>
             </div>
           </div>`

    return `
      <div class="bc${crawl ? ' has-crawl' : ''}" data-template-root>
        ${progressBarHtml()}
        ${mediaFrameHtml(item, 'bc-shot')}
        <div class="bc-vignette"></div>

        <div class="bc-live">
          <span class="bc-live-dot"></span>
          <span>Live</span>
        </div>

        <div class="bc-third">
          <div class="bc-third-strap">
            ${ctx.feedTitle ? `<span class="bc-third-house">${escapeHtml(ctx.feedTitle)}</span>` : ''}
            ${date ? `<span class="bc-third-time">${escapeHtml(date)}</span>` : ''}
          </div>
          <h1 class="bc-third-headline">${escapeHtml(item.title)}</h1>
          ${/* Inside the third, so the CSS can anchor it to the third's own top
                edge rather than to a guess at how tall the third is. */ ''}
          ${qr}
        </div>

        ${crawl}
      </div>`
  },
}
