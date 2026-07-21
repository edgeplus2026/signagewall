import { mediaFrameHtml, qrPanelHtml } from '../chrome.js'
import { escapeHtml, timeAgo } from '../format.js'
import type { RssTemplate, RssTemplateContext } from './index.js'
import './primetime.css'

/**
 * "Primetime" — the streaming-service hero.
 *
 * One story fills the screen as a backdrop, its title set large over a gradient
 * that runs sideways rather than up, and a rail of what's coming next sits along
 * the bottom. It is a shape everyone already knows how to read, which is exactly
 * why it works: nobody has to learn the screen.
 *
 * The rail is not decoration. A single story on a wall gives a passer-by no reason
 * to keep watching; a rail that says there are four more, and shows them, is the
 * reason they stay.
 */

/** Enough to promise more, few enough that each one is still a picture. */
const RAIL = 4

export const primetimeTemplate: RssTemplate = {
  rotates: true,

  render(ctx: RssTemplateContext): string {
    const total = ctx.items.length
    const item = ctx.items[ctx.index]
    if (item === undefined) {
      return ''
    }

    const qr = qrPanelHtml(ctx.qr(item.link))
    const date = timeAgo(item.publishedAt)
    const summary = item.summary ?? ''

    // What is literally next, in order, wrapping — so the rail is never padded out
    // with the story already filling the screen behind it.
    const upNext = Array.from({ length: Math.min(RAIL, total - 1) }, (_unused, i) => {
      const next = ctx.items[(ctx.index + i + 1) % total]!
      return `
        <li class="pt-card">
          ${mediaFrameHtml(next, 'pt-card-art')}
          <div class="pt-card-title">${escapeHtml(next.title)}</div>
        </li>`
    }).join('')

    const rail =
      upNext === ''
        ? ''
        : `<div class="pt-rail">
             <div class="pt-rail-label">Up next</div>
             <ul class="pt-cards">${upNext}</ul>
           </div>`

    return `
      <div class="pt${rail ? ' has-rail' : ''}${qr ? ' has-qr' : ''}" data-template-root>
        ${mediaFrameHtml(item, 'pt-backdrop')}
        <div class="pt-fade"></div>
        <div class="pt-hero">
          ${ctx.feedTitle ? `<div class="pt-brand">${escapeHtml(ctx.feedTitle)}</div>` : ''}
          <h1 class="pt-title">${escapeHtml(item.title)}</h1>
          ${summary ? `<p class="pt-summary">${escapeHtml(summary)}</p>` : ''}
          ${date ? `<div class="pt-meta">${escapeHtml(date)}</div>` : ''}
        </div>
        ${rail}
        ${qr}
      </div>`
  },
}
