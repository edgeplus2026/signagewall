import { DEFAULT_ACCENT } from '../../src/_shared/theme.js'
import type { MenuItem, MenuSyncPayload } from '../../src/menu/payload.js'
import { pickColor } from '../_shared/color.js'
import { connectToHost } from '../_shared/host-bridge.js'
import { formatPrice } from '../_shared/price.js'
import { applyTextStyle } from '../_shared/text-style.js'
import { groupItems } from './format.js'

/*
 * IMPORT ORDER IS LOAD-BEARING (see the note in `embeds/rss/main.ts`): the
 * bundler emits stylesheets in module import order and the cascade breaks ties
 * on source order, so the shared chrome must be emitted BEFORE the templates
 * or a template can never override an identically-specific shared rule.
 */
import '../_shared/base.css'
import './fonts.css'
import './style.css'
import { templateFor } from './templates/index.js'

/**
 * Menu board runtime. Owns what the designs shouldn't think about: the host
 * handshake, the theme, item normalization (three config generations + the
 * synced payload), currency formatting, page rotation, and image fallbacks.
 */

const root = document.getElementById('app')

/** How long one rotation page holds the screen (designs that paginate). */
const SECONDS_PER_PAGE = 12

/** The whole of this app's state; `render()` is a pure function of it. */
let config: Record<string, unknown> = {}
let data: MenuSyncPayload | null = null
let page = 0
let timer: ReturnType<typeof setInterval> | undefined
/** Whether we are the on-screen item (the player preloads us hidden first). */
let active = false

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function cell(row: Record<string, unknown>, key: string): string {
  const value = row[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** A row's price: a number (v2), a legacy free-form string, or nothing. */
function cellPrice(row: Record<string, unknown>): number | string | undefined {
  const value = row['price']
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  return undefined
}

function fromRows(rows: unknown[]): MenuItem[] {
  return rows
    .map((row): MenuItem => {
      const r = (row ?? {}) as Record<string, unknown>
      const item: MenuItem = { name: cell(r, 'name') }
      const price = cellPrice(r)
      if (price !== undefined) item.price = price
      const description = cell(r, 'description')
      if (description) item.description = description
      const category = cell(r, 'category')
      if (category) item.category = category
      // Manual rows store the picture under `image`; the synced payload (and a
      // future-proofed manual row) under `imageUrl`.
      const imageUrl = cell(r, 'imageUrl') || cell(r, 'image')
      if (imageUrl) item.imageUrl = imageUrl
      return item
    })
    .filter((item) => item.name !== '')
}

/**
 * The items, whatever generation of config (or sync payload) carries them:
 *   - synced (Sheets/Excel): the connector's normalized payload wins;
 *   - manual (v2): repeater rows `{name, price:number, description, category, image}`;
 *   - manual (v1): repeater rows with string prices — rendered verbatim;
 *   - legacy (pre-repeater): a `Name | Price | Description` textarea string.
 * Rows/lines with no name are skipped everywhere.
 */
function normalizeItems(): MenuItem[] {
  if (data && Array.isArray(data.items)) {
    return fromRows(data.items)
  }
  const value = config.items
  if (Array.isArray(value)) {
    return fromRows(value)
  }
  const text = typeof value === 'string' ? value : ''
  const items: MenuItem[] = []
  for (const line of text.split('\n')) {
    const parts = line.split('|').map((part) => part.trim())
    const name = parts[0] ?? ''
    if (!name) continue
    const item: MenuItem = { name }
    if (parts[1]) item.price = parts[1]
    if (parts[2]) item.description = parts[2]
    items.push(item)
  }
  return items
}

/**
 * Images may fail to load (dead sheet link, offline player — the payload is
 * snapshot-cached but pictures live on a CDN). Templates put pictures behind
 * `data-media` frames that hold their size and show a monogram tile; here the
 * broken image is flagged so the frame falls back without reshaping. Wired
 * centrally so no template needs an inline handler.
 */
function wireImageFallbacks(el: HTMLElement): void {
  for (const img of el.querySelectorAll<HTMLImageElement>('img[data-fallback]')) {
    img.addEventListener(
      'error',
      () => {
        img.closest<HTMLElement>('[data-media]')?.classList.add('is-broken')
      },
      { once: true },
    )
  }
}

/** A template key reaches a class name, so keep it to identifier shape. */
function escapeAttr(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, '')
}

function render(): void {
  if (!root) return

  root.style.background = pickColor(config.backgroundColor, '#0B1220')
  root.style.color = pickColor(config.textColor, '#E2E8F0')
  root.style.setProperty('--menu-accent', pickColor(config.accentColor, DEFAULT_ACCENT))
  applyTextStyle(root, config)

  const items = normalizeItems()
  const templateKey = typeof config.template === 'string' ? config.template : ''
  const template = templateFor(templateKey)

  if (items.length === 0) {
    root.innerHTML = '<div class="menu"><div class="menu-empty">Add a menu item</div></div>'
    return
  }

  const ctx = {
    heading: str(config.heading).trim(),
    groups: groupItems(items),
    items,
    page: 0,
    price: (value: number | string | undefined) =>
      formatPrice(value, str(config.currency), str(config.currencyPosition)),
  }
  // Wrap rather than reset when the board shrank under the rotation (a sheet
  // edit mid-rotation, the operator deleting rows): the CMS re-sends config on
  // every keystroke and a rotation that restarts under their hands is maddening.
  const pageCount = Math.max(1, template.pageCount(ctx))
  page %= pageCount
  ctx.page = page

  root.innerHTML = `<div class="menu mb-${escapeAttr(templateKey)}${
    active ? ' is-active' : ''
  }">${template.render(ctx)}</div>`

  wireImageFallbacks(root)
}

/**
 * (Re)start the page rotation. Only the on-screen instance rotates — a hidden,
 * preloaded board left ticking would appear mid-rotation.
 */
function restartTimer(): void {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }

  const items = normalizeItems()
  if (!active || items.length === 0) return
  const template = templateFor(typeof config.template === 'string' ? config.template : '')
  const ctx = {
    heading: '',
    groups: groupItems(items),
    items,
    page: 0,
    price: () => '',
  }
  if (template.pageCount(ctx) < 2) return

  timer = setInterval(() => {
    page += 1
    render()
  }, SECONDS_PER_PAGE * 1000)
}

connectToHost<Record<string, unknown>, MenuSyncPayload>(
  (message) => {
    config = message.config
    data = message.data
    render()
    restartTimer()
  },
  {
    onActive: (isActive) => {
      const becameActive = isActive && !active
      active = isActive
      if (becameActive) {
        page = 0
      }
      render()
      restartTimer()
    },
  },
)
