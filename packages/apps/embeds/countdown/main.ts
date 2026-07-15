import { DEFAULT_ACCENT } from '../../src/_shared/theme.js'
import { pickColor } from '../_shared/color.js'
import { connectToHost } from '../_shared/host-bridge.js'
import { applyTextStyle } from '../_shared/text-style.js'

/*
 * base.css before style.css: the bundler emits stylesheets in import order and
 * the cascade breaks ties on source order, so the shared reset must come first.
 */
import '../_shared/base.css'
import './style.css'

/**
 * Countdown runtime. Like the Clock app, the structure is BUILT once (on a config
 * change or when the timer crosses zero) and PATCHED every second — never rebuilt
 * on the tick — so a re-render can't restart anything or make the tabular numbers
 * flash. The tick is scheduled from the wall clock so it can't drift.
 */

const root = document.getElementById('app')

/** The four units, in display order: [config key on the number, caption]. */
const UNITS: ReadonlyArray<readonly [string, string]> = [
  ['d', 'Days'],
  ['h', 'Hours'],
  ['m', 'Mins'],
  ['s', 'Secs'],
]

type Mode = 'units' | 'finished' | 'invalid'

let config: Record<string, unknown> = {}
/** The parsed target moment, or null when the config's date can't be read. */
let target: Date | null = null
/** Which structure is currently mounted, so a tick only rebuilds on a real change. */
let mounted: Mode | null = null
let timer: ReturnType<typeof setTimeout> | undefined

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function direction(): 'up' | 'down' {
  return config.mode === 'up' ? 'up' : 'down'
}

/**
 * Parse the operator's date string. A bare `YYYY-MM-DD` is parsed as LOCAL
 * midnight (the spec would read it as UTC, which would put the timer hours off
 * for most of the world); a space separator is accepted for `T`. Returns null
 * for anything `Date` can't read — an impossible date the lenient form pattern
 * let through, or an empty value.
 */
function parseTarget(raw: string): Date | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  let iso = trimmed.replace(' ', 'T')
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) iso += 'T00:00:00'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** The current display mode for `now`. */
function modeFor(now: Date): Mode {
  if (!target) return 'invalid'
  const reachedZero =
    direction() === 'down' && target.getTime() - now.getTime() <= 0
  return reachedZero && str(config.finishedText) ? 'finished' : 'units'
}

/** Days/hours/mins/secs remaining (down) or elapsed (up), never negative. */
function segments(now: Date): { d: number; h: number; m: number; s: number } {
  if (!target) return { d: 0, h: 0, m: 0, s: 0 }
  let diff =
    direction() === 'up'
      ? now.getTime() - target.getTime()
      : target.getTime() - now.getTime()
  if (diff < 0) diff = 0
  const total = Math.floor(diff / 1000)
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Colours + typography onto the root, so the whole subtree inherits them. */
function applyChrome(): void {
  if (!root) return
  root.style.background = pickColor(config.backgroundColor, '#000000')
  root.style.color = pickColor(config.textColor, '#FFFFFF')
  root.style.setProperty(
    '--cd-accent',
    pickColor(config.accentColor, DEFAULT_ACCENT),
  )
  applyTextStyle(root, config)
}

/** The optional title element, or null when no title is set. */
function titleEl(): HTMLElement | null {
  const title = str(config.title)
  if (!title) return null
  const el = document.createElement('div')
  el.className = 'cd-title'
  el.textContent = title
  return el
}

function buildUnits(): void {
  if (!root) return
  const wrap = document.createElement('div')
  wrap.className = 'cd'
  const title = titleEl()
  if (title) wrap.append(title)

  const row = document.createElement('div')
  row.className = 'cd-units'
  const showLabels = config.showLabels !== false
  for (const [key, label] of UNITS) {
    const cell = document.createElement('div')
    cell.className = 'cd-unit'
    const num = document.createElement('span')
    num.className = 'cd-num'
    num.dataset.unit = key
    num.textContent = '00'
    cell.append(num)
    if (showLabels) {
      const caption = document.createElement('span')
      caption.className = 'cd-label'
      caption.textContent = label
      cell.append(caption)
    }
    row.append(cell)
  }
  wrap.append(row)
  root.replaceChildren(wrap)
}

function buildFinished(): void {
  if (!root) return
  const wrap = document.createElement('div')
  wrap.className = 'cd'
  const title = titleEl()
  if (title) wrap.append(title)
  const msg = document.createElement('div')
  msg.className = 'cd-finished'
  msg.textContent = str(config.finishedText)
  wrap.append(msg)
  root.replaceChildren(wrap)
}

function buildInvalid(): void {
  if (!root) return
  const wrap = document.createElement('div')
  wrap.className = 'cd'
  const hint = document.createElement('div')
  hint.className = 'cd-empty'
  hint.textContent = 'Set a date, e.g. 2026-12-31T23:59'
  wrap.append(hint)
  root.replaceChildren(wrap)
}

/** Patch the four numbers in place. Only meaningful while `units` is mounted. */
function paint(): void {
  if (!root || mounted !== 'units') return
  const seg = segments(new Date())
  const write = (unit: string, value: string): void => {
    const el = root.querySelector(`[data-unit="${unit}"]`)
    if (el) el.textContent = value
  }
  write('d', String(seg.d))
  write('h', pad(seg.h))
  write('m', pad(seg.m))
  write('s', pad(seg.s))
}

/**
 * Reconcile the DOM with the current state. Rebuilds only when the mode changes
 * (or `mounted` was reset by a config edit); otherwise leaves the structure and
 * lets `paint` move the numbers.
 */
function render(): void {
  if (!root) return
  applyChrome()
  const mode = modeFor(new Date())
  if (mode !== mounted) {
    mounted = mode
    if (mode === 'units') buildUnits()
    else if (mode === 'finished') buildFinished()
    else buildInvalid()
  }
  paint()
}

/**
 * Tick on the second, scheduled from the wall clock so drift can't accumulate
 * (see the same pattern in the Clock app). The 20ms cushion keeps an early tick
 * from landing back on the second it just painted.
 */
function scheduleTick(): void {
  if (timer !== undefined) clearTimeout(timer)
  const delay = 1000 - (Date.now() % 1000)
  timer = setTimeout(() => {
    render()
    scheduleTick()
  }, delay + 20)
}

connectToHost((message) => {
  config = message.config
  target = parseTarget(str(config.target))
  // A config edit may change the structure (title, labels, mode) without changing
  // the mode enum — force a rebuild by clearing what's mounted.
  mounted = null
  render()
  scheduleTick()
})
