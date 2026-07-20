import type { MenuItem } from '../../src/menu/payload.js'

/**
 * Rendering helpers shared by the menu templates.
 *
 * Item text is operator-authored or comes out of somebody's spreadsheet, so
 * this is where it stops being trusted: text is escaped before it reaches
 * `innerHTML`, and image URLs are checked before they reach a `src` attribute.
 */

/** Escape text for interpolation into HTML. */
export function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

/**
 * An image source safe to render: http(s) (synced sheets carry CDN URLs, manual
 * rows carry our R2 URLs) or an inline `data:image/…` (legacy manual uploads).
 * Anything else — `javascript:`, plain `data:` — renders nothing.
 */
export function imageSrc(value: unknown): string | undefined {
  if (typeof value !== 'string' || value === '') {
    return undefined
  }
  if (value.startsWith('data:image/')) {
    return value
  }
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? value
      : undefined
  } catch {
    return undefined
  }
}

/** One category section of the board, in first-appearance order. */
export interface MenuGroup {
  /** The category name; '' for items with none (they lead the board). */
  title: string
  items: MenuItem[]
}

/**
 * Group items by category, preserving the order categories first appear in.
 * Uncategorized items form a leading untitled group — a short menu with no
 * categories at all is then simply one untitled group.
 */
export function groupItems(items: MenuItem[]): MenuGroup[] {
  const groups: MenuGroup[] = []
  const byTitle = new Map<string, MenuGroup>()
  for (const item of items) {
    const title = (item.category ?? '').trim()
    let group = byTitle.get(title)
    if (!group) {
      group = { title, items: [] }
      byTitle.set(title, group)
      if (title === '') {
        groups.unshift(group)
      } else {
        groups.push(group)
      }
    }
    group.items.push(item)
  }
  return groups
}

/**
 * Split groups into pages of at most `maxItems` items, keeping category
 * headings with their items (a group larger than a page is split and repeats
 * its heading on the next page). For templates that rotate instead of shrink.
 */
export function paginateGroups(groups: MenuGroup[], maxItems: number): MenuGroup[][] {
  const pages: MenuGroup[][] = []
  let page: MenuGroup[] = []
  let count = 0
  const push = (group: MenuGroup): void => {
    page.push(group)
    count += group.items.length
  }
  const flush = (): void => {
    if (page.length > 0) {
      pages.push(page)
      page = []
      count = 0
    }
  }
  for (const group of groups) {
    let rest = group.items
    while (rest.length > 0) {
      const room = maxItems - count
      if (room <= 0) {
        flush()
        continue
      }
      push({ title: group.title, items: rest.slice(0, room) })
      rest = rest.slice(room)
      if (rest.length > 0) flush()
    }
  }
  flush()
  return pages.length > 0 ? pages : [[]]
}

/**
 * A density scale for templates that shrink instead of rotate: 1 at or under
 * the comfortable item count, easing down to 0.6 as the board fills. Applied
 * as a multiplier inside `calc(...)` font sizes.
 */
export function fitScale(itemCount: number, comfortable: number): number {
  if (itemCount <= comfortable) return 1
  return Math.max(0.6, Math.sqrt(comfortable / itemCount))
}

/**
 * An item's picture inside a fixed frame. The frame (`data-media`) always holds
 * its size and shows a monogram tile underneath; when the picture fails to load
 * (dead link, offline player) `main.ts` flags the frame `is-broken` and the
 * monogram simply stays — the layout never reshapes around a missing picture.
 */
export function mediaHtml(item: MenuItem, className: string): string {
  const src = imageSrc(item.imageUrl)
  const initial = escapeHtml((item.name.trim()[0] ?? '·').toUpperCase())
  return `
    <div class="${className}" data-media>
      <div class="mb-monogram" aria-hidden="true">${initial}</div>
      ${src ? `<img src="${escapeHtml(src)}" alt="" data-fallback loading="lazy">` : ''}
    </div>`
}

/** Rotation-page indicator dots; empty string when there is a single page. */
export function pageDotsHtml(pageCount: number, page: number): string {
  if (pageCount < 2) return ''
  const dots = Array.from(
    { length: pageCount },
    (_, i) => `<span class="mb-dot${i === page ? ' is-on' : ''}"></span>`,
  )
  return `<div class="mb-dots">${dots.join('')}</div>`
}
