import type { SunMoonPayload } from '../../src/sunmoon/payload.js'
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

/** The mean synodic month, and a known new-moon instant (2000-01-06 18:14 UTC). */
const SYNODIC_DAYS = 29.530588853
const REF_NEW_MOON_MS = 947182440000

const MOON_NAMES = [
  'New moon',
  'Waxing crescent',
  'First quarter',
  'Waxing gibbous',
  'Full moon',
  'Waning gibbous',
  'Last quarter',
  'Waning crescent',
]
const MOON_EMOJI = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']

/** Current moon phase from the clock — location-independent at a given instant. */
function moonPhase(): { name: string; emoji: string; illum: number } {
  const days = (Date.now() - REF_NEW_MOON_MS) / 86_400_000
  let phase = (days % SYNODIC_DAYS) / SYNODIC_DAYS
  if (phase < 0) phase += 1
  const illum = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100)
  const bucket = Math.floor(phase * 8 + 0.5) % 8
  return {
    name: MOON_NAMES[bucket] ?? 'Moon',
    emoji: MOON_EMOJI[bucket] ?? '🌙',
    illum,
  }
}

/** Minutes-of-day from a local ISO's `HH:MM`, or null if unparseable. */
function minutesOf(iso: string): number | null {
  const parts = iso.slice(11, 16).split(':')
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function dayLength(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60))
  return `${Math.floor(total / 60)}h ${total % 60}m`
}

function applyChrome(config: Record<string, unknown>): void {
  if (!root) return
  const theme = THEMES[String(config.theme)] ?? THEMES.dark!
  root.style.background = theme.bg
  root.style.color = theme.text
  root.style.setProperty('--sm-accent', '#F59E0B')
  applyTextStyle(root, config)
}

function render(
  config: Record<string, unknown>,
  data: SunMoonPayload | null,
  meta: AppDataMeta | null,
): void {
  if (!root) return
  applyChrome(config)

  if (!data) {
    root.innerHTML = '<div class="sm"><p class="sm-empty">Loading…</p></div>'
    return
  }

  // Day progress from the player clock vs the place's sunrise/sunset (both read as
  // the same wall clock — right for a screen standing in the place it shows).
  const sunriseMin = minutesOf(data.sunrise)
  const sunsetMin = minutesOf(data.sunset)
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  let progress = 0
  if (sunriseMin !== null && sunsetMin !== null && sunsetMin > sunriseMin) {
    progress = (nowMin - sunriseMin) / (sunsetMin - sunriseMin)
    progress = Math.max(0, Math.min(1, progress))
  }
  const pct = Math.round(progress * 100)
  const moon = moonPhase()

  const wrap = document.createElement('div')
  wrap.className = 'sm'
  wrap.innerHTML = `
    <div class="sm-place"></div>
    <div class="sm-arc">
      <div class="sm-track">
        <div class="sm-fill" style="width:${pct}%"></div>
        <div class="sm-sun" style="left:${pct}%">☀️</div>
      </div>
      <div class="sm-ends">
        <span>🌅 ${(data.sunrise.slice(11, 16))}</span>
        <span>🌇 ${(data.sunset.slice(11, 16))}</span>
      </div>
    </div>
    <div class="sm-day">Daylight ${dayLength(data.daylightSeconds)}</div>
    <div class="sm-moon">
      <span class="sm-moon-emoji">${moon.emoji}</span>
      <div>
        <div class="sm-moon-name"></div>
        <div class="sm-moon-illum">${moon.illum}% lit</div>
      </div>
    </div>`
  // Operator/upstream text set via textContent, never interpolated into HTML.
  const placeEl = wrap.querySelector('.sm-place')
  if (placeEl) placeEl.textContent = data.location
  const moonNameEl = wrap.querySelector('.sm-moon-name')
  if (moonNameEl) moonNameEl.textContent = moon.name

  root.replaceChildren(wrap)
  root.insertAdjacentHTML('beforeend', freshnessFooterHtml(meta))
}

connectToHost<Record<string, unknown>, SunMoonPayload>(
  ({ config, data, meta }) => {
    render(config, data, meta)
  },
)
