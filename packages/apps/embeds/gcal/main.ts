import type { GcalEvent, GcalPayload } from '../../src/gcal/payload.js'
import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

/** Display settings the operator sets in the config form. */
interface GcalConfig {
  calendarView?: 'day' | 'week' | 'month' | 'schedule'
  onlyUpcoming?: boolean
  autoScroll?: boolean
  language?: 'en' | 'sr'
  theme?: 'light' | 'dark'
  accentColor?: string
}

const DEFAULT_ACCENT = '#111827'

/** Only accept plain hex colours before injecting into the `--accent` var. */
function safeAccent(value: string | undefined): string {
  return value && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
    ? value
    : DEFAULT_ACCENT
}

const STRINGS = {
  en: { today: 'Today', noEvents: 'No events', allDay: 'All day' },
  sr: { today: 'Danas', noEvents: 'Nema događaja', allDay: 'Ceo dan' },
} as const
type Lang = keyof typeof STRINGS

const MAX_PILLS_PER_DAY = 3

const root = document.getElementById('app')
let scrollRaf: number | undefined

function stopAutoScroll(): void {
  if (scrollRaf !== undefined) {
    cancelAnimationFrame(scrollRaf)
    scrollRaf = undefined
  }
}

// ----- date / locale helpers -----

function localeOf(lang: Lang): string {
  return lang === 'sr' ? 'sr-Latn' : 'en'
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

/** Monday-based start of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const s = startOfDay(d)
  const offset = (s.getDay() + 6) % 7 // Mon=0 … Sun=6
  return addDays(s, -offset)
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** All-day events carry a bare date; parse it as a LOCAL day (no UTC shift). */
function eventDate(event: GcalEvent): Date {
  if (event.allDay) {
    const [y, m, d] = event.start.slice(0, 10).split('-').map(Number)
    return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
  }
  return new Date(event.start)
}

function eventEnd(event: GcalEvent): Date {
  return event.end ? new Date(event.end) : eventDate(event)
}

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

function timeLabel(event: GcalEvent, locale: string, lang: Lang): string {
  if (event.allDay) return STRINGS[lang].allDay
  return eventDate(event).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function eventsOnDay(events: GcalEvent[], day: Date): GcalEvent[] {
  return events
    .filter((event) => sameDay(eventDate(event), day))
    .sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime())
}

// ----- event row / agenda rendering -----

function eventRow(event: GcalEvent, locale: string, lang: Lang): string {
  const when = escapeHtml(timeLabel(event, locale, lang))
  const title = escapeHtml(event.title)
  const location = event.location
    ? `<span class="gc-loc">${escapeHtml(event.location)}</span>`
    : ''
  return `<li class="gc-item"><span class="gc-when">${when}</span><span class="gc-body"><span class="gc-title">${title}</span>${location}</span></li>`
}

function agenda(events: GcalEvent[], locale: string, lang: Lang): string {
  if (events.length === 0) {
    return `<p class="gc-empty">${escapeHtml(STRINGS[lang].noEvents)}</p>`
  }
  return `<ul class="gc-list">${events
    .map((event) => eventRow(event, locale, lang))
    .join('')}</ul>`
}

// ----- views -----

function renderDay(
  data: GcalPayload,
  now: Date,
  locale: string,
  lang: Lang,
): string {
  const heading = now.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return `
    <div class="gc-head">${escapeHtml(heading)}</div>
    <div class="gc-scroll">${agenda(eventsOnDay(data.events, now), locale, lang)}</div>`
}

function renderWeek(
  data: GcalPayload,
  now: Date,
  locale: string,
  lang: Lang,
): string {
  const weekStart = startOfWeek(now)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const rangeLabel = `${weekStart.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  })} – ${addDays(weekStart, 6).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  })}`

  const columns = days
    .map((day) => {
      const isToday = sameDay(day, now)
      const label = day.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
      })
      return `
        <div class="gc-col${isToday ? ' is-today' : ''}">
          <div class="gc-col-head">${escapeHtml(label)}</div>
          ${agenda(eventsOnDay(data.events, day), locale, lang)}
        </div>`
    })
    .join('')

  return `
    <div class="gc-head">${escapeHtml(rangeLabel)}</div>
    <div class="gc-scroll"><div class="gc-week">${columns}</div></div>`
}

function renderMonth(data: GcalPayload, now: Date, locale: string): string {
  const heading = now.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })
  const monthFirst = new Date(now.getFullYear(), now.getMonth(), 1)
  const gridStart = startOfWeek(monthFirst)

  const header = Array.from({ length: 7 }, (_, i) =>
    addDays(gridStart, i).toLocaleDateString(locale, { weekday: 'short' }),
  )
    .map((name) => `<div class="gc-dow">${escapeHtml(name)}</div>`)
    .join('')

  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = addDays(gridStart, i)
    const inMonth = day.getMonth() === now.getMonth()
    const isToday = sameDay(day, now)
    const dayEvents = eventsOnDay(data.events, day)
    const pills = dayEvents
      .slice(0, MAX_PILLS_PER_DAY)
      .map((event) => `<div class="gc-pill">${escapeHtml(event.title)}</div>`)
      .join('')
    const overflow =
      dayEvents.length > MAX_PILLS_PER_DAY
        ? `<div class="gc-more">+${dayEvents.length - MAX_PILLS_PER_DAY}</div>`
        : ''
    return `
      <div class="gc-cell${inMonth ? '' : ' is-out'}${isToday ? ' is-today' : ''}">
        <div class="gc-daynum">${day.getDate()}</div>
        <div class="gc-pills">${pills}${overflow}</div>
      </div>`
  }).join('')

  return `
    <div class="gc-head">${escapeHtml(heading)}</div>
    <div class="gc-dows">${header}</div>
    <div class="gc-month">${cells}</div>`
}

function renderSchedule(
  data: GcalPayload,
  now: Date,
  locale: string,
  lang: Lang,
  onlyUpcoming: boolean,
): string {
  const events = [...data.events]
    .filter((event) =>
      onlyUpcoming ? eventEnd(event).getTime() >= now.getTime() : true,
    )
    .sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime())

  if (events.length === 0) {
    return `
      <div class="gc-head">${escapeHtml(data.calendarLabel)}</div>
      <div class="gc-scroll"><p class="gc-empty">${escapeHtml(STRINGS[lang].noEvents)}</p></div>`
  }

  const groups = new Map<number, GcalEvent[]>()
  for (const event of events) {
    const key = startOfDay(eventDate(event)).getTime()
    const list = groups.get(key) ?? []
    list.push(event)
    groups.set(key, list)
  }

  const sections = [...groups.entries()]
    .map(([key, list]) => {
      const day = new Date(key)
      const label = sameDay(day, now)
        ? STRINGS[lang].today
        : day.toLocaleDateString(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
      const rows = list.map((event) => eventRow(event, locale, lang)).join('')
      return `<div class="gc-group"><div class="gc-group-head">${escapeHtml(label)}</div><ul class="gc-list">${rows}</ul></div>`
    })
    .join('')

  return `
    <div class="gc-head">${escapeHtml(data.calendarLabel)}</div>
    <div class="gc-scroll">${sections}</div>`
}

// ----- auto-scroll -----

/**
 * Slowly scroll the `.gc-scroll` container when its content overflows: hold at
 * the top, creep down, snap back to the top at the bottom, repeat.
 *
 * The overflow is re-measured every frame rather than once up front: the embed
 * often renders before the iframe has its final size (or before web fonts land),
 * so a one-shot measurement reads no overflow and never scrolls. Reading live
 * means we start scrolling as soon as the layout actually overflows — and stop
 * on its own when it fits.
 */
function startAutoScroll(): void {
  const el = root?.querySelector<HTMLElement>('.gc-scroll')
  if (!el) return

  const SPEED = 16 // px per second
  const PAUSE_MS = 2500
  let last = performance.now()
  let holdUntil = last + PAUSE_MS // hold at the top before the first pass
  let scrolling = false

  const step = (nowTs: number): void => {
    const dt = Math.min(nowTs - last, 64) // clamp after tab-switch stalls
    last = nowTs
    const overflow = el.scrollHeight - el.clientHeight
    if (overflow > 2) {
      if (!scrolling) {
        if (nowTs >= holdUntil) scrolling = true
      } else {
        el.scrollTop += (SPEED * dt) / 1000
        if (el.scrollTop >= overflow - 0.5) {
          el.scrollTop = 0
          scrolling = false
          holdUntil = nowTs + PAUSE_MS
        }
      }
    }
    scrollRaf = requestAnimationFrame(step)
  }
  scrollRaf = requestAnimationFrame(step)
}

// ----- top-level render -----

function render(config: GcalConfig, data: GcalPayload | null): void {
  stopAutoScroll()
  if (!root) return
  if (!data) {
    root.innerHTML = '<div class="center"><p>Loading calendar…</p></div>'
    return
  }

  const lang: Lang = config.language === 'sr' ? 'sr' : 'en'
  const locale = localeOf(lang)
  const theme = config.theme === 'dark' ? 'dark' : 'light'
  const accent = safeAccent(config.accentColor)
  const view = config.calendarView ?? 'schedule'
  const now = new Date()

  let body: string
  if (view === 'day') {
    body = renderDay(data, now, locale, lang)
  } else if (view === 'week') {
    body = renderWeek(data, now, locale, lang)
  } else if (view === 'month') {
    body = renderMonth(data, now, locale)
  } else {
    body = renderSchedule(
      data,
      now,
      locale,
      lang,
      config.onlyUpcoming !== false,
    )
  }

  // `gc-view-*` (not `gc-<view>`) so the root modifier never collides with the
  // inner grid classes `.gc-week` / `.gc-month`, which would otherwise override
  // the root's flex layout.
  root.innerHTML = `<div class="gc gc-view-${view} gc-theme-${theme}" style="--accent:${accent}">${body}</div>`

  if (config.autoScroll) {
    startAutoScroll()
  }
}

connectToHost<GcalConfig, GcalPayload>(({ config, data }) => {
  render(config, data)
})
