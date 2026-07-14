import type { WeatherPayload } from '../../src/weather/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'
import { ambienceHtml } from './chrome.js'
import { conditionGroup, conditionLabel } from './conditions.js'
import type { WeatherContext } from './context.js'
import {
  escapeHtml,
  placeNow,
  tempLabel,
  windLabel,
} from './format.js'
import { weatherIcon } from './icons.js'
import { langOf, localeOf, stringsOf } from './i18n.js'
import { resolveSky } from './sky.js'

/*
 * THE ORDER OF THE NEXT THREE IMPORTS IS LOAD-BEARING. Do not let a tidy-up move
 * them.
 *
 * The bundler emits stylesheets in the order the modules are imported, and the
 * cascade breaks ties on source order. So the shared chrome has to be emitted
 * BEFORE the templates, or every rule in `style.css` silently outranks the
 * identically-specific rule a template wrote to override it — and the failure is
 * a layout that is subtly wrong on half the modes, with a clean type-check and a
 * clean build. (The RSS app learned this the hard way; the note is in its
 * `main.ts` too.)
 */
import '../_shared/base.css'
import './style.css'
import { DEFAULT_MODE, templateFor } from './templates/index.js'

/**
 * Weather runtime. Owns everything the layouts shouldn't have to think about: the
 * host handshake, the sky, the units, the language, and the clock.
 *
 * The layouts are pure and synchronous — a context in, HTML out. Nothing in here
 * is async, because nothing needs to be: the payload arrives resolved from the
 * backend connector, and a template that had to await anything would be a template
 * that could paint a half-built frame onto a wall.
 */

const root = document.getElementById('app')

/** The whole of this app's state; `render()` is a pure function of it. */
let config: Record<string, unknown> = {}
let data: WeatherPayload | null = null
let meta: AppDataMeta | null = null

/** Whether we are the on-screen item (the player preloads us hidden first). */
let active = false

/**
 * How many days a template may see. Upstream sends seven, and the `week` layout —
 * whose whole name is a promise about the number — shows all of them. The strips in
 * the other layouts ask for six themselves; the ceiling belongs here, not in the
 * templates, so clamping it to six was quietly making a liar of exactly one of them.
 */
const DAY_COUNT = 7

/**
 * The context every template is handed. Built once per render, so a template
 * never reaches for the config, never converts a unit, and never has to know which
 * language it is in.
 */
function buildContext(payload: WeatherPayload): WeatherContext {
  const imperial = config.units === 'imperial'
  const lang = langOf(config)
  const group = conditionGroup(payload.weatherCode)
  // Absent on a payload cached before the connector knew about daylight. Daytime
  // is the safer guess: these screens are mostly watched by day, and a sun at noon
  // is right where a moon at noon would be plainly broken.
  const isDay = payload.isDay ?? true

  return {
    data: payload,
    days: payload.daily.slice(0, DAY_COUNT),
    hours: payload.hourly ?? [],
    group,
    isDay,
    sky: resolveSky(config.theme, group, isDay),
    strings: stringsOf(lang),
    locale: localeOf(lang),
    lang,
    imperial,
    now: placeNow(payload.observedAt, meta),
    temp: (celsius) => tempLabel(celsius, imperial),
    wind: (kph) => windLabel(kph, imperial),
    condition: (code) => conditionLabel(code, lang),
    icon: (code, iconIsDay) => weatherIcon(code, iconIsDay ?? isDay),
    // A day is a day. See the note on `icon` in `context.ts`.
    dayIcon: (code) => weatherIcon(code, true),
  }
}

/**
 * 24-hour wall time, split into its parts.
 *
 * This is the PLAYER's clock, not the forecast place's: whoever is reading it is
 * standing in front of the screen. (The sun arc, which genuinely is about the
 * place, uses `ctx.now` instead.)
 *
 * Signage is read at a glance, so no AM/PM — that's a second thing to parse. The
 * hour and minute come back separately because the colon between them is styled
 * (and pulsed) on its own.
 */
function clockParts(): { hour: string; minute: string } {
  const parts = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())

  const find = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? '--'

  return { hour: find('hour'), minute: find('minute') }
}

/**
 * Patch the clock in place.
 *
 * Deliberately NOT a re-render: re-running `render()` once a minute just to move a
 * clock would rebuild the DOM and restart every entrance animation on the screen —
 * the curve would redraw itself and the rain would jump. The weather changes every
 * 15 minutes; the clock changes every 60 seconds; they do not share a code path.
 */
function paintClock(): void {
  const el = root?.querySelector('[data-clock]')
  if (!el) {
    return
  }
  const { hour, minute } = clockParts()
  el.innerHTML =
    `<span>${hour}</span><span class="wx-clock-sep">:</span><span>${minute}</span>`
}

/** A display mode reaches a class name, so keep it to the shape of an identifier. */
function escapeAttr(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, '')
}

/** The theme as a class, so the CSS can tell a chosen palette from the sky. */
function skyClass(): string {
  if (config.theme === 'light') return 'wx-sky-light'
  if (config.theme === 'dark') return 'wx-sky-dark'
  return 'wx-sky-auto'
}

function render(): void {
  if (!root) {
    return
  }

  if (!data) {
    root.style.background = '#0B1220'
    root.style.color = '#FFFFFF'
    root.innerHTML = `<div class="center"><p class="wx-empty">${escapeHtml(
      stringsOf(langOf(config)).loading,
    )}</p></div>`
    return
  }

  const ctx = buildContext(data)
  const { sky } = ctx

  // The sky reaches the templates through the CASCADE, not through the render
  // context: it is written here, once, onto the app root, and all ten layouts
  // inherit it via `currentColor` and the custom properties. That is the only
  // reason ten layouts work on eight kinds of weather, day and night, and on two
  // manual themes, without any of them owning a single colour.
  root.style.background = sky.background
  root.style.color = sky.text
  root.style.setProperty('--wx-accent', sky.accent)
  root.style.setProperty('--wx-cloud', sky.cloud)
  root.style.setProperty('--wx-cloud-dark', sky.cloudDark)
  root.style.setProperty('--wx-sun', sky.sun)
  root.style.setProperty('--wx-moon', sky.moon)
  root.style.setProperty('--wx-rain', sky.rain)
  root.style.setProperty('--wx-snow', sky.snow)
  root.style.setProperty('--wx-bolt', sky.bolt)
  root.style.setProperty('--wx-haze', sky.haze)

  const mode =
    typeof config.displayMode === 'string' ? config.displayMode : DEFAULT_MODE
  const template = templateFor(mode)

  // The clock is chrome, not layout: it hangs off the app root so every template
  // gets it and none of them has to render one.
  //
  // But it is an OVERLAY, pinned to the top-right corner, and a layout with anything
  // of its own up there (the week's temperature, the postcard's icon, the top-right
  // tile) would have the clock sitting on top of it. `has-clock` is how a layout
  // knows to keep that corner clear — and knows NOT to give up the space when the
  // operator has turned the clock off, which is the whole reason this is a class on
  // the root rather than a permanent margin in each layout.
  const hasClock = config.showClock !== false
  const clock = hasClock ? '<div class="wx-clock" data-clock></div>' : ''

  // `is-active` gates every animation on the screen: a preloaded, off-screen
  // instance must not run its rain and draw its curve while the previous item is
  // still on the wall — it would arrive already spent.
  root.innerHTML = `
    <div class="wx wx-mode-${escapeAttr(mode)} ${skyClass()}${
      hasClock ? ' has-clock' : ''
    }${active ? ' is-active' : ''}">
      ${ambienceHtml(ctx.group, ctx.isDay)}
      ${clock}
      <div class="wx-layout">${template.render(ctx)}</div>
    </div>
    ${freshnessFooterHtml(meta)}`

  paintClock()
}

// The clock ticks on its own, patching text in place — never through `render()`,
// so it can't disturb the weather. 10s rather than 60s so it lands on the new
// minute promptly instead of up to a minute late.
setInterval(paintClock, 10_000)

connectToHost<Record<string, unknown>, WeatherPayload>(
  (message) => {
    config = message.config
    data = message.data
    meta = message.meta
    render()
  },
  {
    onActive: (isActive) => {
      active = isActive
      // Repaint: the root's `is-active` class drives every animation, so going on-
      // or off-screen has to reach the DOM.
      render()
    },
  },
)
