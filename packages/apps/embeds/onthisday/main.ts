import type { OnThisDayPayload } from '../../src/onthisday/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

const THEMES: Record<string, { bg: string; text: string }> = {
  light: {
    bg: 'radial-gradient(120% 120% at 85% 0%, #ffffff 0%, #eef0f7 70%)',
    text: '#0F172A',
  },
  dark: {
    bg: 'radial-gradient(120% 120% at 85% 0%, #211a3d 0%, #0B1020 62%)',
    text: '#E7ECF3',
  },
}

// English-only: the events come from English Wikipedia, so format the date in
// English too rather than the player's locale.
const monthDayFormat = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric' })

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
  root.style.setProperty('--otd-accent', '#A78BFA')
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

  const count = typeof config.count === 'number' && config.count > 0 ? config.count : 6

  const wrap = document.createElement('div')
  wrap.className = 'otd'

  const head = document.createElement('div')
  head.className = 'otd-head'
  const eyebrow = document.createElement('div')
  eyebrow.className = 'otd-eyebrow'
  eyebrow.textContent = 'On this day'
  const date = document.createElement('div')
  date.className = 'otd-date'
  date.textContent = formatMonthDay(data.monthDay)
  head.append(eyebrow, date)
  wrap.append(head)

  // Events as a vertical timeline: year on the left, a dot on the line, the text.
  const list = document.createElement('div')
  list.className = 'otd-list'
  for (const event of data.events.slice(0, count)) {
    const row = document.createElement('div')
    row.className = 'otd-event'
    const year = document.createElement('div')
    year.className = 'otd-year'
    year.textContent = formatYear(event.year)
    const body = document.createElement('div')
    body.className = 'otd-body'
    const text = document.createElement('div')
    text.className = 'otd-text'
    text.textContent = event.text
    body.append(text)
    row.append(year, body)
    list.append(row)
  }
  wrap.append(list)

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, OnThisDayPayload>(({ config, data, meta }) => {
  render(config, data, meta)
})
