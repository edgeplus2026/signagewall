import { escapeHtml, paginateGroups, pageDotsHtml } from '../format.js'
import type { MenuTemplateContext, MenuTemplateImpl } from './index.js'
import './noir.css'

/** Items that fit one centered page before the board starts rotating. */
const PER_PAGE = 10

/**
 * "Noir" — understated luxury. A single centered column, generous whitespace,
 * hairline rules, thin editorial serif, prices set small in a gold-tinted
 * accent under the name rather than racing it to the margin. The design for a
 * cocktail bar or tasting menu, where the board is part of the room.
 *
 * Rotates: rather than shrink the type (the whole point is the air around it),
 * long menus page through ten items at a time, category headings travelling
 * with their items.
 */
export const noirTemplate: MenuTemplateImpl = {
  pageCount(ctx: MenuTemplateContext): number {
    return paginateGroups(ctx.groups, PER_PAGE).length
  },

  render(ctx: MenuTemplateContext): string {
    const pages = paginateGroups(ctx.groups, PER_PAGE)
    const page = pages[ctx.page] ?? pages[0] ?? []

    const groups = page
      .map((group) => {
        const items = group.items
          .map((item) => {
            const price = ctx.price(item.price)
            return `
              <div class="no-item">
                <h3 class="no-name">${escapeHtml(item.name)}</h3>
                ${item.description ? `<p class="no-desc">${escapeHtml(item.description)}</p>` : ''}
                ${price ? `<span class="no-price">${escapeHtml(price)}</span>` : ''}
              </div>`
          })
          .join('')
        return `
          <section class="no-group">
            ${
              group.title
                ? `<h2 class="no-cat"><span class="no-cat-rule"></span>${escapeHtml(
                    group.title,
                  )}<span class="no-cat-rule"></span></h2>`
                : ''
            }
            ${items}
          </section>`
      })
      .join('')

    return `
      <div class="no" data-template-root>
        ${
          ctx.heading
            ? `<header class="no-head">
                 <h1 class="no-heading">${escapeHtml(ctx.heading)}</h1>
                 <div class="no-flourish">✦</div>
               </header>`
            : ''
        }
        <div class="no-body">${groups}</div>
        ${pageDotsHtml(pages.length, ctx.page)}
      </div>`
  },
}
