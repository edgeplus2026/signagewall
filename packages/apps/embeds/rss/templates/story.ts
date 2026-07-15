import { mediaFrameHtml, progressHtml, qrPanelHtml } from '../chrome.js'
import { escapeHtml, timeAgo } from '../format.js'
import type { RssTemplate, RssTemplateContext } from './index.js'
import './story.css'

/**
 * "One story at a time" — picture beside the story, QR code in the corner.
 *
 * The plain one, and the one to reach for when nothing else fits: it never
 * changes shape, it reads at any distance, and it works on a feed with no
 * pictures at all.
 */
export const storyTemplate: RssTemplate = {
  rotates: true,

  render(ctx: RssTemplateContext): string {
    const item = ctx.items[ctx.index]
    if (item === undefined) {
      return ''
    }

    const qr = qrPanelHtml(ctx.qr(item.link))
    const date = timeAgo(item.publishedAt)
    const summary = item.summary ?? ''

    // `has-qr` reserves the corner gutter so the summary can't run under the code.
    return `
      <div class="rs-story${qr ? ' has-qr' : ''}" data-template-root>
        ${progressHtml(ctx.items.length, ctx.index)}
        ${mediaFrameHtml(item, 'rs-story-media')}
        <div class="rs-body">
          ${ctx.feedTitle ? `<div class="rs-source">${escapeHtml(ctx.feedTitle)}</div>` : ''}
          <h1 class="rs-headline">${escapeHtml(item.title)}</h1>
          ${summary ? `<p class="rs-summary">${escapeHtml(summary)}</p>` : ''}
          ${date ? `<div class="rs-date">${escapeHtml(date)}</div>` : ''}
        </div>
        ${qr}
      </div>`
  },
}
