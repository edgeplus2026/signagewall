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
}

/** European AQI (EAQI) bands and their official palette. */
function europeanBand(value: number): Band {
  if (value <= 20) return { label: 'Good', color: '#50F0E6' }
  if (value <= 40) return { label: 'Fair', color: '#50CCAA' }
  if (value <= 60) return { label: 'Moderate', color: '#F0E641' }
  if (value <= 80) return { label: 'Poor', color: '#FF5050' }
  if (value <= 100) return { label: 'Very poor', color: '#960032' }
  return { label: 'Extremely poor', color: '#7D2181' }
}

/** US AQI bands and their official palette. */
function usBand(value: number): Band {
  if (value <= 50) return { label: 'Good', color: '#00E400' }
  if (value <= 100) return { label: 'Moderate', color: '#FFC000' }
  if (value <= 150) return { label: 'Unhealthy (sensitive)', color: '#FF7E00' }
  if (value <= 200) return { label: 'Unhealthy', color: '#FF0000' }
  if (value <= 300) return { label: 'Very unhealthy', color: '#8F3F97' }
  return { label: 'Hazardous', color: '#7E0023' }
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
    root.innerHTML =
      '<div class="aq"><p class="aq-empty">Loading air quality…</p></div>'
    return
  }

  const useUs = String(config.scale) === 'us'
  // Prefer the chosen scale; fall back to the other if upstream omitted it.
  const value = useUs
    ? (data.usAqi ?? data.europeanAqi)
    : (data.europeanAqi ?? data.usAqi)
  // Which scale the shown value is actually on (after any fallback).
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

  const band = shownUs ? usBand(value) : europeanBand(value)

  const num = document.createElement('div')
  num.className = 'aq-value'
  num.textContent = String(Math.round(value))

  const category = document.createElement('div')
  category.className = 'aq-category'
  category.textContent = band.label

  const scale = document.createElement('div')
  scale.className = 'aq-scale'
  scale.textContent = shownUs ? 'US AQI' : 'European AQI'

  wrap.append(num, category, scale)
  // Band colour drives the number + category via a custom property.
  wrap.style.setProperty('--aq-band', band.color)

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

connectToHost<Record<string, unknown>, AirQualityPayload>(
  ({ config, data, meta }) => {
    render(config, data, meta)
  },
)
