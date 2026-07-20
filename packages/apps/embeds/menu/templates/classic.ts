import { escapeHtml, fitScale } from '../format.js'
import type { MenuTemplateContext, MenuTemplateImpl } from './index.js'
import './classic.css'

/**
 * "Classic" — a refined price list. The current menu board, elevated: serif
 * headings, a faint dotted leader carrying the eye from name to price, category
 * sections with small-caps titles. The default, and deliberately the closest to
 * what existing instances already look like.
 *
 * Static: long boards flow into two columns and then shrink (never scroll) —
 * a printed menu doesn't paginate, and neither does this one.
 */
export const classicTemplate: MenuTemplateImpl = {
  pageCount(): number {
    return 1
  },

  render(ctx: MenuTemplateContext): string {
    const twoCol = ctx.items.length > 9
    const fit = fitScale(ctx.items.length, twoCol ? 22 : 10)

    const groups = ctx.groups
      .map((group) => {
        const items = group.items
          .map((item) => {
            const price = ctx.price(item.price)
            return `
              <div class="cl-item">
                <div class="cl-row">
                  <span class="cl-name">${escapeHtml(item.name)}</span>
                  ${price ? `<span class="cl-lead"></span><span class="cl-price">${escapeHtml(price)}</span>` : ''}
                </div>
                ${item.description ? `<p class="cl-desc">${escapeHtml(item.description)}</p>` : ''}
              </div>`
          })
          .join('')
        return `
          <section class="cl-group">
            ${group.title ? `<h2 class="cl-cat">${escapeHtml(group.title)}</h2>` : ''}
            ${items}
          </section>`
      })
      .join('')

    return `
      <div class="cl" data-template-root style="--mb-fit:${fit}">
        ${
          ctx.heading
            ? `<header class="cl-head">
                 <h1 class="cl-heading">${escapeHtml(ctx.heading)}</h1>
                 <div class="cl-rule"></div>
               </header>`
            : ''
        }
        <div class="cl-body${twoCol ? ' cl-cols' : ''}">${groups}</div>
      </div>`
  },
}
