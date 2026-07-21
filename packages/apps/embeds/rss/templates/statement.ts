import { qrPanelHtml } from '../chrome.js'
import { escapeHtml, timeAgo } from '../format.js'
import type { RssTemplate, RssTemplateContext } from './index.js'
import './statement.css'

/**
 * "Statement" — the headline, and nothing else.
 *
 * No picture. Not "no picture if there isn't one" — no picture, ever, on purpose.
 * It is the only layout here that doesn't render a frame at all, and that is what
 * makes it the right answer for the feeds that have no pictures to give: Hacker
 * News, a mailing list, an internal changelog, a status feed. Those are not
 * stories that were photographed and never will be, and a layout that keeps
 * offering an empty frame to a feed like that is just being polite about a
 * mismatch.
 *
 * So: one headline, set as large as it can be set, centred, with air. On a wall it
 * reads less like a screen and more like something that was printed and hung.
 */
export const statementTemplate: RssTemplate = {
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
      <div class="st${qr ? ' has-qr' : ''}" data-template-root>
        <div class="st-glow"></div>
        <div class="st-block">
          ${ctx.feedTitle ? `<div class="st-house">${escapeHtml(ctx.feedTitle)}</div>` : ''}
          <h1 class="st-headline">${escapeHtml(item.title)}</h1>
          <div class="st-rule"></div>
          ${summary ? `<p class="st-summary">${escapeHtml(summary)}</p>` : ''}
          ${date ? `<div class="st-date">${escapeHtml(date)}</div>` : ''}
        </div>
        ${qr}
      </div>`
  },
}
