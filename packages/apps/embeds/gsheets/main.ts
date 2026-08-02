import type { GsheetsPayload } from '../../src/gsheets/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'
import { applyTextStyle } from '../_shared/text-style.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

const THEMES: Record<string, { bg: string; text: string }> = {
  light: { bg: '#FFFFFF', text: '#0F172A' },
  dark: { bg: '#0B1220', text: '#E2E8F0' },
}

function applyChrome(config: Record<string, unknown>): void {
  if (!root) return
  const theme = THEMES[String(config.theme)] ?? THEMES.dark!
  root.style.background = theme.bg
  root.style.color = theme.text
  root.style.setProperty('--gs-accent', '#0F9D58')
  applyTextStyle(root, config)
}

/** A cell string, or '' — rows are padded to the widest row so columns align. */
function padded(values: string[][]): string[][] {
  const cols = values.reduce((max, row) => Math.max(max, row.length), 0)
  return values.map((row) => {
    const next = row.slice()
    while (next.length < cols) next.push('')
    return next
  })
}

/**
 * Whether a column holds numbers, judged over the body rows.
 *
 * A figure read off a wall is compared against the one above it, and that only
 * works when the digits line up — so numeric columns are right-aligned and set
 * in tabular figures. Judged per column rather than per cell, because aligning
 * some cells in a column and not others is worse than aligning none.
 */
function numericColumns(bodyRows: string[][], columns: number): boolean[] {
  return Array.from({ length: columns }, (_, index) => {
    const cells = bodyRows.map((row) => (row[index] ?? '').trim()).filter(Boolean)
    if (cells.length === 0) return false
    /* Currency, thousands separators and a trailing percent all still count. */
    return cells.every((cell) => /^[^\p{L}]*\d[\d\s.,]*\s*%?$/u.test(cell))
  })
}

/**
 * The header is always row one; `showHeader` only decides whether it is drawn.
 *
 * A menu board does not want "Product name / Price" written above the dishes,
 * but the row is still a heading and must not be served as an item.
 */
function split(values: string[][]): { header: string[]; body: string[][] } {
  const rows = padded(values)
  return { header: (rows[0] ?? []) as string[], body: rows.slice(1) }
}

function buildTable(values: string[][], showHeader: boolean): HTMLElement {
  const rows = padded(values)
  const table = document.createElement('table')
  table.className = 'gs-table'

  const { header, body: bodyRows } = split(values)
  const headerRow = showHeader ? header : null

  const columns = rows[0]?.length ?? 0
  const numeric = numericColumns(bodyRows, columns)

  /* Explicit widths: `table-layout: fixed` would otherwise split the width
     evenly, which gives a column of one-digit numbers the same room as one of
     long labels. Weighted by the longest cell, then clamped so no single
     column can crowd out the rest. */
  const weights = Array.from({ length: columns }, (_, index) => {
    const longest = rows.reduce((max, row) => Math.max(max, (row[index] ?? '').length), 0)
    return Math.min(Math.max(longest, 4), 28)
  })
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1
  const colgroup = document.createElement('colgroup')
  for (const weight of weights) {
    const col = document.createElement('col')
    col.style.width = `${((weight / total) * 100).toFixed(2)}%`
    colgroup.append(col)
  }
  table.append(colgroup)

  if (headerRow) {
    const thead = document.createElement('thead')
    const tr = document.createElement('tr')
    headerRow.forEach((cell, index) => {
      const th = document.createElement('th')
      th.textContent = cell
      if (numeric[index]) th.classList.add('gs-num')
      tr.append(th)
    })
    thead.append(tr)
    table.append(thead)
  }

  const tbody = document.createElement('tbody')
  for (const row of bodyRows) {
    const tr = document.createElement('tr')
    row.forEach((cell, index) => {
      const td = document.createElement('td')
      /* The clamp lives on a wrapper, never on the cell: `display: -webkit-box`
         on a `td` replaces `table-cell` and the whole grid collapses into one
         column. */
      const inner = document.createElement('span')
      inner.className = 'gs-cell'
      inner.textContent = cell
      td.append(inner)
      if (numeric[index]) td.classList.add('gs-num')
      tr.append(td)
    })
    tbody.append(tr)
  }
  table.append(tbody)
  return table
}

/**
 * Menu-board reading of the same rows.
 *
 * A spreadsheet grid is a poor shape for the thing people actually put on a
 * screen — a list of items with a price and a sentence about each. The grid
 * gives a forty-word description the same column width everywhere and then cuts
 * it mid-sentence, which is what the table did.
 *
 * So: first column is the name, the last numeric column is the figure that goes
 * right, and whatever is left becomes one muted line underneath. Nothing is
 * truncated mid-word; the description is clamped to two lines.
 */
function buildModern(values: string[][], showHeader: boolean): HTMLElement {
  const { header, body } = split(values)
  const columns = header.length
  const numeric = numericColumns(body, columns)

  /* The rightmost numeric column reads as the price. Leftmost would collide
     with an id or a quantity sitting next to the name. */
  const valueIndex = numeric.lastIndexOf(true)
  const nameIndex = 0
  const detailIndexes = Array.from({ length: columns }, (_, i) => i).filter(
    (i) => i !== nameIndex && i !== valueIndex,
  )

  const list = document.createElement('div')
  list.className = 'gs-list'

  if (showHeader && header.some(Boolean)) {
    const caption = document.createElement('div')
    caption.className = 'gs-list-head'
    caption.textContent = [header[nameIndex], valueIndex >= 0 ? header[valueIndex] : '']
      .filter(Boolean)
      .join(' · ')
    list.append(caption)
  }

  for (const row of body) {
    if (!row.some((cell) => cell.trim())) continue

    const item = document.createElement('div')
    item.className = 'gs-item'

    /* Name, a dotted leader, then the figure — the way a printed menu sets a
       line. The leader is what makes a price belong to its dish across a wide
       screen; a plain gap leaves the eye guessing on the far right. */
    const line = document.createElement('div')
    line.className = 'gs-item-line'

    const name = document.createElement('span')
    name.className = 'gs-item-name'
    name.textContent = row[nameIndex] ?? ''
    line.append(name)

    const hasValue = valueIndex >= 0 && (row[valueIndex] ?? '').trim() !== ''
    if (hasValue) {
      // `append` returns undefined, so the class has to be set on the element
      // itself — chaining off the call threw on every row that had a value,
      // which took the whole list layout down with it.
      const leader = document.createElement('span')
      leader.className = 'gs-leader'
      line.append(leader)
      const value = document.createElement('span')
      value.className = 'gs-item-value'
      value.textContent = row[valueIndex] as string
      line.append(value)
    }

    item.append(line)

    const detail = detailIndexes
      .map((i) => (row[i] ?? '').trim())
      .filter(Boolean)
      .join(' — ')
    if (detail) {
      const detailEl = document.createElement('div')
      detailEl.className = 'gs-item-detail'
      detailEl.textContent = detail
      item.append(detailEl)
    }

    list.append(item)
  }

  return list
}

function render(
  config: Record<string, unknown>,
  data: GsheetsPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  applyChrome(config)

  if (!data || data.values.length === 0) {
    root.innerHTML = '<div class="gs"><p class="gs-empty">Loading…</p></div>'
    return
  }

  const showHeader = config.showHeader !== false
  const modern = String(config.layout ?? 'modern') !== 'table'

  const wrap = document.createElement('div')
  wrap.className = 'gs'

  if (data.title) {
    const title = document.createElement('div')
    title.className = 'gs-title'
    title.textContent = data.title
    wrap.append(title)
  }

  wrap.append(
    modern
      ? buildModern(data.values, showHeader)
      : buildTable(data.values, showHeader),
  )

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, GsheetsPayload>(
  ({ config, data, meta }) => {
    render(config, data, meta)
  },
)
