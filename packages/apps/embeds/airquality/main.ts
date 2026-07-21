import type { AirQualityPayload } from '../../src/airquality/payload.js'
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

interface Band {
  label: string
  color: string
  /** Upper bound of this band (inclusive). */
  max: number
}

/** European AQI (EAQI) bands and their official palette. */
const EUROPEAN_BANDS: Band[] = [
  { label: 'Good', color: '#50F0E6', max: 20 },
  { label: 'Fair', color: '#50CCAA', max: 40 },
  { label: 'Moderate', color: '#F0E641', max: 60 },
  { label: 'Poor', color: '#FF5050', max: 80 },
  { label: 'Very poor', color: '#960032', max: 100 },
  { label: 'Extremely poor', color: '#7D2181', max: 120 },
]

/** US AQI bands and their official palette. */
const US_BANDS: Band[] = [
  { label: 'Good', color: '#00E400', max: 50 },
  { label: 'Moderate', color: '#FFC000', max: 100 },
  { label: 'Unhealthy (sensitive)', color: '#FF7E00', max: 150 },
  { label: 'Unhealthy', color: '#FF0000', max: 200 },
  { label: 'Very unhealthy', color: '#8F3F97', max: 300 },
  { label: 'Hazardous', color: '#7E0023', max: 500 },
]

function bandFor(value: number, bands: Band[]): Band {
  return bands.find((band) => value <= band.max) ?? bands[bands.length - 1]!
}

// ---- Gauge geometry (a 180° arc, 0 on the left, max on the right) ----
const CX = 100
const CY = 100
const R = 82
const GAP_DEG = 1.6

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** Point on a circle for an angle measured CLOCKWISE from the top (12 o'clock). */
function polar(radius: number, angleDeg: number): { x: number; y: number } {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) }
}

/** SVG path for the arc between two gauge angles (standard describeArc). */
function arcPath(radius: number, startAngle: number, endAngle: number): string {
  const start = polar(radius, endAngle)
  const end = polar(radius, startAngle)
  const large = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${round(start.x)} ${round(start.y)} A ${radius} ${radius} 0 ${large} 0 ${round(end.x)} ${round(end.y)}`
}

/** Value 0 → left (−90°), value max → right (+90°). */
function angleForFraction(fraction: number): number {
  return -90 + fraction * 180
}

/** Where the value sits on the gauge, 0..1, spread evenly across the 6 bands. */
function gaugeFraction(value: number, boundaries: number[]): number {
  const max = boundaries[boundaries.length - 1]!
  if (value <= 0) return 0
  if (value >= max) return 1
  for (let i = 0; i < 6; i += 1) {
    if (value <= boundaries[i + 1]!) {
      const lo = boundaries[i]!
      const hi = boundaries[i + 1]!
      return (i + (value - lo) / (hi - lo)) / 6
    }
  }
  return 1
}

function buildGauge(value: number, bands: Band[]): string {
  const boundaries = [0, ...bands.map((band) => band.max)]

  const segments = bands
    .map((band, i) => {
      const start = angleForFraction(i / 6) + GAP_DEG
      const end = angleForFraction((i + 1) / 6) - GAP_DEG
      return `<path class="aq-seg" d="${arcPath(R, start, end)}" stroke="${band.color}" />`
    })
    .join('')

  const ticks = boundaries
    .map((boundary, i) => {
      const p = polar(R + 12, angleForFraction(i / 6))
      return `<text class="aq-tick" x="${round(p.x)}" y="${round(p.y)}" text-anchor="middle" dominant-baseline="middle">${boundary}</text>`
    })
    .join('')

  // Needle: a slim triangle from the hub to the value's angle.
  const angle = angleForFraction(gaugeFraction(value, boundaries))
  const tip = polar(R - 6, angle)
  const dx = tip.x - CX
  const dy = tip.y - CY
  const len = Math.hypot(dx, dy) || 1
  const px = (-dy / len) * 3.4
  const py = (dx / len) * 3.4
  const needle =
    `<polygon class="aq-needle" points="${round(tip.x)},${round(tip.y)} ` +
    `${round(CX + px)},${round(CY + py)} ${round(CX - px)},${round(CY - py)}" />`
  const hub = `<circle class="aq-hub" cx="${CX}" cy="${CY}" r="5.5" />`

  return `<svg class="aq-svg" viewBox="-10 -6 220 116">${segments}${ticks}${needle}${hub}</svg>`
}

function applyChrome(config: Record<string, unknown>): void {
  if (!root) return
  const theme = THEMES[String(config.theme)] ?? THEMES.dark!
  root.style.background = theme.bg
  root.style.color = theme.text
  applyTextStyle(root, config)
}

function chip(parent: HTMLElement, label: string, value: number): void {
  const el = document.createElement('span')
  el.className = 'aq-chip'
  const strong = document.createElement('b')
  strong.textContent = String(Math.round(value))
  el.append(`${label} `, strong, ' µg/m³')
  parent.append(el)
}

function render(
  config: Record<string, unknown>,
  data: AirQualityPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  applyChrome(config)

  if (!data) {
    root.innerHTML = '<div class="aq"><p class="aq-empty">Loading air quality…</p></div>'
    return
  }

  const useUs = String(config.scale) === 'us'
  const value = useUs
    ? (data.usAqi ?? data.europeanAqi)
    : (data.europeanAqi ?? data.usAqi)
  const shownUs = useUs ? data.usAqi !== undefined : data.europeanAqi === undefined

  const wrap = document.createElement('div')
  wrap.className = 'aq'

  if (data.location) {
    const place = document.createElement('div')
    place.className = 'aq-place'
    place.textContent = data.location
    wrap.append(place)
  }

  if (typeof value !== 'number') {
    const empty = document.createElement('p')
    empty.className = 'aq-empty'
    empty.textContent = 'No reading available'
    wrap.append(empty)
    root.replaceChildren(wrap)
    root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
    return
  }

  const bands = shownUs ? US_BANDS : EUROPEAN_BANDS
  const band = bandFor(value, bands)
  wrap.style.setProperty('--aq-band', band.color)

  // Gauge (SVG built from numeric values — no untrusted input goes into it).
  const gauge = document.createElement('div')
  gauge.className = 'aq-gauge'
  gauge.innerHTML = buildGauge(value, bands)
  wrap.append(gauge)

  const readout = document.createElement('div')
  readout.className = 'aq-readout'
  const num = document.createElement('div')
  num.className = 'aq-value'
  num.textContent = String(Math.round(value))
  const category = document.createElement('div')
  category.className = 'aq-category'
  category.textContent = band.label
  const scale = document.createElement('div')
  scale.className = 'aq-scale'
  scale.textContent = shownUs ? 'US AQI' : 'European AQI'
  readout.append(num, category, scale)
  wrap.append(readout)

  const chips = document.createElement('div')
  chips.className = 'aq-chips'
  if (typeof data.pm25 === 'number') chip(chips, 'PM2.5', data.pm25)
  if (typeof data.pm10 === 'number') chip(chips, 'PM10', data.pm10)
  if (typeof data.no2 === 'number') chip(chips, 'NO₂', data.no2)
  if (typeof data.o3 === 'number') chip(chips, 'O₃', data.o3)
  if (chips.childElementCount > 0) wrap.append(chips)

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, AirQualityPayload>(({ config, data, meta }) => {
  render(config, data, meta)
})
