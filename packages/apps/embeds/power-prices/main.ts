import type {
  PowerHour,
  PowerPricesPayload,
} from '../../src/power-prices/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

const THEMES: Record<string, { bg: string; text: string; barLightness: number }> = {
  light: { bg: '#F8FAFC', text: '#0F172A', barLightness: 44 },
  dark: { bg: '#0B1220', text: '#E2E8F0', barLightness: 56 },
}

/** Cheap → expensive maps green(140°) → amber → red(8°) across today's range. */
function levelHue(ratio: number): number {
  const clamped = Math.max(0, Math.min(1, ratio))
  return 140 - 132 * clamped
}

function levelColor(ratio: number, lightness: number): string {
  return `hsl(${levelHue(ratio).toFixed(0)} 70% ${lightness}%)`
}

/** Spot prices read best in minor units per kWh (euro-cents). */
function centsPerKwh(eurPerKwh: number): number {
  return eurPerKwh * 100
}

function formatCents(eurPerKwh: number): string {
  return centsPerKwh(eurPerKwh).toFixed(1)
}

/** "HH:00" from a local ISO hour start. */
function hourLabel(start: string): string {
  return `${start.slice(11, 13)}:00`
}

function priceOf(hour: PowerHour): number | undefined {
  return hour.eur
}

function applyChrome(config: Record<string, unknown>): { barLightness: number } {
  if (!root) return { barLightness: 56 }
  const theme = THEMES[String(config.theme)] ?? THEMES.dark!
  root.style.background = theme.bg
  root.style.color = theme.text
  root.style.setProperty('--pp-accent', '#EAB308')
  return { barLightness: theme.barLightness }
}

function statItem(label: string, value: string, sub: string, color?: string): HTMLElement {
  const item = document.createElement('div')
  item.className = 'pp-stat'
  const l = document.createElement('div')
  l.className = 'pp-stat-label'
  l.textContent = label
  const v = document.createElement('div')
  v.className = 'pp-stat-value'
  v.textContent = value
  if (color) v.style.color = color
  const s = document.createElement('div')
  s.className = 'pp-stat-sub'
  s.textContent = sub
  item.append(l, v, s)
  return item
}

function render(
  config: Record<string, unknown>,
  data: PowerPricesPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  const { barLightness } = applyChrome(config)

  if (!data || data.hours.length === 0) {
    root.innerHTML = '<div class="pp"><p class="pp-empty">Loading prices…</p></div>'
    return
  }

  const current = data.hours[data.currentIndex] ?? null
  const day = current ? current.start.slice(0, 10) : data.hours[0]!.start.slice(0, 10)
  const todays = data.hours.filter((h) => h.start.slice(0, 10) === day)

  const priced = todays
    .map((h) => priceOf(h))
    .filter((p): p is number => typeof p === 'number')
  const max = priced.length ? Math.max(...priced) : 1
  const min = priced.length ? Math.min(...priced) : 0
  const floor = Math.min(0, min)
  const span = max - floor || 1
  const ratioOf = (price: number): number => (max - min ? (price - min) / (max - min) : 0)

  const wrap = document.createElement('div')
  wrap.className = 'pp'

  // Header: area name + eyebrow.
  const head = document.createElement('div')
  head.className = 'pp-head'
  const heading = document.createElement('div')
  heading.className = 'pp-heading'
  const area = document.createElement('div')
  area.className = 'pp-area'
  area.textContent = data.areaLabel || data.area
  const label = document.createElement('div')
  label.className = 'pp-label'
  label.textContent = 'Day-ahead electricity'
  heading.append(label, area)
  head.append(heading)

  // Current price with a level pill.
  const currentPrice = current ? priceOf(current) : undefined
  const now = document.createElement('div')
  now.className = 'pp-now'
  if (typeof currentPrice === 'number') {
    const ratio = ratioOf(currentPrice)
    const color = levelColor(ratio, barLightness)
    const value = document.createElement('b')
    value.textContent = formatCents(currentPrice)
    value.style.color = color
    const unit = document.createElement('span')
    unit.className = 'pp-unit'
    unit.textContent = 'c/kWh'
    const pill = document.createElement('span')
    pill.className = 'pp-pill'
    pill.textContent = ratio < 0.34 ? 'Low now' : ratio < 0.67 ? 'Average now' : 'High now'
    pill.style.color = color
    pill.style.borderColor = color
    now.append(value, unit, pill)
  } else {
    const value = document.createElement('b')
    value.textContent = '–'
    const unit = document.createElement('span')
    unit.className = 'pp-unit'
    unit.textContent = 'c/kWh'
    now.append(value, unit)
  }
  head.append(now)
  wrap.append(head)

  // Hourly bar chart, coloured by price level; current hour ringed.
  const chart = document.createElement('div')
  chart.className = 'pp-chart'
  for (const hour of todays) {
    const col = document.createElement('div')
    col.className = 'pp-col'
    const bar = document.createElement('div')
    bar.className = 'pp-bar'
    const price = priceOf(hour)
    if (typeof price === 'number') {
      const pct = Math.max(3, ((price - floor) / span) * 100)
      bar.style.height = `${pct}%`
      bar.style.background = levelColor(ratioOf(price), barLightness)
    } else {
      bar.style.height = '3%'
    }
    if (current && hour.start === current.start) {
      col.classList.add('is-now')
    }
    col.append(bar)
    chart.append(col)
  }
  wrap.append(chart)

  // Axis: an hour tick every 3 hours, current hour emphasised.
  const axis = document.createElement('div')
  axis.className = 'pp-axis'
  for (const hour of todays) {
    const tick = document.createElement('div')
    tick.className = 'pp-tick'
    const hh = Number(hour.start.slice(11, 13))
    const isNow = current !== null && hour.start === current.start
    if (isNow) {
      tick.textContent = hourLabel(hour.start)
      tick.classList.add('is-now')
    } else {
      tick.textContent = hh % 3 === 0 ? String(hh).padStart(2, '0') : ''
    }
    axis.append(tick)
  }
  wrap.append(axis)

  // Stat row: today's low / average / high.
  if (priced.length) {
    const avg = priced.reduce((a, b) => a + b, 0) / priced.length
    const lowHour = todays.find((h) => priceOf(h) === min)
    const highHour = todays.find((h) => priceOf(h) === max)
    const stats = document.createElement('div')
    stats.className = 'pp-stats'
    stats.append(
      statItem(
        'Cheapest',
        formatCents(min),
        lowHour ? hourLabel(lowHour.start) : '',
        levelColor(0, barLightness),
      ),
      statItem('Average', formatCents(avg), 'today'),
      statItem(
        'Priciest',
        formatCents(max),
        highHour ? hourLabel(highHour.start) : '',
        levelColor(1, barLightness),
      ),
    )
    wrap.append(stats)
  }

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, PowerPricesPayload>(({ config, data, meta }) => {
  render(config, data, meta)
})
