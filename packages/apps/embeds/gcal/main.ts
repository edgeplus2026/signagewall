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
  en: {
    today: 'Today',
    tomorrow: 'Tomorrow',
    noEvents: 'No events',
    noEventsLong: 'Nothing scheduled',
    allDay: 'All day',
    now: 'Now',
    next: 'Next',
    loading: 'Loading calendar…',
    events: (n: number) => (n === 1 ? '1 event' : `${n} events`),
  },
  sr: {
    today: 'Danas',
    tomorrow: 'Sutra',
    noEvents: 'Nema događaja',
    noEventsLong: 'Ništa nije zakazano',
    allDay: 'Ceo dan',
    now: 'U toku',
    next: 'Sledeće',
    loading: 'Učitavanje kalendara…',
    events: (n: number) => `${n} ${n === 1 ? 'događaj' : 'događaja'}`,
  },
} as const
type Lang = keyof typeof STRINGS

const TICK_MS = 10_000

const ICON_PIN =
  '<svg class="gc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
const ICON_EMPTY =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M16 2.5v4M8 2.5v4M3 10.5h18"/><path d="M9 16h6"/></svg>'

const root = document.getElementById('app')
let scrollRaf: number | undefined
let ticker: number | undefined
/** Latest host state, kept so the ticker can re-render on a date rollover. */
let state: { config: GcalConfig; data: GcalPayload | null } | null = null
/** Local day the current DOM was rendered for (ms at midnight). */
let renderedDay = 0

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

/** Parse a bare `YYYY-MM-DD` as a LOCAL midnight (never a UTC-shifted day). */
function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

function eventStart(event: GcalEvent): Date {
  return event.allDay ? parseDateOnly(event.start) : new Date(event.start)
}

/**
 * Exclusive end of an event. All-day events carry a bare date and (per Google)
 * an EXCLUSIVE end date, so an untimed one-day event ends at the next midnight.
 */
function eventEnd(event: GcalEvent): Date {
  if (event.allDay) {
    return event.end ? parseDateOnly(event.end) : addDays(eventStart(event), 1)
  }
  return event.end ? new Date(event.end) : eventStart(event)
}

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

function clockTime(d: Date, locale: string): string {
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

/** Events overlapping `day` — including the middle days of multi-day events. */
function eventsOnDay(events: GcalEvent[], day: Date): GcalEvent[] {
  const from = startOfDay(day).getTime()
  const to = addDays(startOfDay(day), 1).getTime()
  return events
    .filter((event) => {
      const start = eventStart(event).getTime()
      const end = Math.max(eventEnd(event).getTime(), start + 1)
      return start < to && end > from
    })
    .sort(compareEvents)
}

/** All-day events float to the top of a day, then chronological by start. */
function compareEvents(a: GcalEvent, b: GcalEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
  return eventStart(a).getTime() - eventStart(b).getTime()
}

/** `data-*` timestamps the ticker reads to re-derive live/past without a re-render. */
function timeAttrs(event: GcalEvent): string {
  const start = eventStart(event).getTime()
  const end = Math.max(eventEnd(event).getTime(), start)
  const allDay = event.allDay ? ' data-allday="1"' : ''
  return ` data-start="${start}" data-end="${end}"${allDay}`
}

function durationLabel(event: GcalEvent): string {
  if (event.allDay || !event.end) return ''
  const minutes = Math.round(
    (eventEnd(event).getTime() - eventStart(event).getTime()) / 60_000,
  )
  if (minutes <= 0) return ''
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours >= 24) return ''
  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

// ----- event rendering -----

/** Timeline row used by the day and schedule views. */
function eventRow(event: GcalEvent, locale: string, lang: Lang): string {
  const title = escapeHtml(event.title)

  const when = event.allDay
    ? `<span class="gc-allday">${escapeHtml(STRINGS[lang].allDay)}</span>`
    : `<span class="gc-start">${escapeHtml(clockTime(eventStart(event), locale))}</span>${
        event.end
          ? `<span class="gc-end">${escapeHtml(clockTime(eventEnd(event), locale))}</span>`
          : ''
      }`

  const bits: string[] = []
  const duration = durationLabel(event)
  if (duration) bits.push(`<span class="gc-dur">${duration}</span>`)
  if (event.location) {
    bits.push(
      `<span class="gc-loc">${ICON_PIN}${escapeHtml(event.location)}</span>`,
    )
  }
  const meta = bits.length ? `<div class="gc-meta">${bits.join('')}</div>` : ''

  return `
    <li class="gc-item${event.allDay ? ' is-allday' : ''}"${timeAttrs(event)}>
      <div class="gc-when">${when}</div>
      <div class="gc-rail"><span class="gc-node"></span></div>
      <div class="gc-card">
        <span class="gc-strip"></span>
        <div class="gc-card-main">
          <div class="gc-item-title">${title}</div>
          ${meta}
        </div>
        <span class="gc-badge gc-badge-now"><i class="gc-pulse"></i>${escapeHtml(STRINGS[lang].now)}</span>
        <span class="gc-badge gc-badge-next">${escapeHtml(STRINGS[lang].next)}</span>
        <div class="gc-progress"><div class="gc-progress-fill"></div></div>
      </div>
    </li>`
}

/** Compact chip used by the week columns and the month cells. */
function eventChip(
  event: GcalEvent,
  locale: string,
  withTime: boolean,
): string {
  const time =
    withTime && !event.allDay
      ? `<span class="gc-chip-time">${escapeHtml(clockTime(eventStart(event), locale))}</span>`
      : ''
  return `
    <div class="gc-chip${event.allDay ? ' is-allday' : ''}"${timeAttrs(event)}>
      ${time}<span class="gc-chip-title">${escapeHtml(event.title)}</span>
    </div>`
}

function emptyState(lang: Lang, compact: boolean): string {
  const text = compact ? STRINGS[lang].noEvents : STRINGS[lang].noEventsLong
  return `<div class="gc-empty${compact ? ' is-compact' : ''}">${
    compact ? '' : ICON_EMPTY
  }<span>${escapeHtml(text)}</span></div>`
}

function agenda(events: GcalEvent[], locale: string, lang: Lang): string {
  if (events.length === 0) return emptyState(lang, false)
  return `<ul class="gc-list">${events
    .map((event) => eventRow(event, locale, lang))
    .join('')}</ul>`
}

// ----- header -----

function header(
  eyebrow: string,
  title: string,
  count: number | null,
  lang: Lang,
  locale: string,
): string {
  const events =
    count === null
      ? ''
      : `<div class="gc-count">${escapeHtml(STRINGS[lang].events(count))}</div>`
  return `
    <header class="gc-head">
      <div class="gc-head-main">
        <div class="gc-eyebrow"><i class="gc-dot"></i>${escapeHtml(eyebrow)}</div>
        <h1 class="gc-title">${escapeHtml(title)}</h1>
      </div>
      <div class="gc-head-side">
        <div class="gc-clock">${escapeHtml(clockTime(new Date(), locale))}</div>
        ${events}
      </div>
    </header>`
}

// ----- views -----

function renderDay(
  data: GcalPayload,
  now: Date,
  locale: string,
  lang: Lang,
): string {
  const events = eventsOnDay(data.events, now)
  const heading = now.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return `
    ${header(data.calendarLabel, heading, events.length, lang, locale)}
    <div class="gc-scroll">${agenda(events, locale, lang)}</div>`
}

function renderWeek(
  data: GcalPayload,
  now: Date,
  locale: string,
  lang: Lang,
): string {
  const weekStart = startOfWeek(now)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const range = `${weekStart.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  })} – ${addDays(weekStart, 6).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  })}`

  let total = 0
  const columns = days
    .map((day) => {
      const dayEvents = eventsOnDay(data.events, day)
      total += dayEvents.length
      const isToday = sameDay(day, now)
      const dow = day.toLocaleDateString(locale, { weekday: 'short' })
      const body = dayEvents.length
        ? `<div class="gc-chips gc-fit">${dayEvents
            .map((event) => eventChip(event, locale, true))
            .join('')}<div class="gc-more" hidden></div></div>`
        : emptyState(lang, true)
      return `
        <div class="gc-col${isToday ? ' is-today' : ''}">
          <div class="gc-col-head">
            <span class="gc-col-dow">${escapeHtml(dow)}</span>
            <span class="gc-col-num">${day.getDate()}</span>
          </div>
          <div class="gc-col-body">${body}</div>
        </div>`
    })
    .join('')

  return `
    ${header(data.calendarLabel, range, total, lang, locale)}
    <div class="gc-scroll"><div class="gc-week">${columns}</div></div>`
}

function renderMonth(
  data: GcalPayload,
  now: Date,
  locale: string,
  lang: Lang,
): string {
  const heading = now.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })
  const monthFirst = new Date(now.getFullYear(), now.getMonth(), 1)
  const gridStart = startOfWeek(monthFirst)

  const dows = Array.from({ length: 7 }, (_, i) =>
    addDays(gridStart, i).toLocaleDateString(locale, { weekday: 'short' }),
  )
    .map((name) => `<div class="gc-dow">${escapeHtml(name)}</div>`)
    .join('')

  let total = 0
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = addDays(gridStart, i)
    const inMonth = day.getMonth() === now.getMonth()
    const isToday = sameDay(day, now)
    const dayEvents = eventsOnDay(data.events, day)
    if (inMonth) total += dayEvents.length

    const chips = dayEvents
      .map((event) => eventChip(event, locale, false))
      .join('')

    return `
      <div class="gc-cell${inMonth ? '' : ' is-out'}${isToday ? ' is-today' : ''}">
        <div class="gc-daynum">${day.getDate()}</div>
        <div class="gc-chips gc-fit">${chips}<div class="gc-more" hidden></div></div>
      </div>`
  }).join('')

  return `
    ${header(data.calendarLabel, heading, total, lang, locale)}
    <div class="gc-dows">${dows}</div>
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
    .sort(compareEvents)

  const heading = now.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (events.length === 0) {
    return `
      ${header(data.calendarLabel, heading, 0, lang, locale)}
      <div class="gc-scroll">${emptyState(lang, false)}</div>`
  }

  const groups = new Map<number, GcalEvent[]>()
  for (const event of events) {
    const key = startOfDay(eventStart(event)).getTime()
    const list = groups.get(key) ?? []
    list.push(event)
    groups.set(key, list)
  }

  const tomorrow = addDays(startOfDay(now), 1)
  const sections = [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, list]) => {
      const day = new Date(key)
      const isToday = sameDay(day, now)
      const label = isToday
        ? STRINGS[lang].today
        : sameDay(day, tomorrow)
          ? STRINGS[lang].tomorrow
          : day.toLocaleDateString(locale, { weekday: 'long' })
      const date = day.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
      })
      const rows = list.map((event) => eventRow(event, locale, lang)).join('')
      return `
        <section class="gc-group${isToday ? ' is-today' : ''}">
          <div class="gc-group-head">
            <span class="gc-group-label">${escapeHtml(label)}</span>
            <span class="gc-group-date">${escapeHtml(date)}</span>
            <span class="gc-group-rule"></span>
          </div>
          <ul class="gc-list">${rows}</ul>
        </section>`
    })
    .join('')

  return `
    ${header(data.calendarLabel, heading, events.length, lang, locale)}
    <div class="gc-scroll">${sections}</div>`
}

function renderSkeleton(lang: Lang): string {
  const rows = Array.from(
    { length: 4 },
    (_, i) => `<div class="gc-skel-row" style="--i:${i}"></div>`,
  ).join('')
  return `
    <header class="gc-head">
      <div class="gc-head-main">
        <div class="gc-eyebrow"><i class="gc-dot"></i>${escapeHtml(STRINGS[lang].loading)}</div>
        <div class="gc-skel-title"></div>
      </div>
    </header>
    <div class="gc-scroll"><div class="gc-skel">${rows}</div></div>`
}

// ----- chip overflow ("+N") -----

/**
 * Hide the chips that don't fit their box and surface the remainder as "+N".
 *
 * A week column and a month cell get whatever height the grid gives them, which
 * depends on the screen — so how many chips fit can't be known when the markup is
 * built (a fixed "max 3 per day" either clips the third one or wastes a row).
 * We render every chip and let the layout decide: drop the last visible chip
 * until the content fits, re-measuring each pass so the "+N" line itself is
 * accounted for.
 */
function fitChips(box: HTMLElement): void {
  const more = box.querySelector<HTMLElement>('.gc-more')
  if (!more || !box.clientHeight) return

  const chips = [...box.querySelectorAll<HTMLElement>('.gc-chip')]
  for (const chip of chips) chip.hidden = false
  more.hidden = true

  let shown = chips.length
  while (shown > 0 && box.scrollHeight > box.clientHeight + 1) {
    shown -= 1
    const chip = chips[shown]
    if (chip) chip.hidden = true
    more.hidden = false
    more.textContent = `+${chips.length - shown}`
  }
}

function fitAllChips(): void {
  if (!root) return
  for (const box of root.querySelectorAll<HTMLElement>('.gc-fit')) {
    fitChips(box)
  }
}

// ----- live status (ticks in place, so auto-scroll never restarts) -----

/**
 * Re-derive `is-past` / `is-live` / `is-next` from the wall clock and update the
 * in-progress bar. Runs on a timer against the already-rendered DOM: rebuilding
 * the markup would reset the auto-scroll position every tick.
 */
function refreshStatuses(now: number): void {
  if (!root) return
  let nextMarked = false
  for (const el of root.querySelectorAll<HTMLElement>('[data-start]')) {
    const start = Number(el.dataset.start)
    const end = Number(el.dataset.end)
    const live = start <= now && now < end
    const past = end <= now
    el.classList.toggle('is-live', live)
    el.classList.toggle('is-past', past)

    // Rows are laid out chronologically, so the first non-past row is "next".
    // All-day rows are skipped: an untimed event isn't what happens next.
    const isItem = el.classList.contains('gc-item')
    const isNext = isItem && !el.dataset.allday && !live && !past && !nextMarked
    if (isNext) nextMarked = true
    el.classList.toggle('is-next', isNext)

    const fill = el.querySelector<HTMLElement>('.gc-progress-fill')
    if (fill) {
      const span = end - start
      const pct = live && span > 0 ? ((now - start) / span) * 100 : 0
      fill.style.width = `${Math.min(100, Math.max(0, pct))}%`
    }
  }
}

function refreshClock(now: Date, locale: string): void {
  const el = root?.querySelector<HTMLElement>('.gc-clock')
  if (el) el.textContent = clockTime(now, locale)
}

function startTicker(locale: string): void {
  if (ticker !== undefined) clearInterval(ticker)
  ticker = window.setInterval(() => {
    const now = new Date()
    // Past midnight the headings and the day grids are stale — rebuild once.
    if (startOfDay(now).getTime() !== renderedDay && state) {
      render(state.config, state.data)
      return
    }
    refreshClock(now, locale)
    refreshStatuses(now.getTime())
  }, TICK_MS)
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

  state = { config, data }
  const lang: Lang = config.language === 'sr' ? 'sr' : 'en'
  const locale = localeOf(lang)
  const theme = config.theme === 'dark' ? 'dark' : 'light'
  const accent = safeAccent(config.accentColor)
  const view = config.calendarView ?? 'schedule'
  const now = new Date()
  renderedDay = startOfDay(now).getTime()

  let body: string
  if (!data) {
    body = renderSkeleton(lang)
  } else if (view === 'day') {
    body = renderDay(data, now, locale, lang)
  } else if (view === 'week') {
    body = renderWeek(data, now, locale, lang)
  } else if (view === 'month') {
    body = renderMonth(data, now, locale, lang)
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

  refreshStatuses(now.getTime())
  // Chips can only be measured once the grid has been laid out.
  requestAnimationFrame(fitAllChips)
  startTicker(locale)

  if (config.autoScroll) {
    startAutoScroll()
  }
}

// The slot can resize under us (rotation, CMS preview pane); re-fit, don't
// re-render — a re-render would restart the auto-scroll pass.
let fitRaf: number | undefined
window.addEventListener('resize', () => {
  if (fitRaf !== undefined) cancelAnimationFrame(fitRaf)
  fitRaf = requestAnimationFrame(fitAllChips)
})

connectToHost<GcalConfig, GcalPayload>(({ config, data }) => {
  render(config, data)
})
