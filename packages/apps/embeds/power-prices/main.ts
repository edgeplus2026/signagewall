import type {
  PowerHour,
  PowerPricesPayload,
} from '../../src/power-prices/payload.js'
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

/** Price per kWh in the chosen currency, or undefined if that hour lacks it. */
function priceOf(hour: PowerHour, useEur: boolean): number | undefined {
  return useEur ? hour.eur : hour.dkk
}

/** Minor unit per kWh (øre / euro-cents) — spot prices read best that way. */
function formatMinor(pricePerKwh: number, useEur: boolean): string {
  const minor = pricePerKwh * 100
  return `${minor.toFixed(1)} ${useEur ? 'c/kWh' : 'øre/kWh'}`
}

function applyChrome(config: Record<string, unknown>): void {
  if (!root) return
  const theme = THEMES[String(config.theme)] ?? THEMES.dark!
  root.style.background = theme.bg
  root.style.color = theme.text
  root.style.setProperty('--pp-accent', '#EAB308')
  applyTextStyle(root, config)
}

function render(
  config: Record<string, unknown>,
  data: PowerPricesPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  applyChrome(config)

  if (!data || data.hours.length === 0) {
    root.innerHTML =
      '<div class="pp"><p class="pp-empty">Loading prices…</p></div>'
    return
  }

  const useEur = String(config.currency).toUpperCase() === 'EUR'
  const current = data.hours[data.currentIndex] ?? null
  // Today's curve = the hours sharing the current hour's date (fallback: all).
  const day = current ? current.start.slice(0, 10) : ''
  const todays = day
    ? data.hours.filter((h) => h.start.slice(0, 10) === day)
    : data.hours

  const wrap = document.createElement('div')
  wrap.className = 'pp'

  // Header: area + a small caption.
  const head = document.createElement('div')
  head.className = 'pp-head'
  const area = document.createElement('div')
  area.className = 'pp-area'
  area.textContent = data.area
  const label = document.createElement('div')
  label.className = 'pp-label'
  label.textContent = 'Electricity price'
  head.append(area, label)
  wrap.append(head)

  // Current price (big).
  const now = document.createElement('div')
  now.className = 'pp-now'
  const currentPrice = current ? priceOf(current, useEur) : undefined
  const big = document.createElement('b')
  const unit = document.createElement('span')
  unit.className = 'pp-unit'
  if (typeof currentPrice === 'number') {
    const [value, suffix] = formatMinor(currentPrice, useEur).split(' ')
    big.textContent = value ?? '–'
    unit.textContent = suffix ?? ''
  } else {
    big.textContent = '–'
    unit.textContent = useEur ? 'c/kWh' : 'øre/kWh'
  }
  now.append(big, unit)
  wrap.append(now)

  // Bar chart of today's hours; scale from min(0, lowest) to highest.
  const prices = todays
    .map((h) => priceOf(h, useEur))
    .filter((p): p is number => typeof p === 'number')
  const chart = document.createElement('div')
  chart.className = 'pp-chart'
  if (prices.length > 0) {
    const max = Math.max(...prices)
    const min = Math.min(...prices, 0)
    const range = max - min || 1
    for (const hour of todays) {
      const bar = document.createElement('div')
      bar.className = 'pp-bar'
      const price = priceOf(hour, useEur)
      if (typeof price === 'number') {
        const pct = Math.max(2, ((price - min) / range) * 100)
        bar.style.height = `${pct}%`
      } else {
        bar.style.height = '2%'
      }
      if (current && hour.start === current.start) bar.classList.add('is-now')
      chart.append(bar)
    }
  }
  wrap.append(chart)

  // Axis ticks every 6 hours (00/06/12/18), aligned to the bars.
  const axis = document.createElement('div')
  axis.className = 'pp-axis'
  for (const hour of todays) {
    const tick = document.createElement('div')
    tick.className = 'pp-tick'
    const hh = hour.start.slice(11, 13)
    tick.textContent = Number(hh) % 6 === 0 ? hh : ''
    axis.append(tick)
  }
  wrap.append(axis)

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, PowerPricesPayload>(
  ({ config, data, meta }) => {
    render(config, data, meta)
  },
)
