import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

interface ClockConfig {
  format?: string
  showSeconds?: boolean
  showDate?: boolean
}

let timer: ReturnType<typeof setInterval> | undefined
let current: ClockConfig = {}

function formatTime(now: Date, config: ClockConfig): string {
  const hour12 = config.format !== '24h'
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12,
  }
  if (config.showSeconds) {
    options.second = '2-digit'
  }
  return new Intl.DateTimeFormat(undefined, options).format(now)
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
  const time = formatTime(now, current)
  const date = current.showDate
    ? `<div class="clock-date">${formatDate(now)}</div>`
    : ''
  root.innerHTML = `<div class="center"><div class="clock-time">${time}</div>${date}</div>`
}

function render(config: Record<string, unknown>): void {
  current = config as ClockConfig
  // A single ticking interval; re-render immediately on every config change.
  if (timer === undefined) {
    timer = setInterval(tick, 1000)
  }
  tick()
}

connectToHost(({ config }) => render(config))
