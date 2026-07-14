import { mediaFrameHtml, progressHtml, qrPanelHtml } from '../chrome.js'
import { escapeHtml, timeAgo } from '../format.js'
import type { RssTemplate, RssTemplateContext } from './index.js'
import './editorial.css'

/**
 * "Editorial" — the elegant one. A magazine page, not a screen.
 *
 * Everything here is restraint. A serif face, a hairline rule, a lot of air, and
 * a picture standing in portrait like a plate in a printed feature. No scrim, no
 * gradient, no drop shadow. The only thing that moves is the rule, which draws
 * itself across before the words arrive.
 *
 * Reach for it in a lobby, a gallery, a hotel — anywhere a screen shouting would
 * be the wrong thing to do.
 */
export const editorialTemplate: RssTemplate = {
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
      <div class="ed${qr ? ' has-qr' : ''}" data-template-root>
        ${progressHtml(ctx.items.length, ctx.index)}
        <div class="ed-column">
          ${ctx.feedTitle ? `<div class="ed-kicker">${escapeHtml(ctx.feedTitle)}</div>` : ''}
          <div class="ed-rule"></div>
          <h1 class="ed-headline">${escapeHtml(item.title)}</h1>
          ${summary ? `<p class="ed-summary">${escapeHtml(summary)}</p>` : ''}
          ${date ? `<div class="ed-date">${escapeHtml(date)}</div>` : ''}
        </div>
        ${mediaFrameHtml(item, 'ed-plate')}
        ${qr}
      </div>`
  },
}
