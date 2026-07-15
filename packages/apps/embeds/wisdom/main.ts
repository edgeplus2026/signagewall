import type { WisdomDesign } from '../../src/wisdom/designs.js'
import { QUOTE_COUNT, SECONDS_PER_QUOTE } from '../../src/wisdom/limits.js'
import type { WisdomPayload, WisdomQuote } from '../../src/wisdom/payload.js'
import { freshnessFooterHtml } from '../_shared/freshness.js'
import type { AppDataMeta } from '../_shared/host-bridge.js'
import { connectToHost } from '../_shared/host-bridge.js'
import { designOrder, lengthTier } from './format.js'
import { FALLBACK_QUOTES } from './quotes.js'

/*
 * THE ORDER OF THE NEXT FOUR IMPORTS IS LOAD-BEARING. Do not let a tidy-up move
 * them.
 *
 * The bundler emits stylesheets in the order the modules are imported, and the
 * cascade breaks ties on source order. So the shared reset and this app's chrome
 * have to be emitted BEFORE the designs, or a rule in `style.css` silently
 * outranks the identically-specific rule a design wrote to override it.
 *
 * This is not hypothetical — the RSS app lost its images to exactly this, on five
 * of ten layouts, with a clean type-check and a clean build. The same comment is
 * in `embeds/rss/main.ts`.
 */
import '../_shared/base.css'
import './fonts.css'
import './motion.css'
import './style.css'
import { DEFAULT_DESIGN, templateFor } from './designs/index.js'

/**
 * Daily Wisdom runtime.
 *
 * Owns the things a design must not have to think about: the host handshake, how
 * many quotes we show, which one is up, and which design it wears.
 *
 * The one idea worth holding on to: a design is assigned to a quote by INDEX into
 * a seeded permutation, not by a fresh roll at render time. `render()` runs far
 * more often than a quote changes — the CMS re-sends config on every keystroke in
 * the settings form — and a `Math.random()` in here would visibly reshuffle the
 * design under a quote that was already on the wall. See `designOrder()`.
 */

const root = document.getElementById('app')

/** The whole of this app's state; `render()` is a pure function of it. */
let config: Record<string, unknown> = {}
let data: WisdomPayload | null = null
let meta: AppDataMeta | null = null
let quotes: WisdomQuote[] = []
let order: WisdomDesign[] = []
let index = 0
let timer: ReturnType<typeof setInterval> | undefined

/** Whether we are the on-screen item (the player preloads us hidden first). */
let active = false

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return Math.min(max, Math.max(min, Math.floor(value)))
}

/** How long one quote holds the screen. */
function quoteSeconds(): number {
  return clampInt(
    config.secondsPerQuote,
    SECONDS_PER_QUOTE.default,
    SECONDS_PER_QUOTE.min,
    SECONDS_PER_QUOTE.max,
  )
}

/**
 * The quotes this instance shows.
 *
 * The fallback is the point of this function. A `server` app with no payload has
 * nothing to render, and every other app in this repo answers that with a
 * "Loading…" line — which is right for a weather forecast, because a forecast
 * without data is meaningless. A quote is not: the ones we ship with are as true
 * as the ones upstream would have sent. So a player that has never once reached
 * the backend still puts something worth reading on the wall, and nobody watching
 * it can tell the difference.
 */
function visibleQuotes(): WisdomQuote[] {
  const source =
    data === null || data.quotes.length === 0 ? FALLBACK_QUOTES : data.quotes

  const count = clampInt(
    config.quoteCount,
    QUOTE_COUNT.default,
    QUOTE_COUNT.min,
    QUOTE_COUNT.max,
  )
  return source.slice(0, count)
}

function render(): void {
  if (!root) {
    return
  }

  if (quotes.length === 0) {
    root.innerHTML = '<div class="center"><p class="wis-empty">…</p></div>'
    return
  }

  // The index can outrun the list when a refresh returns fewer quotes, or when
  // the operator lowers `quoteCount` mid-rotation. Wrap rather than reset: the
  // CMS re-sends config on every keystroke, and restarting the rotation under the
  // operator's hands each time they nudge a number would be maddening.
  index %= quotes.length

  const quote = quotes[index] as WisdomQuote
  const design = order[index % order.length] ?? DEFAULT_DESIGN
  const template = templateFor(design)

  // `is-active` gates the entrance animation: a preloaded, off-screen instance
  // must not burn through its fade while the previous item is still on the wall.
  root.innerHTML = `
    <div class="wis wis-design-${design}${active ? ' is-active' : ''}">
      <div class="wis-stage">
        ${template.render({
          text: quote.text,
          ...(quote.author === undefined ? {} : { author: quote.author }),
          tier: lengthTier(quote.text),
        })}
      </div>
    </div>
    ${freshnessFooterHtml(meta)}`
}

/**
 * (Re)start the rotation. Only the on-screen instance rotates: the player
 * preloads the next item into a hidden slot, and a hidden Wisdom app left ticking
 * would burn through its quotes and arrive mid-rotation.
 */
function restartTimer(): void {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }

  if (!active || quotes.length < 2) {
    return
  }

  timer = setInterval(() => {
    index = (index + 1) % quotes.length
    render()
  }, quoteSeconds() * 1000)
}

connectToHost<Record<string, unknown>, WisdomPayload>(
  (message) => {
    config = message.config
    data = message.data
    meta = message.meta
    quotes = visibleQuotes()
    // Reshuffled only when the quotes themselves change — never per render.
    order = designOrder(quotes)

    render()
    restartTimer()
  },
  {
    onActive: (isActive) => {
      // `app-active` re-fires on volume changes too, so only a real
      // hidden → on-screen transition restarts from the first quote.
      const becameActive = isActive && !active
      active = isActive

      if (becameActive) {
        index = 0
      }
      // Repaint either way: the root's `is-active` class drives the entrance
      // animation, so going on- or off-screen has to reach the DOM.
      render()
      restartTimer()
    },
  },
)
