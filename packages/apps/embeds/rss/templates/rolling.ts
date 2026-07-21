import { mediaFrameHtml, qrPanelHtml } from '../chrome.js'
import { escapeHtml, timeAgo } from '../format.js'
import type { RssTemplate, RssTemplateContext } from './index.js'
import './rolling.css'

/**
 * "Rolling list" — several stories at once, moving like a departures board.
 *
 * Every tick the story at the top has had its turn and leaves, everything below
 * it steps up, and a new one arrives at the bottom. The list is a WINDOW onto the
 * feed rather than a single item: `index` is where the window starts, so the same
 * rotation timer that flips a card in the other layouts slides this one along by
 * one row. It wraps, so it never runs out.
 *
 * A row of tiles would be nonsense here — "which of the twenty stories are we on"
 * is not a question anybody is asking of a list. It gets the single bar instead,
 * which answers the one they do ask: how long until this moves.
 */

/** How many rows fit before they stop being readable from across a room. */
const MAX_ROWS = 5

export const rollingTemplate: RssTemplate = {
  rotates: true,

  render(ctx: RssTemplateContext): string {
    const total = ctx.items.length
    if (total === 0) {
      return ''
    }

    const rows = Math.min(MAX_ROWS, total)
    // The window wraps: row `i` is the story `i` places ahead of the cursor. When
    // the cursor advances, what was row 1 becomes row 0 — the list has stepped up
    // — and the bottom row is a story nobody has seen yet.
    const visible = Array.from(
      { length: rows },
      (_unused, i) => ctx.items[(ctx.index + i) % total]!,
    )

    // The QR is for the story at the TOP: it's the one that has been up longest
    // and is about to go, so it is the one somebody has had time to decide to read.
    const lead = visible[0]!
    const qr = qrPanelHtml(ctx.qr(lead.link))

    const list = visible
      .map((item, i) => {
        const date = timeAgo(item.publishedAt)
        // `is-new` only when the list is actually rolling — with a single row there
        // is nothing to arrive.
        const isNew = rows > 1 && i === rows - 1
        return `
          <li class="rl-row${isNew ? ' is-new' : ''}">
            ${mediaFrameHtml(item, 'rl-thumb')}
            <div class="rl-text">
              <h2 class="rl-title">${escapeHtml(item.title)}</h2>
              ${date ? `<div class="rl-time">${escapeHtml(date)}</div>` : ''}
            </div>
          </li>`
      })
      .join('')

    return `
      <div class="rl${qr ? ' has-qr' : ''}" data-template-root>
        ${ctx.feedTitle ? `<div class="rl-masthead">${escapeHtml(ctx.feedTitle)}</div>` : ''}
        <div class="rl-viewport">
          <ul class="rl-list" style="--rows:${rows}">${list}</ul>
        </div>
        ${qr}
      </div>`
  },
}
