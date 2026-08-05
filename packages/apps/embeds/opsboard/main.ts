import type {
  OpsBoardConfig,
  OpsBoardLayout,
  OpsBoardManualRow,
} from '../../src/opsboard/config.js'
import type {
  OpsBoardPayload,
  OpsBoardRow,
  OpsBoardStatus,
} from '../../src/opsboard/payload.js'
import { opsBoardPreset } from '../../src/opsboard/presets.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

type RuntimeConfig = Partial<OpsBoardConfig>

const STATUSES = new Set<OpsBoardStatus>([
  'neutral',
  'planned',
  'active',
  'warning',
  'blocked',
  'done',
])

const STATUS_LABELS: Record<OpsBoardStatus, string> = {
  neutral: 'Neutral',
  planned: 'Planned',
  active: 'Active',
  warning: 'Warning',
  blocked: 'Blocked',
  done: 'Done',
}

let config: RuntimeConfig = {}
let data: OpsBoardPayload | null = null
let meta: AppDataMeta | null = null
let page = 0
let active = false
let timer: ReturnType<typeof setInterval> | undefined
let lastSizeKey = ''

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function statusOf(value: unknown): OpsBoardStatus {
  const normalized = text(value).toLocaleLowerCase() as OpsBoardStatus
  return STATUSES.has(normalized) ? normalized : 'neutral'
}

function optional(
  target: OpsBoardRow,
  key: 'primary' | 'secondary' | 'note' | 'group',
  value: unknown,
): void {
  const normalized = text(value)
  if (normalized) target[key] = normalized
}

function normalizedRow(value: unknown): OpsBoardRow | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const label = text(record.label)
  if (!label) return null
  const row: OpsBoardRow = { label, status: statusOf(record.status) }
  optional(row, 'primary', record.primary)
  optional(row, 'secondary', record.secondary)
  optional(row, 'note', record.note)
  optional(row, 'group', record.group)
  return row
}

function orderOf(
  value: unknown,
  index: number,
): { order?: number; index: number } {
  const sortOrder =
    typeof value === 'object' && value !== null
      ? (value as Partial<OpsBoardManualRow>).sortOrder
      : undefined
  return typeof sortOrder === 'number' && Number.isFinite(sortOrder)
    ? { order: sortOrder, index }
    : { index }
}

function compareOrder(
  a: { order?: number; index: number },
  b: { order?: number; index: number },
): number {
  if (a.order === undefined && b.order === undefined) return a.index - b.index
  if (a.order === undefined) return 1
  if (b.order === undefined) return -1
  return a.order - b.order || a.index - b.index
}

function rowsForDisplay(): OpsBoardRow[] {
  if (config.source !== 'manual') {
    return Array.isArray(data?.rows)
      ? data.rows
          .map(normalizedRow)
          .filter((row): row is OpsBoardRow => row !== null)
      : []
  }

  return (Array.isArray(config.rows) ? config.rows : [])
    .map((row, index) => ({ row: normalizedRow(row), ...orderOf(row, index) }))
    .filter(
      (item): item is { row: OpsBoardRow; order?: number; index: number } =>
        item.row !== null,
    )
    .sort(compareOrder)
    .map(({ row }) => row)
}

function layoutOf(value: unknown): OpsBoardLayout {
  return value === 'cards' || value === 'queue' ? value : 'status-table'
}

interface PagePlan {
  size: number
  columns: number
  sizeKey: string
}

/**
 * Deliberately finite slots: all three modes render each page into exact grid
 * tracks. A large payload therefore creates more pages, never smaller rows.
 */
function pagePlan(layout: OpsBoardLayout): PagePlan {
  const width = Math.max(root?.clientWidth ?? window.innerWidth, 1)
  const height = Math.max(root?.clientHeight ?? window.innerHeight, 1)
  const ratio = width / height
  const shape = ratio < 0.8 ? 'portrait' : ratio > 1.25 ? 'landscape' : 'square'

  if (layout === 'cards') {
    if (shape === 'portrait')
      return { size: 5, columns: 1, sizeKey: `${shape}:${layout}` }
    if (shape === 'landscape')
      return { size: 6, columns: 3, sizeKey: `${shape}:${layout}` }
    return { size: 6, columns: 2, sizeKey: `${shape}:${layout}` }
  }
  if (layout === 'queue') {
    return {
      size: shape === 'portrait' ? 8 : shape === 'landscape' ? 8 : 7,
      columns: 1,
      sizeKey: `${shape}:${layout}`,
    }
  }
  return {
    size: shape === 'portrait' ? 8 : shape === 'landscape' ? 10 : 8,
    columns: 1,
    sizeKey: `${shape}:${layout}`,
  }
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  value?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (value !== undefined) node.textContent = value
  return node
}

function dataCell(
  className: string,
  label: string,
  value?: string,
): HTMLElement {
  const cell = element('div', `ob-cell ${className}`, value || '—')
  cell.dataset.label = label
  if (!value) cell.classList.add('is-empty')
  return cell
}

function statusBadge(row: OpsBoardRow): HTMLElement {
  const badge = element(
    'span',
    `ob-status is-${row.status}`,
    STATUS_LABELS[row.status],
  )
  const wrap = element('div', 'ob-status-cell')
  wrap.append(badge)
  return wrap
}

function tableHeader(
  labels: ReturnType<typeof opsBoardPreset>['labels'],
): HTMLElement {
  const header = element('div', 'ob-table-head')
  for (const [key, label] of [
    ['group', labels.group],
    ['label', labels.label],
    ['primary', labels.primary],
    ['secondary', labels.secondary],
    ['status', labels.status],
    ['note', labels.note],
  ] as const) {
    header.append(element('div', `ob-th ob-${key}`, label))
  }
  return header
}

function statusTable(
  rows: OpsBoardRow[],
  size: number,
  labels: ReturnType<typeof opsBoardPreset>['labels'],
): HTMLElement {
  const table = element('div', 'ob-table')
  if (config.showHeader !== false) table.append(tableHeader(labels))
  const body = element('div', 'ob-table-body')
  body.style.setProperty('--ob-page-size', String(size))
  for (const row of rows) {
    const line = element('div', 'ob-table-row')
    line.append(
      dataCell('ob-group', labels.group, row.group),
      dataCell('ob-label', labels.label, row.label),
      dataCell('ob-primary', labels.primary, row.primary),
      dataCell('ob-secondary', labels.secondary, row.secondary),
      statusBadge(row),
      dataCell('ob-note', labels.note, row.note),
    )
    body.append(line)
  }
  table.append(body)
  return table
}

function cards(
  rows: OpsBoardRow[],
  size: number,
  columns: number,
  labels: ReturnType<typeof opsBoardPreset>['labels'],
): HTMLElement {
  const grid = element('div', 'ob-cards')
  grid.style.setProperty('--ob-page-size', String(size))
  grid.style.setProperty('--ob-columns', String(columns))
  grid.style.setProperty('--ob-rows', String(Math.ceil(size / columns)))
  for (const row of rows) {
    const card = element('article', `ob-card is-${row.status}`)
    const head = element('div', 'ob-card-head')
    const title = element('div', 'ob-card-title', row.label)
    if (row.group) title.prepend(element('span', 'ob-card-group', row.group))
    head.append(title, statusBadge(row))
    const values = element('div', 'ob-card-values')
    values.append(
      dataCell('ob-primary', labels.primary, row.primary),
      dataCell('ob-secondary', labels.secondary, row.secondary),
    )
    card.append(head, values)
    if (row.note) card.append(element('div', 'ob-card-note', row.note))
    grid.append(card)
  }
  return grid
}

function queue(
  rows: OpsBoardRow[],
  pageStart: number,
  size: number,
  labels: ReturnType<typeof opsBoardPreset>['labels'],
): HTMLElement {
  const list = element('ol', 'ob-queue')
  list.style.setProperty('--ob-page-size', String(size))
  rows.forEach((row, index) => {
    const item = element('li', `ob-queue-item is-${row.status}`)
    const position = element(
      'div',
      'ob-queue-position',
      String(pageStart + index + 1).padStart(2, '0'),
    )
    const identity = element('div', 'ob-queue-identity')
    identity.append(element('div', 'ob-queue-label', row.label))
    if (row.group) identity.append(element('div', 'ob-queue-group', row.group))
    const values = element('div', 'ob-queue-values')
    values.append(
      dataCell('ob-primary', labels.primary, row.primary),
      dataCell('ob-secondary', labels.secondary, row.secondary),
    )
    const note = element('div', 'ob-queue-note', row.note || '')
    item.append(position, identity, values, statusBadge(row), note)
    list.append(item)
  })
  return list
}

function pageFooter(
  current: number,
  count: number,
  total: number,
): HTMLElement {
  const foot = element('footer', 'ob-foot')
  const dots = element('div', 'ob-dots')
  const visibleDots = Math.min(count, 12)
  const currentDot = Math.min(
    visibleDots - 1,
    Math.floor((current * visibleDots) / count),
  )
  for (let index = 0; index < visibleDots; index += 1) {
    dots.append(
      element('span', index === currentDot ? 'ob-dot is-current' : 'ob-dot'),
    )
  }
  foot.append(
    dots,
    element(
      'div',
      'ob-page-label',
      `Page ${current + 1} of ${count} · ${total} rows`,
    ),
  )
  return foot
}

function header(sourceTitle?: string, updatedAt?: string): HTMLElement | null {
  const heading = text(config.heading)
  if (!heading && !sourceTitle) return null
  const head = element('header', 'ob-head')
  if (heading) head.append(element('h1', 'ob-heading', heading))
  const details: string[] = []
  if (sourceTitle) details.push(sourceTitle)
  if (updatedAt) {
    const parsed = new Date(updatedAt)
    if (!Number.isNaN(parsed.getTime())) {
      details.push(
        `Updated ${parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      )
    }
  }
  if (details.length)
    head.append(element('div', 'ob-source', details.join(' · ')))
  return head
}

function render(): void {
  if (!root) return
  const layout = layoutOf(config.layout)
  const plan = pagePlan(layout)
  lastSizeKey = plan.sizeKey
  const rows = rowsForDisplay()
  const pageCount = Math.max(1, Math.ceil(rows.length / plan.size))
  page %= pageCount
  const start = page * plan.size
  const visibleRows = rows.slice(start, start + plan.size)
  const preset = opsBoardPreset(config.preset)

  root.className = config.theme === 'light' ? 'ob-theme-light' : 'ob-theme-dark'
  const shell = element('main', `ob ob-layout-${layout}`)
  const head = header(data?.sourceTitle, data?.updatedAt)
  if (head) shell.append(head)

  if (rows.length === 0) {
    const waiting = config.source !== 'manual' && data === null
    shell.append(
      element(
        'div',
        'ob-empty',
        waiting ? 'Waiting for synced rows…' : 'No operational rows to show',
      ),
    )
  } else {
    const board = element('section', 'ob-board')
    if (layout === 'cards') {
      board.append(cards(visibleRows, plan.size, plan.columns, preset.labels))
    } else if (layout === 'queue') {
      board.append(queue(visibleRows, start, plan.size, preset.labels))
    } else {
      board.append(statusTable(visibleRows, plan.size, preset.labels))
    }
    shell.append(board)
    if (pageCount > 1) shell.append(pageFooter(page, pageCount, rows.length))
  }

  root.replaceChildren(shell)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

function stopTimer(): void {
  if (timer !== undefined) clearInterval(timer)
  timer = undefined
}

function pageMilliseconds(): number {
  const seconds =
    typeof config.pageSeconds === 'number' &&
    Number.isFinite(config.pageSeconds)
      ? config.pageSeconds
      : 12
  return Math.min(300, Math.max(3, seconds)) * 1000
}

function restartTimer(): void {
  stopTimer()
  const plan = pagePlan(layoutOf(config.layout))
  const pageCount = Math.ceil(rowsForDisplay().length / plan.size)
  if (!active || pageCount < 2) return
  timer = setInterval(() => {
    page = (page + 1) % pageCount
    render()
  }, pageMilliseconds())
}

connectToHost<RuntimeConfig, OpsBoardPayload>(
  (message) => {
    config = message.config
    data = message.data
    meta = message.meta
    page = 0
    render()
    restartTimer()
  },
  {
    onActive: (isActive) => {
      const becameActive = isActive && !active
      active = isActive
      if (becameActive) page = 0
      render()
      restartTimer()
    },
  },
)

if (root && typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => {
    const nextSizeKey = pagePlan(layoutOf(config.layout)).sizeKey
    if (nextSizeKey === lastSizeKey) return
    page = 0
    render()
    restartTimer()
  }).observe(root)
}
