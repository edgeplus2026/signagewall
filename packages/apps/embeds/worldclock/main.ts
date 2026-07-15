import { DEFAULT_ACCENT } from '../../src/_shared/theme.js'
import { pickColor } from '../_shared/color.js'
import { connectToHost } from '../_shared/host-bridge.js'
import { applyTextStyle } from '../_shared/text-style.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

/** A mounted place: its DOM nodes and the pre-built formatters for its zone. */
interface Cell {
  timeEl: HTMLElement
  dateEl: HTMLElement | null
  timeFmt: Intl.DateTimeFormat
  dateFmt: Intl.DateTimeFormat | null
}

let cells: Cell[] = []
let timer: ReturnType<typeof setTimeout> | undefined

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Is `zone` a time zone `Intl` accepts? Invalid names throw on construction. */
function validZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/** "Europe/New_York" → "New York" — a readable fallback when no label is given. */
function labelFromZone(zone: string): string {
  const tail = zone.split('/').pop() ?? zone
  return tail.replace(/_/g, ' ')
}

interface Place {
  label: string
  zone: string
}

/**
 * Parse the places. New configs store an array of `{label, zone}` rows (the
 * repeater field); older ones stored `Label | Zone` (or a bare `Zone`) per
 * textarea line — both are accepted. Unknown zones are dropped either way.
 */
function parsePlaces(value: unknown): Place[] {
  const places: Place[] = []
  if (Array.isArray(value)) {
    for (const row of value) {
      const r = (row ?? {}) as Record<string, unknown>
      const zone = typeof r.zone === 'string' ? r.zone.trim() : ''
      if (!zone || !validZone(zone)) continue
      const label = typeof r.label === 'string' ? r.label.trim() : ''
      places.push({ label: label || labelFromZone(zone), zone })
    }
    return places
  }
  const text = typeof value === 'string' ? value : ''
  for (const line of text.split('\n')) {
    const parts = line.split('|').map((part) => part.trim())
    let label: string
    let zone: string
    if (parts.length >= 2) {
      label = parts[0] ?? ''
      zone = parts[1] ?? ''
    } else {
      zone = parts[0] ?? ''
      label = labelFromZone(zone)
    }
    if (!zone || !validZone(zone)) continue
    if (!label) label = labelFromZone(zone)
    places.push({ label, zone })
  }
  return places
}

/** How many grid columns for `n` places — a single row up to 4, then a grid. */
function columnsFor(n: number): number {
  if (n <= 4) return Math.max(1, n)
  if (n <= 8) return 4
  return 5
}

function render(config: Record<string, unknown>): void {
  if (!root) return

  root.style.background = pickColor(config.backgroundColor, '#000000')
  root.style.color = pickColor(config.textColor, '#FFFFFF')
  root.style.setProperty(
    '--wc-accent',
    pickColor(config.accentColor, DEFAULT_ACCENT),
  )
  applyTextStyle(root, config)

  const places = parsePlaces(config.clocks)
  cells = []

  if (places.length === 0) {
    const wrap = document.createElement('div')
    wrap.className = 'wc'
    wrap.style.setProperty('--wc-cols', '1')
    const empty = document.createElement('div')
    empty.className = 'wc-empty'
    empty.textContent = 'Add a place, e.g. London | Europe/London'
    wrap.append(empty)
    root.replaceChildren(wrap)
    return
  }

  const showSeconds = config.showSeconds === true
  const showDate = config.showDate !== false
  const twelveHour = str(config.format) === '12h'

  // One formatter option object per config; the timeZone is filled in per place.
  const timeBase: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    // Pick exactly one of hour12 / hourCycle — passing both can conflict.
    ...(twelveHour ? { hour12: true } : { hourCycle: 'h23' }),
  }
  const dateBase: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }

  const wrap = document.createElement('div')
  wrap.className = 'wc'
  wrap.style.setProperty('--wc-cols', String(columnsFor(places.length)))

  for (const place of places) {
    const cell = document.createElement('div')
    cell.className = 'wc-cell'

    const label = document.createElement('div')
    label.className = 'wc-label'
    label.textContent = place.label

    const time = document.createElement('div')
    time.className = 'wc-time'

    cell.append(label, time)

    let dateEl: HTMLElement | null = null
    if (showDate) {
      dateEl = document.createElement('div')
      dateEl.className = 'wc-date'
      cell.append(dateEl)
    }
    wrap.append(cell)

    cells.push({
      timeEl: time,
      dateEl,
      timeFmt: new Intl.DateTimeFormat(undefined, {
        timeZone: place.zone,
        ...timeBase,
      }),
      dateFmt: showDate
        ? new Intl.DateTimeFormat(undefined, {
            timeZone: place.zone,
            ...dateBase,
          })
        : null,
    })
  }

  root.replaceChildren(wrap)
  paint()
}

/** Patch every clock from the one current instant. */
function paint(): void {
  const now = new Date()
  for (const cell of cells) {
    cell.timeEl.textContent = cell.timeFmt.format(now)
    if (cell.dateEl && cell.dateFmt) {
      cell.dateEl.textContent = cell.dateFmt.format(now)
    }
  }
}

/**
 * Tick on the second, scheduled from the wall clock so it can't drift (same
 * pattern as the Clock app). The 20ms cushion keeps an early tick from landing
 * back on the second it just painted.
 */
function scheduleTick(): void {
  if (timer !== undefined) clearTimeout(timer)
  const delay = 1000 - (Date.now() % 1000)
  timer = setTimeout(() => {
    paint()
    scheduleTick()
  }, delay + 20)
}

connectToHost(({ config }) => {
  render(config)
  scheduleTick()
})
