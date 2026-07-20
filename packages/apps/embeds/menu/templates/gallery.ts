import { escapeHtml, mediaHtml, pageDotsHtml } from '../format.js'
import type { MenuTemplateContext, MenuTemplateImpl } from './index.js'
import './gallery.css'

/** Cards per rotation page: a 4×2 grid on a landscape screen. */
const PER_PAGE = 8

/**
 * "Gallery" — modern cards with photos. The design for menus whose items have
 * pictures: each item is a card with its photo up top, name and description
 * below, and a price chip riding the photo's corner. Items without a photo get
 * a monogram tile in the accent, so a half-photographed menu still looks
 * composed rather than half-finished.
 *
 * Rotates: boards over eight items page through, eight cards at a time, with
 * indicator dots. Category reads as a small label on the card rather than a
 * section break — cards already give each item its own room.
 */
export const galleryTemplate: MenuTemplateImpl = {
  pageCount(ctx: MenuTemplateContext): number {
    return Math.max(1, Math.ceil(ctx.items.length / PER_PAGE))
  },

  render(ctx: MenuTemplateContext): string {
    const start = ctx.page * PER_PAGE
    const pageItems = ctx.items.slice(start, start + PER_PAGE)
    const count = Math.min(pageItems.length, PER_PAGE)
    // 1–2 items get half the screen each; 3–4 a row of wide cards; more, 4×2.
    const cols = count <= 2 ? count : count <= 4 ? 2 : 4

    const cards = pageItems
      .map((item) => {
        const price = ctx.price(item.price)
        return `
          <article class="ga-card">
            <div class="ga-photo-wrap">
              ${mediaHtml(item, 'ga-photo')}
              ${price ? `<span class="ga-price">${escapeHtml(price)}</span>` : ''}
            </div>
            <div class="ga-text">
              ${item.category ? `<span class="ga-cat">${escapeHtml(item.category)}</span>` : ''}
              <h3 class="ga-name">${escapeHtml(item.name)}</h3>
              ${item.description ? `<p class="ga-desc">${escapeHtml(item.description)}</p>` : ''}
            </div>
          </article>`
      })
      .join('')

    return `
      <div class="ga" data-template-root>
        ${
          ctx.heading
            ? `<header class="ga-head">
                 <h1 class="ga-heading">${escapeHtml(ctx.heading)}</h1>
                 ${pageDotsHtml(this.pageCount(ctx), ctx.page)}
               </header>`
            : pageDotsHtml(this.pageCount(ctx), ctx.page)
        }
        <div class="ga-grid" style="--ga-cols:${cols}">${cards}</div>
      </div>`
  },
}
