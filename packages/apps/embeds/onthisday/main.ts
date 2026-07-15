import type { OnThisDayPayload } from '../../src/onthisday/payload.js'
import { DEFAULT_ACCENT } from '../../src/_shared/theme.js'
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

const monthDayFormat = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric',
})

/** "07-16" → "July 16" (uses the current year only to build a valid Date). */
function formatMonthDay(monthDay: string): string {
  const [m, d] = monthDay.split('-').map(Number)
  if (!m || !d) return ''
  return monthDayFormat.format(new Date(new Date().getFullYear(), m - 1, d))
}

/** BCE years read as "480 BC"; CE years as the plain number. */
function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : String(year)
}

function applyChrome(config: Record<string, unknown>): void {
  if (!root) return
  const theme = THEMES[String(config.theme)] ?? THEMES.dark!
  root.style.background = theme.bg
  root.style.color = theme.text
  root.style.setProperty('--otd-accent', DEFAULT_ACCENT)
  applyTextStyle(root, config)
}

function render(
  config: Record<string, unknown>,
  data: OnThisDayPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  applyChrome(config)

  if (!data || data.events.length === 0) {
    root.innerHTML = '<div class="otd"><p class="otd-empty">Loading…</p></div>'
    return
  }

  const count =
    typeof config.count === 'number' && config.count > 0 ? config.count : 6

  const wrap = document.createElement('div')
  wrap.className = 'otd'

  const head = document.createElement('div')
  head.className = 'otd-head'
  const title = document.createElement('div')
  title.className = 'otd-title'
  title.textContent = 'On this day'
  const date = document.createElement('div')
  date.className = 'otd-date'
  date.textContent = formatMonthDay(data.monthDay)
  head.append(title, date)
  wrap.append(head)

  const list = document.createElement('div')
  list.className = 'otd-list'
  for (const event of data.events.slice(0, count)) {
    const row = document.createElement('div')
    row.className = 'otd-event'
    const year = document.createElement('div')
    year.className = 'otd-year'
    year.textContent = formatYear(event.year)
    const text = document.createElement('div')
    text.className = 'otd-text'
    text.textContent = event.text
    row.append(year, text)
    list.append(row)
  }
  wrap.append(list)
  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, OnThisDayPayload>(
  ({ config, data, meta }) => {
    render(config, data, meta)
  },
)
