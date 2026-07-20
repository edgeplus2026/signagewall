import { escapeHtml, fitScale } from '../format.js'
import type { MenuTemplateContext, MenuTemplateImpl } from './index.js'
import './chalkboard.css'

/**
 * "Chalkboard" — a hand-written café board. This design commits to its own
 * look: a deep slate board (pure CSS — vignette + a whisper of grain, no image
 * assets) inside a wooden-feel frame, chalk-white hand lettering, categories
 * underlined with an uneven chalk stroke. The operator's background colour is
 * deliberately ignored — a chalkboard that isn't dark isn't a chalkboard — but
 * the accent still tints the prices, defaulting to chalk yellow via the CSS
 * fallback when it's left at the product default.
 *
 * Static: long boards flow into two columns and shrink, like a real board
 * where the handwriting just gets smaller as the specials pile up.
 */
export const chalkboardTemplate: MenuTemplateImpl = {
  pageCount(): number {
    return 1
  },

  render(ctx: MenuTemplateContext): string {
    const twoCol = ctx.items.length > 8
    const fit = fitScale(ctx.items.length, twoCol ? 18 : 8)

    const groups = ctx.groups
      .map((group) => {
        const items = group.items
          .map((item) => {
            const price = ctx.price(item.price)
            return `
              <div class="ch-item">
                <div class="ch-row">
                  <span class="ch-name">${escapeHtml(item.name)}</span>
                  ${price ? `<span class="ch-price">${escapeHtml(price)}</span>` : ''}
                </div>
                ${item.description ? `<p class="ch-desc">${escapeHtml(item.description)}</p>` : ''}
              </div>`
          })
          .join('')
        return `
          <section class="ch-group">
            ${group.title ? `<h2 class="ch-cat"><span>${escapeHtml(group.title)}</span></h2>` : ''}
            ${items}
          </section>`
      })
      .join('')

    return `
      <div class="ch" data-template-root style="--mb-fit:${fit}">
        <div class="ch-board">
          ${ctx.heading ? `<h1 class="ch-heading">${escapeHtml(ctx.heading)}</h1>` : ''}
          <div class="ch-body${twoCol ? ' ch-cols' : ''}">${groups}</div>
        </div>
      </div>`
  },
}
