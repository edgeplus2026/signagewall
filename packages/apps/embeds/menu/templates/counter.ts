import { escapeHtml, fitScale, mediaHtml } from '../format.js'
import type { MenuTemplateContext, MenuTemplateImpl } from './index.js'
import './counter.css'

/**
 * "Counter" — the board above a fast-food counter. Condensed uppercase display
 * type, high-contrast price chips, and a category rail across the top. One
 * category holds the screen at a time and the board rotates through them, the
 * rail showing where you are — the menu equivalent of a departures board.
 *
 * Items with photos get a small square thumb beside the name; without one the
 * row is pure type, and the two mix cleanly in the same list.
 */
export const counterTemplate: MenuTemplateImpl = {
  pageCount(ctx: MenuTemplateContext): number {
    return Math.max(1, ctx.groups.length)
  },

  render(ctx: MenuTemplateContext): string {
    const group = ctx.groups[ctx.page] ?? ctx.groups[0] ?? { title: '', items: [] }
    const fit = fitScale(group.items.length, 7)
    const twoCol = group.items.length > 7

    const tabs =
      ctx.groups.length > 1
        ? `<nav class="co-rail">${ctx.groups
            .map(
              (g, i) =>
                `<span class="co-tab${i === ctx.page ? ' is-on' : ''}">${escapeHtml(
                  g.title || 'Menu',
                )}</span>`,
            )
            .join('')}</nav>`
        : ''

    const rows = group.items
      .map((item) => {
        const price = ctx.price(item.price)
        return `
          <div class="co-item">
            ${item.imageUrl ? mediaHtml(item, 'co-thumb') : ''}
            <div class="co-text">
              <span class="co-name">${escapeHtml(item.name)}</span>
              ${item.description ? `<span class="co-desc">${escapeHtml(item.description)}</span>` : ''}
            </div>
            ${price ? `<span class="co-price">${escapeHtml(price)}</span>` : ''}
          </div>`
      })
      .join('')

    return `
      <div class="co" data-template-root style="--mb-fit:${fit}">
        <header class="co-head">
          ${ctx.heading ? `<h1 class="co-heading">${escapeHtml(ctx.heading)}</h1>` : ''}
          ${tabs}
        </header>
        ${
          ctx.groups.length > 1 || group.title
            ? `<h2 class="co-cat">${escapeHtml(group.title || 'Menu')}</h2>`
            : ''
        }
        <div class="co-list${twoCol ? ' co-cols' : ''}">${rows}</div>
      </div>`
  },
}
