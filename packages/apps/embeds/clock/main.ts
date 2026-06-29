import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

interface ClockConfig {
  format?: string
  showSeconds?: boolean
  showDate?: boolean
  theme?: string
  backgroundColor?: string
  textColor?: string
}

/** A hex color; anything else falls back to the theme preset. */
const HEX = /^#[0-9a-fA-F]{3,8}$/

let timer: ReturnType<typeof setInterval> | undefined
let current: ClockConfig = {}

/** Use `value` only when it's a hex color, else the theme preset `fallback`. */
function pickColor(value: string | undefined, fallback: string): string {
  return value && HEX.test(value) ? value : fallback
}

/**
 * Resolve background + text colors: the `theme` preset (light/dark) sets the
 * base, and the optional Background/Text color fields override when set.
 */
function resolveColors(config: ClockConfig): { bg: string; text: string } {
  const preset =
    config.theme === 'light'
      ? { bg: '#FFFFFF', text: '#000000' }
      : { bg: '#000000', text: '#FFFFFF' }
  return {
    bg: pickColor(config.backgroundColor, preset.bg),
    text: pickColor(config.textColor, preset.text),
  }
}

/**
 * Split the time from its AM/PM marker so the marker can render smaller. Hours
 * are zero-padded (`01:03`, not `1:03`) via `hour: '2-digit'`; the whitespace
 * literal between the time and the marker is dropped.
 */
function formatTime(now: Date, config: ClockConfig): { time: string; period: string } {
  const hour12 = config.format !== '24h'
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  }
  if (config.showSeconds) {
    options.second = '2-digit'
  }

  const parts = new Intl.DateTimeFormat(undefined, options).formatToParts(now)
  let time = ''
  let period = ''
  for (const part of parts) {
    if (part.type === 'dayPeriod') {
      period = part.value
      continue
    }
    if (part.type === 'literal' && part.value.trim() === '') {
      continue
    }
    time += part.value
  }
  return { time, period }
}

function formatDate(now: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now)
}

function tick(): void {
  if (!root) return
  const now = new Date()
  const { time, period } = formatTime(now, current)
  const periodHtml = period ? `<span class="clock-period">${period}</span>` : ''
  const dateHtml = current.showDate
    ? `<div class="clock-date">${formatDate(now)}</div>`
    : ''
  root.innerHTML = `<div class="center"><div class="clock-time">${time}${periodHtml}</div>${dateHtml}</div>`
}

function render(config: Record<string, unknown>): void {
  current = config as ClockConfig
  if (root) {
    const { bg, text } = resolveColors(current)
    // #app fills the iframe; setting it here themes both the clock and date,
    // which inherit the text color. innerHTML swaps in tick() keep this style.
    root.style.background = bg
    root.style.color = text
  }
  // A single ticking interval; re-render immediately on every config change.
  if (timer === undefined) {
    timer = setInterval(tick, 1000)
  }
  tick()
}

connectToHost(({ config }) => render(config))
