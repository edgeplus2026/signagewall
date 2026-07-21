import type { Holiday, HolidaysPayload } from '../../src/holidays/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

const THEMES: Record<string, { bg: string; text: string }> = {
  light: {
    bg: 'radial-gradient(120% 120% at 15% 0%, #ffffff 0%, #eef2f7 70%)',
    text: '#0F172A',
  },
  dark: {
    bg: 'radial-gradient(120% 120% at 15% 0%, #16233f 0%, #0B1220 62%)',
    text: '#E7ECF3',
  },
}

const dowFormat = new Intl.DateTimeFormat('en', { weekday: 'short' })
const monFormat = new Intl.DateTimeFormat('en', { month: 'short' })

function parseDate(dateStr: string): Date | null {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** Whole days from today (player-local) to an ISO `YYYY-MM-DD` date. */
function daysUntil(date: Date): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((date.getTime() - today) / 86_400_000)
}

function relativeLabel(date: Date): string {
  const days = daysUntil(date)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `in ${days} days`
  if (days < 14) return 'in a week'
  return `in ${Math.round(days / 7)} weeks`
}

function applyChrome(config: Record<string, unknown>): void {
  if (!root) return
  const theme = THEMES[String(config.theme)] ?? THEMES.dark!
  root.style.background = theme.bg
  root.style.color = theme.text
  root.style.setProperty('--hol-accent', '#F43F5E')
}

/** The calendar tile for a holiday's date (weekday / big day number / month). */
function tile(holiday: Holiday): HTMLElement {
  const date = parseDate(holiday.date)
  const el = document.createElement('div')
  el.className = 'hol-tile'
  const dow = document.createElement('span')
  dow.className = 'hol-tile-dow'
  dow.textContent = date ? dowFormat.format(date) : ''
  const day = document.createElement('span')
  day.className = 'hol-tile-day'
  day.textContent = date ? String(date.getDate()) : holiday.date.slice(-2)
  const mon = document.createElement('span')
  mon.className = 'hol-tile-mon'
  mon.textContent = date ? monFormat.format(date) : ''
  el.append(dow, day, mon)
  return el
}

function render(
  config: Record<string, unknown>,
  data: HolidaysPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  applyChrome(config)

  if (!data || data.holidays.length === 0) {
    root.innerHTML = '<div class="hol"><p class="hol-empty">Loading holidays…</p></div>'
    return
  }

  const count = typeof config.count === 'number' && config.count > 0 ? config.count : 5
  const holidays = data.holidays.slice(0, count)
  const [next, ...rest] = holidays

  const wrap = document.createElement('div')
  wrap.className = 'hol'

  // Eyebrow: what this is + which country.
  const eyebrow = document.createElement('div')
  eyebrow.className = 'hol-eyebrow'
  eyebrow.textContent = `Public holidays · ${data.countryName || data.country}`
  wrap.append(eyebrow)

  // Hero: the next holiday, featured with its date tile + countdown.
  if (next) {
    const date = parseDate(next.date)
    const hero = document.createElement('div')
    hero.className = 'hol-hero'
    const main = document.createElement('div')
    main.className = 'hol-hero-main'
    const rel = document.createElement('div')
    rel.className = 'hol-hero-rel'
    rel.textContent = date ? relativeLabel(date) : ''
    const name = document.createElement('div')
    name.className = 'hol-hero-name'
    name.textContent = next.localName || next.name
    main.append(rel, name)
    if (next.name && next.name !== next.localName) {
      const en = document.createElement('div')
      en.className = 'hol-hero-en'
      en.textContent = next.name
      main.append(en)
    }
    hero.append(tile(next), main)
    wrap.append(hero)
  }

  // The rest, as a compact upcoming list.
  if (rest.length > 0) {
    const list = document.createElement('div')
    list.className = 'hol-list'
    for (const holiday of rest) {
      const date = parseDate(holiday.date)
      const row = document.createElement('div')
      row.className = 'hol-row'
      const when = document.createElement('div')
      when.className = 'hol-row-when'
      when.textContent = date
        ? `${dowFormat.format(date)} ${date.getDate()} ${monFormat.format(date)}`
        : holiday.date
      const label = document.createElement('div')
      label.className = 'hol-row-name'
      label.textContent = holiday.localName || holiday.name
      const rel = document.createElement('div')
      rel.className = 'hol-row-rel'
      rel.textContent = date ? relativeLabel(date) : ''
      row.append(when, label, rel)
      list.append(row)
    }
    wrap.append(list)
  }

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, HolidaysPayload>(({ config, data, meta }) => {
  render(config, data, meta)
})
