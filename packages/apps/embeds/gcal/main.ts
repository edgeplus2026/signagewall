import type { GcalEvent, GcalPayload } from '../../src/gcal/payload.js'
import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

/**
 * Google Calendar, drawn in one colour.
 *
 * There is no accent in this app and no colour field behind one. A calendar is a
 * page that is ALL content — every cell carries an event — so an accent here does
 * not mark one thing, it tints the whole screen, and a wall of one hue stops
 * saying "look here" the moment everything is it. What is left does the marking:
 * the ruled grid, the weight of the type, and a single filled disc on today.
 */

/** Display settings the operator sets in the config form. */
interface GcalConfig {
  calendarView?: 'day' | 'week' | 'month' | 'schedule'
  onlyUpcoming?: boolean
  autoScroll?: boolean
  language?: 'en' | 'sr'
  theme?: 'light' | 'dark'
}

const STRINGS = {
  en: {
    noEvents: 'No events',
    noEventsLong: 'Nothing scheduled',
    allDay: 'All day',
    upcoming: 'Upcoming',
    everything: 'All events',
    loading: 'Loading calendar…',
    events: (n: number) => (n === 1 ? '1 event' : `${n} events`),
  },
  sr: {
    noEvents: 'Nema događaja',
    noEventsLong: 'Ništa nije zakazano',
    allDay: 'Ceo dan',
    upcoming: 'Predstojeće',
    everything: 'Svi događaji',
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

/** The gutter's hour marks: "8:00", not "08:00" — a rail of leading zeros is noise. */
function hourLabel(hour: number, locale: string): string {
  const d = new Date(2000, 0, 1, hour, 0)
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
}

function timeRange(event: GcalEvent, locale: string): string {
  const start = clockTime(eventStart(event), locale)
  if (!event.end) return start
  return `${start}–${clockTime(eventEnd(event), locale)}`
}

/**
 * A date, as a TITLE.
 *
 * `toLocaleDateString` is right and it still isn't what we want on a wall: Serbian
 * writes the month in lower case and closes the year with an ordinal dot, which is
 * correct in a sentence and wrong as a heading. Capitalise the first letter, drop a
 * trailing dot. English produces neither, so it passes through untouched — this is
 * a typographic trim, not a translation.
 */
function asTitle(value: string, locale: string): string {
  const trimmed = value.replace(/\.$/, '')
  return trimmed.charAt(0).toLocaleUpperCase(locale) + trimmed.slice(1)
}

/** Minutes from the local midnight of `day` — negative before it, >1440 after. */
function minutesInDay(at: Date, day: Date): number {
  return (at.getTime() - startOfDay(day).getTime()) / 60_000
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

// ----- event rendering -----

/**
 * One line of the schedule: the date on the left, the event, the hours on the
 * right, a hairline under it. The date rides with every row rather than heading a
 * group of them — a wall is read in glances, and a glance that lands three rows
 * into a section has nothing to tell it which day it is looking at.
 */
function scheduleRow(
  event: GcalEvent,
  now: Date,
  locale: string,
  lang: Lang,
): string {
  const start = eventStart(event)
  const when = event.allDay
    ? escapeHtml(STRINGS[lang].allDay)
    : escapeHtml(timeRange(event, locale))

  const location = event.location
    ? `<div class="gc-row-loc">${ICON_PIN}${escapeHtml(event.location)}</div>`
    : ''

  return `
    <li class="gc-row${sameDay(start, now) ? ' is-today' : ''}"${timeAttrs(event)}>
      <div class="gc-row-date">
        <span class="gc-row-dow">${escapeHtml(start.toLocaleDateString(locale, { weekday: 'short' }))}</span>
        <span class="gc-row-num">${start.getDate()}</span>
        <span class="gc-row-mon">${escapeHtml(start.toLocaleDateString(locale, { month: 'short' }))}</span>
      </div>
      <div class="gc-row-body">
        <div class="gc-row-title">${escapeHtml(event.title)}</div>
        ${location}
      </div>
      <div class="gc-row-when">${when}</div>
    </li>`
}

/** Compact chip used by the month cells and the time grid's all-day rail. */
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

// ----- the time grid (day + week) -----

/**
 * The hours the grid draws. A working day by default — starting at midnight would
 * spend a third of the screen on the hours nobody is in the building — but it is a
 * FLOOR, not a rule: an event outside it widens the window rather than being drawn
 * outside the grid or, worse, silently left out.
 */
const GRID_FROM = 8
const GRID_TO = 20

interface Placed {
  event: GcalEvent
  /** Minutes from this day's midnight, clamped to the day. */
  from: number
  to: number
  lane: number
}

/**
 * Timed events for one day, each clamped to it and given a lane.
 *
 * Two events at the same hour must not be drawn on top of each other — the one
 * underneath is simply gone, and a calendar that hides an appointment is worse than
 * no calendar. So overlapping events share the column's width: greedily, each event
 * takes the first lane whose last event has already ended.
 */
function placeDay(events: GcalEvent[], day: Date): { placed: Placed[]; lanes: number } {
  const timed = events
    .filter((event) => !event.allDay)
    .map((event) => ({
      event,
      from: Math.max(0, minutesInDay(eventStart(event), day)),
      to: Math.min(1440, minutesInDay(eventEnd(event), day)),
      lane: 0,
    }))
    // A zero-length event still deserves to be seen: give it a floor of 15 minutes.
    .map((p) => ({ ...p, to: Math.max(p.to, p.from + 15) }))
    .sort((a, b) => a.from - b.from || b.to - a.to)

  const laneEnds: number[] = []
  for (const p of timed) {
    let lane = laneEnds.findIndex((end) => end <= p.from)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(0)
    }
    laneEnds[lane] = p.to
    p.lane = lane
  }
  return { placed: timed, lanes: Math.max(1, laneEnds.length) }
}

/** The window, widened by whatever falls outside the working day. */
function hourWindow(days: Date[], events: GcalEvent[]): { from: number; to: number } {
  let from = GRID_FROM
  let to = GRID_TO
  for (const day of days) {
    for (const p of placeDay(eventsOnDay(events, day), day).placed) {
      from = Math.min(from, Math.floor(p.from / 60))
      to = Math.max(to, Math.ceil(p.to / 60))
    }
  }
  return { from: Math.max(0, from), to: Math.min(24, Math.max(to, from + 1)) }
}

function timeGrid(
  days: Date[],
  data: GcalPayload,
  now: Date,
  locale: string,
  lang: Lang,
  // Seven columns have room for "Uto" and no more; one column has room for the
  // whole word, and on the view that is ABOUT a single day it should say it.
  longDow = false,
): string {
  const { from, to } = hourWindow(days, data.events)
  const spanMinutes = (to - from) * 60
  const hourCount = to - from

  const heads = days
    .map((day) => {
      const isToday = sameDay(day, now)
      const dow = day.toLocaleDateString(locale, {
        weekday: longDow ? 'long' : 'short',
      })
      return `
        <div class="gc-tg-head${isToday ? ' is-today' : ''}">
          <span class="gc-tg-dow">${escapeHtml(dow)}</span>
          <span class="gc-tg-num">${day.getDate()}</span>
        </div>`
    })
    .join('')

  const allDayCells = days
    .map((day) => {
      const chips = eventsOnDay(data.events, day)
        .filter((event) => event.allDay)
        .map((event) => eventChip(event, locale, false))
        .join('')
      return `<div class="gc-tg-ad gc-chips gc-fit">${chips}<div class="gc-more" hidden></div></div>`
    })
    .join('')

  const hours = Array.from(
    { length: hourCount },
    (_unused, i) =>
      `<div class="gc-tg-hour"><span>${escapeHtml(hourLabel(from + i, locale))}</span></div>`,
  ).join('')

  const columns = days
    .map((day) => {
      const isToday = sameDay(day, now)
      const slots = Array.from(
        { length: hourCount },
        () => '<div class="gc-tg-slot"></div>',
      ).join('')

      const { placed, lanes } = placeDay(eventsOnDay(data.events, day), day)
      const blocks = placed
        .map((p) => {
          // Clipped to the window, not dropped by it: an event that starts before
          // the first hour drawn still begins at the top of the column.
          const top = Math.max(0, ((p.from - from * 60) / spanMinutes) * 100)
          const bottom = Math.min(100, ((p.to - from * 60) / spanMinutes) * 100)
          const width = 100 / lanes
          // The `-body` wrapper is not decoration. The block is a size CONTAINER (it
          // has to be: how much of an event fits depends on how tall its own hours
          // are), and a container query may only style a container's DESCENDANTS —
          // never the container itself. Laying the title and the time out therefore
          // has to happen one level in, on something the query can actually reach.
          return `
            <div class="gc-tg-ev"${timeAttrs(p.event)} style="top:${top.toFixed(3)}%;height:${Math.max(0, bottom - top).toFixed(3)}%;left:${(p.lane * width).toFixed(3)}%;width:${width.toFixed(3)}%">
              <div class="gc-tg-ev-body">
                <div class="gc-tg-ev-title">${escapeHtml(p.event.title)}</div>
                <div class="gc-tg-ev-time">${escapeHtml(timeRange(p.event, locale))}</div>
              </div>
            </div>`
        })
        .join('')

      return `<div class="gc-tg-col${isToday ? ' is-today' : ''}">${slots}${blocks}</div>`
    })
    .join('')

  // One grid, N+1 columns: the hour gutter and then a column per day. The head, the
  // all-day rail and the body are its three rows, so every line in the thing is the
  // same line — the day columns cannot drift from their own headings.
  return `
    <div class="gc-tg" style="--days:${days.length}">
      <div class="gc-tg-corner"></div>
      ${heads}
      <div class="gc-tg-ad-label">${escapeHtml(STRINGS[lang].allDay)}</div>
      ${allDayCells}
      <div class="gc-tg-gutter">${hours}</div>
      ${columns}
    </div>`
}

// ----- header -----

/**
 * The same header on every view: what calendar this is, what you are looking at,
 * and how much of it there is.
 *
 * No clock. It used to carry one and the app is better without it — a calendar is
 * not a status bar, and the time of day is the one thing a person standing in front
 * of a screen already knows. (The Clock app exists, and a playlist can run both.)
 */
function header(
  eyebrow: string,
  title: string,
  count: number | null,
  lang: Lang,
): string {
  const events =
    count === null
      ? ''
      : `<div class="gc-count">${escapeHtml(STRINGS[lang].events(count))}</div>`
  return `
    <header class="gc-head">
      <div class="gc-head-main">
        <div class="gc-eyebrow">${escapeHtml(eyebrow)}</div>
        <h1 class="gc-title">${escapeHtml(title)}</h1>
      </div>
      <div class="gc-head-side">${events}</div>
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
  // The day view names the WEEKDAY above the date rather than the calendar: on the
  // one view that is about a single day, "Tuesday" is what the person in front of
  // the screen came for, and the calendar's name is the least of it.
  const eyebrow = asTitle(
    now.toLocaleDateString(locale, { weekday: 'long' }),
    locale,
  )
  const heading = asTitle(
    now.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    locale,
  )
  return `
    ${header(eyebrow, heading, events.length, lang)}
    ${timeGrid([now], data, now, locale, lang, true)}`
}

function renderWeek(
  data: GcalPayload,
  now: Date,
  locale: string,
  lang: Lang,
): string {
  const weekStart = startOfWeek(now)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // `formatRange` and not a hand-built "13. jul – 19. jul": it is the locale that
  // knows a range within one month collapses to "13–19. jul 2026", and knows to
  // write it "July 13 – 19, 2026" in English. Building that by hand is how an app
  // ends up fluent in one language and clumsy in the other.
  const range = asTitle(
    new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).formatRange(days[0] ?? now, days[6] ?? now),
    locale,
  )

  const total = days.reduce(
    (sum, day) => sum + eventsOnDay(data.events, day).length,
    0,
  )

  return `
    ${header(data.calendarLabel, range, total, lang)}
    ${timeGrid(days, data, now, locale, lang)}`
}

function renderMonth(
  data: GcalPayload,
  now: Date,
  locale: string,
  lang: Lang,
): string {
  const monthFirst = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthLast = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const gridStart = startOfWeek(monthFirst)
  const gridEnd = addDays(startOfWeek(monthLast), 6)

  // Only the weeks the month actually touches — five for most, six when it spills.
  // A fixed 42 cells buys a guaranteed rectangle and pays for it with a whole empty
  // row of nothing on two months out of three, which on a wall is just a wasted
  // seventh of the screen. Rounding the division absorbs the 23- and 25-hour days a
  // DST change puts in the middle of a month.
  const cellCount =
    Math.round(
      (gridEnd.getTime() - gridStart.getTime()) / (24 * 60 * 60 * 1000),
    ) + 1

  const dows = Array.from({ length: 7 }, (_, i) =>
    addDays(gridStart, i).toLocaleDateString(locale, { weekday: 'short' }),
  )
    .map((name) => `<div class="gc-dow">${escapeHtml(name)}</div>`)
    .join('')

  let total = 0
  const cells = Array.from({ length: cellCount }, (_, i) => {
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

  // The weekday rail and the cells are wrapped as ONE object: they share a frame and
  // the same hairlines, so the thing reads as a ruled table rather than a row of
  // labels floating above a row of boxes.
  const heading = asTitle(
    now.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    locale,
  )

  return `
    ${header(data.calendarLabel, heading, total, lang)}
    <div class="gc-grid">
      <div class="gc-dows">${dows}</div>
      <div class="gc-month">${cells}</div>
    </div>`
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
    // By DAY first, and only then by `compareEvents`.
    //
    // `compareEvents` floats all-day events above timed ones, which is what you want
    // inside a day and a disaster across a list of them: sorted flat, every birthday
    // in the calendar climbs above tomorrow morning's meeting. The old view got away
    // with it because it grouped the days afterwards and the grouping put them back;
    // this one has no groups to hide behind.
    .sort((a, b) => {
      const dayA = startOfDay(eventStart(a)).getTime()
      const dayB = startOfDay(eventStart(b)).getTime()
      return dayA - dayB || compareEvents(a, b)
    })

  // The heading names the LIST, not today's date: this view is a run of days, and
  // titling it with one of them was always a small lie.
  const heading = onlyUpcoming
    ? STRINGS[lang].upcoming
    : STRINGS[lang].everything

  const body =
    events.length === 0
      ? emptyState(lang, false)
      : `<ul class="gc-agenda">${events
          .map((event) => scheduleRow(event, now, locale, lang))
          .join('')}</ul>`

  return `
    ${header(data.calendarLabel, heading, events.length, lang)}
    <div class="gc-scroll">${body}</div>`
}

function renderSkeleton(lang: Lang): string {
  const rows = Array.from(
    { length: 4 },
    (_, i) => `<div class="gc-skel-row" style="--i:${i}"></div>`,
  ).join('')
  return `
    <header class="gc-head">
      <div class="gc-head-main">
        <div class="gc-eyebrow">${escapeHtml(STRINGS[lang].loading)}</div>
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
 * Re-derive `is-past` / `is-live` from the wall clock. Runs on a timer against the
 * already-rendered DOM: rebuilding the markup would reset the auto-scroll position
 * every tick.
 *
 * Both are drawn in ink, not in colour — a dimmed row for what is done, a solid
 * rail for what is running. There is no "Now" badge any more: a pill shouting at
 * the one event that happens to be in progress is the loudest thing on a page whose
 * whole argument is that it doesn't shout.
 */
function refreshStatuses(now: number): void {
  if (!root) return
  for (const el of root.querySelectorAll<HTMLElement>('[data-start]')) {
    const start = Number(el.dataset.start)
    const end = Number(el.dataset.end)
    el.classList.toggle('is-live', start <= now && now < end)
    el.classList.toggle('is-past', end <= now)
  }
}

function startTicker(): void {
  if (ticker !== undefined) clearInterval(ticker)
  ticker = window.setInterval(() => {
    const now = new Date()
    // Past midnight the headings and the day grids are stale — rebuild once.
    if (startOfDay(now).getTime() !== renderedDay && state) {
      render(state.config, state.data)
      return
    }
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
  // inner grid classes `.gc-month` / `.gc-tg`, which would otherwise override the
  // root's flex layout.
  root.innerHTML = `<div class="gc gc-view-${view} gc-theme-${theme}">${body}</div>`

  refreshStatuses(now.getTime())
  // Chips can only be measured once the grid has been laid out.
  requestAnimationFrame(fitAllChips)
  startTicker()

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
