import type { MenuTemplate } from '../../../src/menu/templates.js'
import type { MenuItem } from '../../../src/menu/payload.js'
import type { MenuGroup } from '../format.js'
import { chalkboardTemplate } from './chalkboard.js'
import { classicTemplate } from './classic.js'
import { counterTemplate } from './counter.js'

/**
 * The design registry. One entry per value in `MENU_TEMPLATES`
 * (`src/menu/templates.ts`) — and because {@link TEMPLATES} is typed
 * `Record<MenuTemplate, MenuTemplateImpl>`, adding a design to that list
 * without a template here is a type error, not a blank screen on a wall.
 *
 * Adding a design:
 *   1. add `{ value: 'bistro', label: '…' }` to MENU_TEMPLATES
 *   2. write `templates/bistro.ts` exporting a MenuTemplateImpl (+ `bistro.css`)
 *   3. add `bistro: bistroTemplate` below
 *
 * Templates are pure and synchronous: they take a context and return HTML.
 * Markup conventions `main.ts` relies on (so no template needs inline script):
 *   - the outermost element carries `data-template-root`
 *   - an item picture carries `data-fallback` inside a `data-media` frame; on
 *     load error the FRAME gets `is-broken` and must hold its size, showing the
 *     monogram tile it was already holding underneath (`mediaHtml` builds this).
 *
 * Colours reach templates through the cascade, not the context: `main.ts` puts
 * the operator's background/text on the app root and the accent in
 * `--menu-accent`; templates that commit to their own look (chalkboard) may
 * deliberately override the background, but type colour and accent always
 * inherit.
 */

export interface MenuTemplateContext {
  /** The board title; may be empty. */
  heading: string
  /** Items grouped by category, first-appearance order, uncategorized first. */
  groups: MenuGroup[]
  /** The same items, flat, in config/sheet order. */
  items: MenuItem[]
  /** The rotation page being shown, already wrapped to `pageCount`. */
  page: number
  /** Format a price with the instance currency; '' when the item has none. */
  price: (value: number | string | undefined) => string
}

export interface MenuTemplateImpl {
  /**
   * How many pages this design needs for the given board. 1 means static —
   * `main.ts` runs no timer. Designs that shrink to fit return 1; designs that
   * rotate (cards, per-category boards) return their page count.
   */
  pageCount(ctx: MenuTemplateContext): number
  render(ctx: MenuTemplateContext): string
}

const TEMPLATES: Record<MenuTemplate, MenuTemplateImpl> = {
  classic: classicTemplate,
  chalkboard: chalkboardTemplate,
  counter: counterTemplate,
}

/** The design used when the config names none, or names one we don't ship. */
export const DEFAULT_TEMPLATE: MenuTemplate = 'classic'

export function templateFor(value: unknown): MenuTemplateImpl {
  const key = typeof value === 'string' ? value : DEFAULT_TEMPLATE
  return TEMPLATES[key as MenuTemplate] ?? TEMPLATES[DEFAULT_TEMPLATE]
}
