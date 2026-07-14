import { mediaFrameHtml, qrPanelHtml } from '../chrome.js'
import { escapeHtml, timeAgo } from '../format.js'
import type { RssTemplate, RssTemplateContext } from './index.js'
import './mosaic.css'

/**
 * "Mosaic" — every story at once.
 *
 * A board, not a slideshow: one lead across the left and four more tiled beside
 * it, all of them up together for the whole slot. It is the layout for a place
 * people walk PAST rather than sit in front of — an office corridor, a reception,
 * a canteen. You get one look, and one look gives you the whole front page.
 *
 * The only template here that does not rotate. `rotates: false` is what says so,
 * and it is not decoration: `main.ts` reads it and runs no timer at all, so the
 * progress tiles are absent (there is nothing to count down to) and the operator's
 * "Seconds per story" simply doesn't apply. That flag has been sitting in the
 * template contract since the first layout was written, waiting for this one.
 *
 * The QR belongs to the lead story only. Five codes on one board is five decisions
 * nobody is going to make while walking.
 */

/** One lead plus four. A sixth tile is a tile nobody reads. */
const TILES = 5

export const mosaicTemplate: RssTemplate = {
  rotates: false,

  render(ctx: RssTemplateContext): string {
    const shown = ctx.items.slice(0, TILES)
    const lead = shown[0]
    if (lead === undefined) {
      return ''
    }

    const qr = qrPanelHtml(ctx.qr(lead.link))
    const leadDate = timeAgo(lead.publishedAt)
    const leadSummary = lead.summary ?? ''

    const tiles = shown
      .slice(1)
      .map(
        (item, i) => `
          <li class="mo-tile" style="--i:${i}">
            ${mediaFrameHtml(item, 'mo-tile-art')}
            <div class="mo-tile-scrim"></div>
            <h2 class="mo-tile-title">${escapeHtml(item.title)}</h2>
          </li>`,
      )
      .join('')

    return `
      <div class="mo" data-template-root>
        ${ctx.feedTitle ? `<div class="mo-house">${escapeHtml(ctx.feedTitle)}</div>` : ''}
        <div class="mo-grid${tiles ? '' : ' is-lead-only'}">
          <div class="mo-lead${qr ? ' has-qr' : ''}">
            ${mediaFrameHtml(lead, 'mo-lead-art')}
            <div class="mo-lead-scrim"></div>
            <div class="mo-lead-text">
              <h1 class="mo-lead-title">${escapeHtml(lead.title)}</h1>
              ${leadSummary ? `<p class="mo-lead-summary">${escapeHtml(leadSummary)}</p>` : ''}
              ${leadDate ? `<div class="mo-lead-date">${escapeHtml(leadDate)}</div>` : ''}
            </div>
            ${qr}
          </div>
          ${tiles ? `<ul class="mo-tiles">${tiles}</ul>` : ''}
        </div>
      </div>`
  },
}
