import type { WeatherPayload } from '../../src/weather/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

/** Localized static strings; day names come from `Intl` per locale. */
const STRINGS = {
  en: { now: 'Now in', precip: 'Precipitation', humidity: 'Humidity', wind: 'Wind', today: 'Today' },
  sr: { now: 'Trenutno u', precip: 'Padavine', humidity: 'Vlažnost', wind: 'Vetar', today: 'Danas' },
} as const
type Lang = keyof typeof STRINGS

function langOf(config: Record<string, unknown>): Lang {
  return config.language === 'sr' ? 'sr' : 'en'
}
function localeOf(lang: Lang): string {
  return lang === 'sr' ? 'sr-Latn' : 'en'
}

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

function tempLabel(celsius: number, imperial: boolean): string {
  const value = imperial ? celsius * 1.8 + 32 : celsius
  return `${Math.round(value)}°`
}
function windLabel(kph: number, imperial: boolean): string {
  return imperial ? `${Math.round(kph * 0.621)} mph` : `${Math.round(kph)} km/h`
}

function dayLabel(date: string, index: number, locale: string, today: string): string {
  if (index === 0) return today
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
    new Date(`${date}T00:00:00`),
  )
}

/* ----- Weather icons (self-contained SVG, solid fills) ----- */

function rays(cx: number, cy: number, inner: number, outer: number): string {
  return [0, 45, 90, 135, 180, 225, 270, 315]
    .map((deg) => {
      const a = (deg * Math.PI) / 180
      const x1 = (cx + Math.cos(a) * inner).toFixed(1)
      const y1 = (cy + Math.sin(a) * inner).toFixed(1)
      const x2 = (cx + Math.cos(a) * outer).toFixed(1)
      const y2 = (cy + Math.sin(a) * outer).toFixed(1)
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#FFC107" stroke-width="4" stroke-linecap="round"/>`
    })
    .join('')
}
function cloud(color: string): string {
  return `<g fill="${color}"><circle cx="24" cy="40" r="10"/><circle cx="40" cy="37" r="13"/><circle cx="50" cy="43" r="9"/><rect x="18" y="42" width="38" height="12" rx="6"/></g>`
}

function iconBody(code: number): string {
  if (code === 0) return `${rays(32, 30, 17, 24)}<circle cx="32" cy="30" r="13" fill="#FFC107"/>`
  if (code <= 2)
    return `${rays(44, 22, 13, 18)}<circle cx="44" cy="22" r="10" fill="#FFC107"/>${cloud('#ffffff')}`
  if (code === 3) return cloud('#dfe7ed')
  if (code <= 48)
    return `${cloud('#cfd8dc')}<g stroke="#eceff1" stroke-width="4" stroke-linecap="round"><line x1="20" y1="56" x2="44" y2="56"/><line x1="24" y1="62" x2="48" y2="62"/></g>`
  if (code <= 67 || (code >= 80 && code <= 82))
    return `${cloud('#ffffff')}<g stroke="#4FC3F7" stroke-width="4" stroke-linecap="round"><line x1="26" y1="55" x2="23" y2="61"/><line x1="36" y1="55" x2="33" y2="61"/><line x1="46" y1="55" x2="43" y2="61"/></g>`
  if (code <= 77 || (code >= 85 && code <= 86))
    return `${cloud('#ffffff')}<g fill="#E1F5FE"><circle cx="26" cy="57" r="2.6"/><circle cx="36" cy="59" r="2.6"/><circle cx="46" cy="57" r="2.6"/></g>`
  return `${cloud('#ffffff')}<path d="M35 51 L29 60 L34 60 L31 66 L43 57 L36 57 L40 51 Z" fill="#FFD54F"/>`
}
function icon(code: number): string {
  return `<svg viewBox="0 0 64 64" class="wx-svg" xmlns="http://www.w3.org/2000/svg">${iconBody(code)}</svg>`
}

function render(
  config: Record<string, unknown>,
  data: WeatherPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  if (!data) {
    root.innerHTML = '<div class="wx wx-loading"><p>Loading weather…</p></div>'
    return
  }

  const imperial = config.units === 'imperial'
  const lang = langOf(config)
  const s = STRINGS[lang]
  const locale = localeOf(lang)

  const cards = data.daily
    .slice(0, 6)
    .map(
      (day, index) =>
        `<div class="wx-card">
          <div class="wx-card-day">${escapeHtml(dayLabel(day.date, index, locale, s.today))}</div>
          <div class="wx-card-icon">${icon(day.weatherCode)}</div>
          <div class="wx-card-temp">${tempLabel(day.maxC, imperial)}</div>
        </div>`,
    )
    .join('')

  root.innerHTML = `
    <div class="wx">
      <div class="wx-top">
        <div class="wx-current">
          <div class="wx-temp">${tempLabel(data.temperatureC, imperial)}</div>
          <div class="wx-loc">${escapeHtml(s.now)} ${escapeHtml(data.location)}</div>
        </div>
        <div class="wx-hero">
          <div class="wx-hero-icon">${icon(data.weatherCode)}</div>
          <div class="wx-metrics">
            <div>${escapeHtml(s.precip)}: ${Math.round(data.precipitationProbability)}%</div>
            <div>${escapeHtml(s.humidity)}: ${Math.round(data.humidity)}%</div>
            <div>${escapeHtml(s.wind)}: ${windLabel(data.windKph, imperial)}</div>
          </div>
        </div>
      </div>
      <div class="wx-days">${cards}</div>
    </div>
    ${freshnessFooterHtml(meta)}`
}

connectToHost<Record<string, unknown>, WeatherPayload>(({ config, data, meta }) => {
  render(config, data, meta)
})
