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

/** How long one page of rows stays on screen before the next slides in. */
const PAGE_MS = 10_000

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

/** Uppercase ids, order numbers, clock times: `WO-4471`, `07:00`, `SKU/12`. */
const CODE_RE = /^[A-Z0-9][A-Z0-9\-_/.:#]*$/
/** What separates a code from a bare number — a code has structure in it. */
const CODE_MARK_RE = /[A-Z\-_/:#]/

/**
 * Columns of identifiers rather than of prose or of quantities.
 *
 * They get a monospaced face, and it is not decoration: a column of `WO-4471`,
 * `WO-4472`, `WO-4473` read from across a room is scanned for the digit that
 * differs, and in a proportional face those digits do not sit above one another.
 *
 * Tested BEFORE the numeric rule and allowed to win, because `07:00` satisfies
 * the numeric pattern too — and a column of clock times right-aligned as if it
 * were money is exactly wrong.
 */
function codeColumns(bodyRows: string[][], columns: number): boolean[] {
  return Array.from({ length: columns }, (_, index) => {
    const cells = bodyRows.map((row) => (row[index] ?? '').trim()).filter(Boolean)
    if (cells.length === 0) return false
    return cells.every(
      (cell) =>
        // A sentence in capitals is not a code; a code is short and uniform.
        cell.length <= 16 && CODE_RE.test(cell) && CODE_MARK_RE.test(cell),
    )
  })
}

/** What a column is, which is what decides its weight, colour and alignment. */
type Role = 'primary' | 'text' | 'num' | 'num-strong' | 'code' | 'code-strong'

/**
 * Give every column a job.
 *
 * The rule that matters: THE HEADLINE COLUMN IS NOT ALWAYS THE FIRST ONE. It is
 * the first column that is neither an identifier nor a figure — so on a sales
 * board (`Region | Owner | Pipeline | Closed won`) it is the region, and on a
 * production schedule (`Slot | Work order | Customer | Qty`) it is the customer,
 * sitting third behind a time and an order number. Taking column zero on faith
 * gets the second one wrong and sets a work-order number as the headline.
 *
 * The last numeric column is the one that carries the answer — a board with both
 * a pipeline and a closed-won figure is read for the closed-won — so it is the
 * one set bright, and any earlier figures are stepped down to support it.
 */
function columnRoles(bodyRows: string[][], columns: number): Role[] {
  const code = codeColumns(bodyRows, columns)
  const numeric = numericColumns(bodyRows, columns).map(
    (isNum, index) => isNum && !code[index],
  )
  const lastNumeric = numeric.lastIndexOf(true)
  const firstCode = code.indexOf(true)
  const headline = Array.from({ length: columns }, (_, i) => i).find(
    (i) => !numeric[i] && !code[i],
  )

  return Array.from({ length: columns }, (_, index) => {
    if (numeric[index]) return index === lastNumeric ? 'num-strong' : 'num'
    if (code[index]) return index === firstCode ? 'code-strong' : 'code'
    return index === headline ? 'primary' : 'text'
  })
}

function isNumericRole(role: Role): boolean {
  return role === 'num' || role === 'num-strong'
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

/**
 * Column widths, weighted by the longest cell and clamped so no single column
 * can crowd out the rest.
 *
 * Computed over EVERY row, not over the page on screen — widths derived from one
 * page shift when the next page's cells are a different length, and a table whose
 * columns jump every ten seconds is unreadable in a way a slightly imperfect
 * column width never is.
 */
function columnWidths(rows: string[][], columns: number): string[] {
  const weights = Array.from({ length: columns }, (_, index) => {
    const longest = rows.reduce(
      (max, row) => Math.max(max, (row[index] ?? '').length),
      0,
    )
    return Math.min(Math.max(longest, 4), 28)
  })
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1
  return weights.map((weight) => `${((weight / total) * 100).toFixed(2)}%`)
}

/** The grid reading: every column, as a table. */
function buildTable(
  header: string[],
  rows: string[][],
  roles: Role[],
  widths: string[],
  showHeader: boolean,
): HTMLElement {
  const table = document.createElement('table')
  table.className = 'gs-table'

  const colgroup = document.createElement('colgroup')
  for (const width of widths) {
    const col = document.createElement('col')
    col.style.width = width
    colgroup.append(col)
  }
  table.append(colgroup)

  if (showHeader) {
    const thead = document.createElement('thead')
    const tr = document.createElement('tr')
    header.forEach((cell, index) => {
      const th = document.createElement('th')
      th.textContent = cell
      if (isNumericRole(roles[index] as Role)) th.classList.add('gs-num')
      tr.append(th)
    })
    thead.append(tr)
    table.append(thead)
  }

  const tbody = document.createElement('tbody')
  for (const row of rows) {
    const tr = document.createElement('tr')
    row.forEach((cell, index) => {
      const td = document.createElement('td')
      const role = (roles[index] ?? 'text') as Role
      td.classList.add(`gs-${role}`)
      if (isNumericRole(role)) td.classList.add('gs-num')
      /* The clamp lives on a wrapper, never on the cell: `display: -webkit-box`
         on a `td` replaces `table-cell` and the whole grid collapses into one
         column. */
      const inner = document.createElement('span')
      inner.className = 'gs-cell'
      inner.textContent = cell
      td.append(inner)
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
 * So: the headline column is the name, the last numeric column is the figure that
 * goes right, and whatever is left becomes one muted line underneath.
 */
function buildList(
  header: string[],
  rows: string[][],
  roles: Role[],
  showHeader: boolean,
): HTMLElement {
  const columns = roles.length
  const nameIndex = Math.max(0, roles.indexOf('primary'))
  const valueIndex = roles.indexOf('num-strong')
  const detailIndexes = Array.from({ length: columns }, (_, i) => i).filter(
    (i) => i !== nameIndex && i !== valueIndex,
  )

  const list = document.createElement('div')
  list.className = 'gs-list'

  if (showHeader) {
    const head = document.createElement('div')
    head.className = 'gs-list-head'
    const left = document.createElement('span')
    left.textContent = header[nameIndex] ?? ''
    head.append(left)
    if (valueIndex >= 0) {
      const right = document.createElement('span')
      right.className = 'gs-num'
      right.textContent = header[valueIndex] ?? ''
      head.append(right)
    }
    list.append(head)
  }

  for (const row of rows) {
    const item = document.createElement('div')
    item.className = 'gs-item'

    const main = document.createElement('div')
    main.className = 'gs-item-main'

    const name = document.createElement('div')
    name.className = 'gs-item-name'
    name.textContent = row[nameIndex] ?? ''
    main.append(name)

    const detail = detailIndexes
      .map((i) => (row[i] ?? '').trim())
      .filter(Boolean)
      .join(' · ')
    if (detail) {
      const detailEl = document.createElement('div')
      detailEl.className = 'gs-item-detail'
      detailEl.textContent = detail
      main.append(detailEl)
    }
    item.append(main)

    if (valueIndex >= 0 && (row[valueIndex] ?? '').trim() !== '') {
      const value = document.createElement('div')
      value.className = 'gs-item-value'
      value.textContent = row[valueIndex] as string
      item.append(value)
    }

    list.append(item)
  }

  return list
}

/* ----- Paging -----

   A sheet is read up to `A1:Z100`, and the embed used to draw every row it was
   given. Ninety rows on a 1080p wall is a nine-pixel row: present, unreadable,
   and indistinguishable from a rendering fault. So the rows are dealt into pages
   of whatever actually fits at a legible size, and the pages cycle. */

let pageTimer: ReturnType<typeof setInterval> | undefined
/** Re-run the last render — used by the resize path, which must re-measure. */
let repaint: (() => void) | undefined
let active = false

function stopPaging(): void {
  if (pageTimer !== undefined) {
    clearInterval(pageTimer)
    pageTimer = undefined
  }
}

/**
 * How many rows fit in `body` at their natural height.
 *
 * `probe` must already be in the DOM and UNSTRETCHED, so a row measures the
 * height a row actually wants — padding, line height and the operator's font
 * scale included. Measuring a stretched table instead would report whatever
 * height the rows had been squeezed to, which is the number we are trying to
 * avoid.
 *
 * Two things this has to get right, both of which overfill the page by a row when
 * missed. The COLUMN HEADER takes height out of the same box and is not a row, so
 * it comes off the top before anything is divided. And the row height is the
 * TALLEST row, not the first: a cell that wraps to its second line makes that one
 * row taller than its neighbours, and a page sized off a single-line sample puts
 * the last row through the bottom edge — where `.gs-body` clips it silently.
 */
function rowsThatFit(
  body: HTMLElement,
  probe: HTMLElement,
  headSelector: string,
  rowSelector: string,
): number {
  const head = probe.querySelector<HTMLElement>(headSelector)
  const room =
    body.clientHeight - (head?.getBoundingClientRect().height ?? 0)

  let rowHeight = 0
  for (const row of probe.querySelectorAll<HTMLElement>(rowSelector)) {
    rowHeight = Math.max(rowHeight, row.getBoundingClientRect().height)
  }

  if (room <= 0 || rowHeight <= 0) return Number.POSITIVE_INFINITY
  return Math.max(1, Math.floor(room / rowHeight))
}

/** The page indicator: a dot per page, and the count in words. */
function buildFoot(page: number, pages: number, total: number): HTMLElement {
  const foot = document.createElement('div')
  foot.className = 'gs-foot'

  const dots = document.createElement('div')
  dots.className = 'gs-dots'
  for (let index = 0; index < pages; index += 1) {
    const dot = document.createElement('span')
    dot.className = index === page ? 'gs-dot is-on' : 'gs-dot'
    dots.append(dot)
  }
  foot.append(dots)

  const label = document.createElement('div')
  label.className = 'gs-page'
  label.textContent = `Page ${page + 1} of ${pages} · ${total} rows`
  foot.append(label)

  return foot
}

function render(
  config: Record<string, unknown>,
  data: GsheetsPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  stopPaging()
  applyChrome(config)

  if (!data || data.values.length === 0) {
    root.innerHTML = '<div class="gs"><p class="gs-empty">Loading…</p></div>'
    return
  }

  const showHeader = config.showHeader !== false
  const asList = String(config.layout ?? 'modern') !== 'table'

  const rows = padded(data.values)
  const { header, body: bodyRows } = split(data.values)
  const columns = header.length
  const roles = columnRoles(bodyRows, columns)
  const widths = columnWidths(rows, columns)
  const total = bodyRows.length

  const wrap = document.createElement('div')
  wrap.className = 'gs'

  if (data.title) {
    const title = document.createElement('div')
    title.className = 'gs-title'
    title.textContent = data.title
    wrap.append(title)
  }

  const body = document.createElement('div')
  body.className = 'gs-body'
  wrap.append(body)

  const build = (pageRows: string[][]): HTMLElement =>
    asList
      ? buildList(header, pageRows, roles, showHeader)
      : buildTable(header, pageRows, roles, widths, showHeader)

  // Pass one: everything, unstretched, purely to measure a row against the space.
  // It is in the live DOM because an off-document element has no layout to read.
  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))

  const headSelector = asList ? '.gs-list-head' : 'thead'
  const rowSelector = asList ? '.gs-item' : 'tbody tr'

  const measure = (): number => {
    const probe = build(bodyRows)
    body.append(probe)
    const fits = Math.min(
      rowsThatFit(body, probe, headSelector, rowSelector),
      Math.max(total, 1),
    )
    probe.remove()
    return fits
  }

  // Chicken and egg: the page indicator only exists when there is more than one
  // page, but it takes height from the very box whose height decides how many
  // pages there are. Measuring without it and then adding it overfills the last
  // row off the bottom — so once we know a footer is coming, put a stand-in in
  // place and measure again against the space actually left.
  let perPage = measure()
  if (total > perPage) {
    const spacer = buildFoot(0, 2, total)
    wrap.append(spacer)
    perPage = measure()
    spacer.remove()
  }

  const pages = perPage > 0 ? Math.ceil(total / perPage) : 1
  let page = 0

  const paint = (): void => {
    const start = page * perPage
    const content = build(bodyRows.slice(start, start + perPage))
    content.classList.add('is-fitted')
    body.replaceChildren(content)

    const oldFoot = wrap.querySelector('.gs-foot')
    if (oldFoot) oldFoot.remove()
    // No footer when it would only ever read "page 1 of 1": on a sheet that fits,
    // the row count is already on screen and the line is pure chrome.
    if (pages > 1) wrap.append(buildFoot(page, pages, total))
  }

  paint()

  if (pages > 1 && active) {
    pageTimer = setInterval(() => {
      page = (page + 1) % pages
      paint()
    }, PAGE_MS)
  }
}

let lastConfig: Record<string, unknown> = {}
let lastData: GsheetsPayload | null = null
let lastMeta: AppDataMeta | null = null

repaint = () => render(lastConfig, lastData, lastMeta)

/* A resize changes how many rows fit, and the count is measured, not derived —
   so it has to be measured again. Debounced because the CMS preview pane resizes
   continuously while an operator drags it. */
let resizeTimer: ReturnType<typeof setTimeout> | undefined
window.addEventListener('resize', () => {
  if (resizeTimer !== undefined) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => repaint?.(), 200)
})

connectToHost<Record<string, unknown>, GsheetsPayload>(
  ({ config, data, meta }) => {
    lastConfig = config
    lastData = data
    lastMeta = meta
    render(config, data, meta)
  },
  {
    onActive: (isActive) => {
      // The player preloads the next item into a hidden slot. A board that paged
      // while off-screen would arrive showing page three of three, having spent
      // its first two pages on nobody.
      active = isActive
      repaint?.()
    },
  },
)
