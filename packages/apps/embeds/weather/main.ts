import type { WeatherPayload } from '../../src/weather/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

/** Minimal WMO weather-code → glyph + label mapping. */
function describe(code: number): { glyph: string; label: string } {
  if (code === 0) return { glyph: '☀️', label: 'Clear' }
  if (code <= 3) return { glyph: '⛅', label: 'Partly cloudy' }
  if (code <= 48) return { glyph: '🌫️', label: 'Fog' }
  if (code <= 67) return { glyph: '🌧️', label: 'Rain' }
  if (code <= 77) return { glyph: '❄️', label: 'Snow' }
  if (code <= 82) return { glyph: '🌦️', label: 'Showers' }
  if (code <= 99) return { glyph: '⛈️', label: 'Thunderstorm' }
  return { glyph: '🌡️', label: 'Weather' }
}

function toDisplay(tempC: number, imperial: boolean): string {
  const value = imperial ? tempC * 1.8 + 32 : tempC
  return `${Math.round(value)}°${imperial ? 'F' : 'C'}`
}

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

function render(
  config: Record<string, unknown>,
  data: WeatherPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  if (!data) {
    root.innerHTML = '<div class="center"><p>Loading weather…</p></div>'
    return
  }
  const imperial = config.units === 'imperial'
  const now = describe(data.weatherCode)
  const days = data.daily
    .slice(0, 4)
    .map((day) => {
      const d = describe(day.weatherCode)
      const label = new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
      })
      return `<div class="wx-day"><div class="wx-dow">${escapeHtml(label)}</div><div class="wx-glyph">${d.glyph}</div><div class="wx-range">${toDisplay(day.maxC, imperial)} / ${toDisplay(day.minC, imperial)}</div></div>`
    })
    .join('')

  root.innerHTML = `
    <div class="center wx">
      <div class="wx-loc">${escapeHtml(data.location)}</div>
      <div class="wx-now">
        <span class="wx-glyph-lg">${now.glyph}</span>
        <span class="wx-temp">${toDisplay(data.temperatureC, imperial)}</span>
      </div>
      <div class="wx-label">${escapeHtml(now.label)} · ${Math.round(data.windKph)} km/h</div>
      <div class="wx-days">${days}</div>
    </div>
    ${freshnessFooterHtml(meta)}`
}

let currentConfig: Record<string, unknown> = {}
let currentData: WeatherPayload | null = null
let currentMeta: AppDataMeta | null = null

connectToHost<Record<string, unknown>, WeatherPayload>(
  ({ config, data, meta }) => {
    currentConfig = config
    currentData = data
    currentMeta = meta
    render(currentConfig, currentData, currentMeta)
  },
)
