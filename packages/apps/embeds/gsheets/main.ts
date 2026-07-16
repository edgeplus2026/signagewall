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

function buildTable(values: string[][], hasHeader: boolean): HTMLElement {
  const rows = padded(values)
  const table = document.createElement('table')
  table.className = 'gs-table'

  let bodyRows = rows
  if (hasHeader && rows.length > 0) {
    const thead = document.createElement('thead')
    const tr = document.createElement('tr')
    for (const cell of rows[0] as string[]) {
      const th = document.createElement('th')
      th.textContent = cell
      tr.append(th)
    }
    thead.append(tr)
    table.append(thead)
    bodyRows = rows.slice(1)
  }

  const tbody = document.createElement('tbody')
  for (const row of bodyRows) {
    const tr = document.createElement('tr')
    for (const cell of row) {
      const td = document.createElement('td')
      td.textContent = cell
      tr.append(td)
    }
    tbody.append(tr)
  }
  table.append(tbody)
  return table
}

function buildKpi(values: string[][], hasHeader: boolean): HTMLElement {
  const kpi = document.createElement('div')
  kpi.className = 'gs-kpi'
  const valueRow = hasHeader ? values[1] : values[0]
  const value = valueRow?.[0] ?? ''
  const label = hasHeader ? (values[0]?.[0] ?? '') : ''

  const valueEl = document.createElement('div')
  valueEl.className = 'gs-kpi-value'
  valueEl.textContent = value || '—'
  kpi.append(valueEl)
  if (label) {
    const labelEl = document.createElement('div')
    labelEl.className = 'gs-kpi-label'
    labelEl.textContent = label
    kpi.append(labelEl)
  }
  return kpi
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
  const kpi = String(config.layout) === 'kpi'

  const wrap = document.createElement('div')
  wrap.className = 'gs'

  if (data.title) {
    const title = document.createElement('div')
    title.className = 'gs-title'
    title.textContent = data.title
    wrap.append(title)
  }

  wrap.append(
    kpi ? buildKpi(data.values, hasHeader) : buildTable(data.values, hasHeader),
  )

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, GsheetsPayload>(
  ({ config, data, meta }) => {
    render(config, data, meta)
  },
)
