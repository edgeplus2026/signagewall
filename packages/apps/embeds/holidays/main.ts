import { COUNTRY_OPTIONS } from '../../src/holidays/countries.js'
import type { HolidaysPayload } from '../../src/holidays/payload.js'
import { DEFAULT_ACCENT } from '../../src/_shared/theme.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'
import { applyTextStyle } from '../_shared/text-style.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

const COUNTRY_NAMES = new Map<string, string>(
  COUNTRY_OPTIONS.map((option) => [option.value, option.label]),
)

const THEMES: Record<string, { bg: string; text: string }> = {
  light: { bg: '#FFFFFF', text: '#0F172A' },
  dark: { bg: '#0B1220', text: '#E2E8F0' },
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

/** Whole days from today (player-local) to an ISO `YYYY-MM-DD` date. */
function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return NaN
  const target = new Date(y, m - 1, d).getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((target - today) / 86_400_000)
}

function relativeLabel(dateStr: string): string {
  const days = daysUntil(dateStr)
  if (Number.isNaN(days)) return ''
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `in ${days} days`
}

function applyChrome(config: Record<string, unknown>): void {
  if (!root) return
  const theme = THEMES[String(config.theme)] ?? THEMES.dark!
  root.style.background = theme.bg
  root.style.color = theme.text
  root.style.setProperty('--hol-accent', DEFAULT_ACCENT)
  applyTextStyle(root, config)
}

function render(
  config: Record<string, unknown>,
  data: HolidaysPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  applyChrome(config)

  if (!data || data.holidays.length === 0) {
    root.innerHTML =
      '<div class="hol"><p class="hol-empty">Loading holidays…</p></div>'
    return
  }

  const count =
    typeof config.count === 'number' && config.count > 0 ? config.count : 5

  const wrap = document.createElement('div')
  wrap.className = 'hol'

  const head = document.createElement('div')
  head.className = 'hol-head'
  head.textContent = `Public holidays — ${COUNTRY_NAMES.get(data.country) ?? data.country}`
  wrap.append(head)

  const list = document.createElement('div')
  list.className = 'hol-list'
  for (const holiday of data.holidays.slice(0, count)) {
    const row = document.createElement('div')
    row.className = 'hol-row'

    const when = document.createElement('div')
    when.className = 'hol-when'
    const date = document.createElement('div')
    date.className = 'hol-date'
    const parts = holiday.date.split('-').map(Number)
    date.textContent =
      parts.length === 3 && parts[0] && parts[1] && parts[2]
        ? dateFormat.format(new Date(parts[0], parts[1] - 1, parts[2]))
        : holiday.date
    const rel = document.createElement('div')
    rel.className = 'hol-rel'
    rel.textContent = relativeLabel(holiday.date)
    when.append(date, rel)

    const name = document.createElement('div')
    name.className = 'hol-name'
    const local = document.createElement('div')
    local.className = 'hol-local'
    local.textContent = holiday.localName || holiday.name
    name.append(local)
    // Show the English name too, but only when it adds something.
    if (holiday.name && holiday.name !== holiday.localName) {
      const en = document.createElement('div')
      en.className = 'hol-en'
      en.textContent = holiday.name
      name.append(en)
    }

    row.append(when, name)
    list.append(row)
  }
  wrap.append(list)
  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, HolidaysPayload>(
  ({ config, data, meta }) => {
    render(config, data, meta)
  },
)
