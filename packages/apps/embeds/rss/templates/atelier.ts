import { mediaFrameHtml, qrPanelHtml } from '../chrome.js'
import { escapeHtml, timeAgo } from '../format.js'
import type { RssTemplate, RssTemplateContext } from './index.js'
import './atelier.css'

/**
 * "Atelier" — the deluxe edition.
 *
 * Champagne on charcoal. A double gold rule around the plate, a serif set large
 * and loose, small caps tracked out to the point of being architecture, and a
 * great deal of nothing around all of it. Expensive things are mostly empty space
 * and confidence, and this is a layout that does not hurry.
 *
 * It is the one template that changes the app's accent rather than living with it:
 * orange is a news colour, and news is not what this is for. It sets a champagne
 * on the app root instead, so the clock, the progress tiles and the QR frame all
 * come with it — the whole screen goes gold, not just this rectangle.
 */
export const atelierTemplate: RssTemplate = {
  rotates: true,

  render(ctx: RssTemplateContext): string {
    const item = ctx.items[ctx.index]
    if (item === undefined) {
      return ''
    }

    const qr = qrPanelHtml(ctx.qr(item.link), 'Scan')
    const date = timeAgo(item.publishedAt)
    const summary = item.summary ?? ''

    return `
      <div class="at${qr ? ' has-qr' : ''}" data-template-root>
        <div class="at-frame">
          <div class="at-plate">${mediaFrameHtml(item, 'at-media')}</div>
          <div class="at-text">
            ${
              ctx.feedTitle
                ? `<div class="at-house">
                     <span class="at-hair"></span>
                     <span class="at-house-name">${escapeHtml(ctx.feedTitle)}</span>
                     <span class="at-hair"></span>
                   </div>`
                : ''
            }
            <h1 class="at-headline">${escapeHtml(item.title)}</h1>
            <div class="at-flourish"></div>
            ${summary ? `<p class="at-summary">${escapeHtml(summary)}</p>` : ''}
            ${date ? `<div class="at-date">${escapeHtml(date)}</div>` : ''}
          </div>
        </div>
        ${qr}
      </div>`
  },
}
