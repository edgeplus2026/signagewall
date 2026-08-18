import type { GsheetsPayload } from '../../src/gsheets/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'
import { applyTextStyle } from '../_shared/text-style.js'
import { resumeIndex, stepMs } from '../_shared/dwell.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

/** Fallback when the operator's `pageSeconds` is missing or out of range. */
const DEFAULT_PAGE_SECONDS = 20

function applyChrome(config: Record<string, unknown>): void {
  if (!root) return
  // The palette lives in CSS, keyed off this class — a rate board needs a dozen
  // related colours (bands, rules, four text voices), and setting them one by one
  // from here is how two of them end up disagreeing.
  root.className = config.theme === 'light' ? 'gs-theme-light' : 'gs-theme-dark'
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

/* ----- The row colour bar (Modern) -----

   The bars are generated rather than configured — the sheet carries no status
   column the app could read, and asking the operator to colour thirty rows by
   hand is not a thing anyone would do twice.

   But they are generated from the ROW'S OWN TEXT, not from a random number, and
   that distinction is the whole design. `Math.random()` would re-roll on every
   render — and this board re-renders on every page turn, on every resize and on
   every refresh from Google — so a row's bar would change colour every twenty
   seconds. Colour that changes while the data does not is worse than no colour:
   it reads as a status that keeps flipping. Hashing the row's contents instead
   makes the palette look scattered while being completely stable, and a row that
   moves between pages carries its own colour with it.

   The palette is fixed rather than a random hue, because a free hue lands on mud
   and on neon about a third of the time. */
const BAR_COLOURS = [
  '#4ADE80', // green
  '#60A5FA', // blue
  '#F87171', // red
  '#FBBF24', // amber
  '#A78BFA', // violet
  '#22D3EE', // cyan
  '#FB923C', // orange
  '#F472B6', // pink
]

/** FNV-1a, 32-bit. Small, well-spread, and it never has to leave this file. */
function hashRow(cells: string[]): number {
  let hash = 0x811c9dc5
  const text = cells.join('')
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * A colour per row, avoiding the one directly above it.
 *
 * A plain hash gave three blues in the first four rows often enough to matter,
 * and adjacent bars in the same colour do not read as chance — they read as two
 * rows that belong together, which is a meaning the sheet never asked for.
 * Nudging a collision to the next colour in the palette costs nothing and is
 * still deterministic: same rows in, same colours out.
 */
function barColours(rows: string[][]): string[] {
  let previous = -1
  return rows.map((cells) => {
    let index = hashRow(cells) % BAR_COLOURS.length
    if (index === previous) index = (index + 1) % BAR_COLOURS.length
    previous = index
    return BAR_COLOURS[index] as string
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

/**
 * Column widths, weighted by the longest cell and clamped so no single column
 * can crowd out the rest.
 *
 * Computed over EVERY row, not over the page on screen — widths derived from one
 * page shift when the next page's cells are a different length, and a table whose
 * columns jump every twenty seconds is unreadable in a way a slightly imperfect
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

/**
 * The board: one table, with each row marked by a colour bar down its left edge.
 * A second "banded rows" layout used to be selectable; it was the same table
 * with a different row separator, which is not a choice worth putting in front
 * of someone who has just picked a spreadsheet.
 */
function buildTable(
  header: string[],
  rows: string[][],
  roles: Role[],
  widths: string[],
  showHeader: boolean,
  bars: string[],
): HTMLElement {
  const table = document.createElement('table')
  table.className = 'gs-table is-modern'

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
  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr')
    if (bars[rowIndex]) {
      tr.style.setProperty('--gs-bar', bars[rowIndex] as string)
    }
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
  })
  table.append(tbody)
  return table
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
/**
 * Which page is showing, kept OUTSIDE `render` so it survives one.
 *
 * A board is re-rendered every time it comes back on screen, and a page counter
 * local to that render restarts at one each time — so a sheet too long to get
 * through in a single slot showed its opening rows forever and never the rest,
 * however many times it came round. Holding the cursor here means each visit
 * carries on from where the last was cut off, and the whole sheet is seen across
 * a few rotations. It is re-clamped on every render because a resize changes how
 * many rows fit, and with it how many pages exist.
 */
let pageCursor = 0

function stopPaging(): void {
  if (pageTimer !== undefined) {
    clearInterval(pageTimer)
    pageTimer = undefined
  }
}

/** Seconds per page as the operator set it, clamped to the manifest's range. */
function pageMs(
  config: Record<string, unknown>,
  pages: number,
  durationMs: number | undefined,
): number {
  const raw = config.pageSeconds
  const seconds =
    typeof raw === 'number' && Number.isFinite(raw) ? raw : DEFAULT_PAGE_SECONDS
  const configured = Math.min(300, Math.max(3, seconds)) * 1000
  // Only a ceiling: the board has just its slot to get through every page.
  return stepMs(configured, pages, durationMs)
}

/**
 * How many rows fit in `body` at their natural height.
 *
 * `probe` must already be in the DOM, so a row measures the height a row actually
 * wants — padding, line height and the operator's font scale included.
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
  const room = body.clientHeight - (head?.getBoundingClientRect().height ?? 0)

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

  // Over EVERY row, once, then sliced per page — a page-local pass would restart
  // the "not the same as the one above" rule at each page boundary, so a row's
  // bar would change colour depending on which page it happened to land on.
  const bars = barColours(bodyRows)

  const build = (start: number, pageRows: string[][]): HTMLElement =>
    buildTable(
      header,
      pageRows,
      roles,
      widths,
      showHeader,
      bars.slice(start, start + pageRows.length),
    )

  // Pass one: everything, purely to measure a row against the space. It is in the
  // live DOM because an off-document element has no layout to read.
  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))

  const measure = (): number => {
    const probe = build(0, bodyRows)
    body.append(probe)
    const fits = Math.min(
      rowsThatFit(body, probe, 'thead', 'tbody tr'),
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
  let page = resumeIndex(pageCursor, pages)

  const paint = (): void => {
    const start = page * perPage
    body.replaceChildren(build(start, bodyRows.slice(start, start + perPage)))

    const oldFoot = wrap.querySelector('.gs-foot')
    if (oldFoot) oldFoot.remove()
    // No footer when it would only ever read "page 1 of 1": on a sheet that fits,
    // the row count is already on screen and the line is pure chrome.
    if (pages > 1) wrap.append(buildFoot(page, pages, total))
  }

  paint()

  if (pages > 1 && active) {
    const interval = pageMs(config, pages, lastDurationMs)
    pageTimer = setInterval(() => {
      page = (page + 1) % pages
      pageCursor = page
      paint()
    }, interval)
  }
}

let lastConfig: Record<string, unknown> = {}
let lastData: GsheetsPayload | null = null
let lastMeta: AppDataMeta | null = null
/** The slot's dwell, or undefined on a host that imposes none (CMS preview). */
let lastDurationMs: number | undefined

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
  ({ config, data, meta, durationMs }) => {
    lastConfig = config
    lastData = data
    lastMeta = meta
    lastDurationMs = durationMs
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
