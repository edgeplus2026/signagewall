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

function buildTable(values: string[][], hasHeader: boolean): HTMLElement {
  const rows = padded(values)
  const table = document.createElement('table')
  table.className = 'gs-table'

  let headerRow: string[] | null = null
  let bodyRows = rows
  if (hasHeader && rows.length > 0) {
    headerRow = rows[0] as string[]
    bodyRows = rows.slice(1)
  }

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
      td.textContent = cell
      if (numeric[index]) td.classList.add('gs-num')
      tr.append(td)
    })
    tbody.append(tr)
  }
  table.append(tbody)
  return table
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

  const hasHeader = config.hasHeader !== false

  const wrap = document.createElement('div')
  wrap.className = 'gs'

  if (data.title) {
    const title = document.createElement('div')
    title.className = 'gs-title'
    title.textContent = data.title
    wrap.append(title)
  }

  wrap.append(buildTable(data.values, hasHeader))

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, GsheetsPayload>(
  ({ config, data, meta }) => {
    render(config, data, meta)
  },
)
