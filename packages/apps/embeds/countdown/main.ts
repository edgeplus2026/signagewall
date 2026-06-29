import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

interface CountdownConfig {
  targetAt?: string
  label?: string
}

let timer: ReturnType<typeof setInterval> | undefined
let current: CountdownConfig = {}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function remainingParts(targetMs: number): string {
  const diff = Math.max(0, targetMs - Date.now())
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const hms = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return days > 0 ? `${days}d ${hms}` : hms
}

function tick(): void {
  if (!root) return
  const target = current.targetAt ? Date.parse(current.targetAt) : NaN
  const label = current.label
    ? `<div class="cd-label">${escapeHtml(current.label)}</div>`
    : ''

  if (Number.isNaN(target)) {
    root.innerHTML = `<div class="center">${label}<div class="cd-time">Set a target date</div></div>`
    return
  }
  root.innerHTML = `<div class="center">${label}<div class="cd-time">${remainingParts(target)}</div></div>`
}

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

function render(config: Record<string, unknown>): void {
  current = config as CountdownConfig
  if (timer === undefined) {
    timer = setInterval(tick, 1000)
  }
  tick()
}

connectToHost(({ config }) => render(config))
