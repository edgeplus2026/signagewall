import { DEFAULT_ACCENT } from '../../src/_shared/theme.js'
import { pickColor } from '../_shared/color.js'
import { connectToHost } from '../_shared/host-bridge.js'
import { applyTextStyle } from '../_shared/text-style.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

interface MenuItem {
  name: string
  price: string
  description: string
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function cell(row: Record<string, unknown>, key: string): string {
  const value = row[key]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * The menu items. New configs store an array of `{name, price, description}`
 * rows (the repeater field); older ones stored a `Name | Price | Description`
 * textarea, one per line — both are accepted so a saved instance never breaks.
 * Rows/lines with no name are skipped.
 */
function parseItems(value: unknown): MenuItem[] {
  if (Array.isArray(value)) {
    return value
      .map((row) => {
        const r = (row ?? {}) as Record<string, unknown>
        return { name: cell(r, 'name'), price: cell(r, 'price'), description: cell(r, 'description') }
      })
      .filter((item) => item.name)
  }
  const text = typeof value === 'string' ? value : ''
  const items: MenuItem[] = []
  for (const line of text.split('\n')) {
    const parts = line.split('|').map((part) => part.trim())
    const name = parts[0] ?? ''
    if (!name) continue
    items.push({ name, price: parts[1] ?? '', description: parts[2] ?? '' })
  }
  return items
}

function buildItem(item: MenuItem): HTMLElement {
  const el = document.createElement('div')
  el.className = 'menu-item'

  const row = document.createElement('div')
  row.className = 'menu-row'
  const name = document.createElement('span')
  name.className = 'menu-name'
  name.textContent = item.name
  row.append(name)
  // Only draw the leader + price when there is a price to align to.
  if (item.price) {
    const lead = document.createElement('span')
    lead.className = 'menu-lead'
    const price = document.createElement('span')
    price.className = 'menu-price'
    price.textContent = item.price
    row.append(lead, price)
  }
  el.append(row)

  if (item.description) {
    const desc = document.createElement('div')
    desc.className = 'menu-desc'
    desc.textContent = item.description
    el.append(desc)
  }
  return el
}

function render(config: Record<string, unknown>): void {
  if (!root) return

  root.style.background = pickColor(config.backgroundColor, '#0B1220')
  root.style.color = pickColor(config.textColor, '#E2E8F0')
  root.style.setProperty(
    '--menu-accent',
    pickColor(config.accentColor, DEFAULT_ACCENT),
  )
  applyTextStyle(root, config)

  const items = parseItems(config.items)
  const columns = str(config.columns) === '2' ? 2 : 1

  const wrap = document.createElement('div')
  wrap.className = `menu${columns === 2 ? ' menu-cols-2' : ''}`

  const heading = str(config.heading).trim()
  if (heading) {
    const h = document.createElement('div')
    h.className = 'menu-heading'
    h.textContent = heading
    wrap.append(h)
  }

  if (items.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'menu-empty'
    empty.textContent = 'Add a menu item'
    wrap.append(empty)
    root.replaceChildren(wrap)
    return
  }

  const list = document.createElement('div')
  list.className = 'menu-list'
  for (const item of items) list.append(buildItem(item))
  wrap.append(list)
  root.replaceChildren(wrap)
}

connectToHost(({ config }) => render(config))
