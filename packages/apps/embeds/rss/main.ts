import { DEFAULT_ACCENT } from '../../src/_shared/theme.js'
import { ITEM_COUNT, SECONDS_PER_STORY } from '../../src/rss/limits.js'
import type { RssItem, RssPayload } from '../../src/rss/payload.js'
import { stepMs } from '../_shared/dwell.js'
import { connectToHost } from '../_shared/host-bridge.js'
import { qrDataUrl } from '../_shared/qr.js'
import { httpUrl } from './format.js'

/*
 * THE ORDER OF THE NEXT THREE IMPORTS IS LOAD-BEARING. Do not let a tidy-up move
 * them.
 *
 * The bundler emits stylesheets in the order the modules are imported, and the
 * cascade breaks ties on source order. So the shared chrome has to be emitted
 * BEFORE the templates, or every rule in `style.css` silently outranks the
 * identically-specific rule a template wrote to override it.
 *
 * This is not hypothetical: with `templates/index.js` imported first, the shared
 * `.rs-media { position: relative }` beat `.bc-shot { position: absolute }` in
 * every layout that wanted a full-bleed picture. The frame collapsed to zero
 * height and the photograph simply wasn't there — on five of the ten layouts, and
 * with a clean type-check and a clean build.
 */
import '../_shared/base.css'
import './style.css'
import { DEFAULT_MODE, templateFor } from './templates/index.js'

/**
 * RSS runtime. Owns everything the layouts shouldn't have to think about: the
 * host handshake, the theme, which story is up, and the QR codes.
 *
 * The QR codes are why this file exists in the shape it does. Encoding one is
 * async, but a rotation tick must paint immediately — so every visible story's
 * code is generated up front, on each config/data change, and the templates get
 * a synchronous lookup. Rotating never waits on a promise and never flashes an
 * empty frame.
 */

const root = document.getElementById('app')

/** The app's accent: the product's, and fixed — not operator-configurable. */
const ACCENT = DEFAULT_ACCENT

/** The two themes, whole. The operator picks one; there are no loose colours. */
const PALETTE = {
  dark: { background: '#111827', text: '#FFFFFF' },
  light: { background: '#FFFFFF', text: '#111827' },
} as const

/** The whole of this app's state; `render()` is a pure function of it. */
let config: Record<string, unknown> = {}
let data: RssPayload | null = null
let items: RssItem[] = []
let index = 0
let timer: ReturnType<typeof setInterval> | undefined
/** The slot's dwell, or undefined on a host that imposes none (CMS preview). */
let durationMs: number | undefined
/** Story link → QR data URL. Empty when the operator turned QR codes off. */
let codes = new Map<string, string>()
/** Guards against a slow QR batch landing after a newer config arrived. */
let generation = 0

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

/**
 * The instance's colours. They reach the templates through the CASCADE, not
 * through the render context: this writes them onto the app root and every layout
 * inherits them via `currentColor` / `var(--rs-accent)`. That is the only reason
 * ten layouts work on both themes without ten code paths.
 */
interface RssTheme {
  background: string
  text: string
  accent: string
  isDark: boolean
}

function resolveTheme(): RssTheme {
  const isDark = config.theme !== 'light'
  return { ...(isDark ? PALETTE.dark : PALETTE.light), accent: ACCENT, isDark }
}

/** How long one story holds the screen, as the operator set it. */
function storySeconds(): number {
  return clampInt(
    config.secondsPerStory,
    SECONDS_PER_STORY.default,
    SECONDS_PER_STORY.min,
    SECONDS_PER_STORY.max,
  )
}

/**
 * What that works out to once the slot has its say.
 *
 * `secondsPerStory` is a ceiling: a feed whose stories would not all get a turn
 * inside this slot shares the slot between them, and an interval longer than the
 * slot never fires at all — which left the app showing story one and nothing
 * else. Everything that needs a story's length reads THIS, the timer and the
 * progress bar alike, or the bar animates to a finish the rotation never reaches.
 */
function storyMs(): number {
  return stepMs(storySeconds() * 1000, items.length, durationMs)
}

/** The newest stories the operator asked for. */
function visibleItems(): RssItem[] {
  if (!data) {
    return []
  }
  const count = clampInt(
    config.itemCount,
    ITEM_COUNT.default,
    ITEM_COUNT.min,
    ITEM_COUNT.max,
  )
  return data.items.slice(0, count)
}

/**
 * Pre-generate a QR code per visible story, so rendering stays synchronous.
 * Codes are always black-on-white regardless of the theme: a scanner needs the
 * contrast, and a dark-themed code on a dark background is a code nobody scans.
 */
async function generateCodes(mine: number): Promise<void> {
  if (config.showQr === false) {
    codes = new Map()
    return
  }

  const links = new Set<string>()
  for (const item of items) {
    const link = httpUrl(item.link)
    if (link !== undefined) {
      links.add(link)
    }
  }

  const entries = await Promise.all(
    [...links].map(async (link): Promise<[string, string] | null> => {
      const url = await qrDataUrl(link)
      return url === null ? null : [link, url]
    }),
  )

  // A newer config landed while we were encoding — its batch owns the state.
  if (mine !== generation) {
    return
  }
  codes = new Map(entries.filter((entry) => entry !== null))
}

function qrFor(link: string | undefined): string | null {
  // Read the switch here, not just in generateCodes. The first render after a
  // config change runs BEFORE the new (empty) batch of codes lands, so trusting
  // the map alone would repaint the previous code once more — a visible flash of
  // a QR the operator had just switched off.
  if (config.showQr === false) {
    return null
  }
  const url = httpUrl(link)
  if (url === undefined) {
    return null
  }
  return codes.get(url) ?? null
}

/**
 * Templates mark a story's picture with `data-fallback`, inside a frame marked
 * `data-media`. When the picture fails to load, we flag the FRAME (`is-broken`)
 * and the layout doesn't move — the frame keeps its size and shows the
 * placeholder it was already holding underneath. Wired here rather than as an
 * inline `onerror` so no template needs inline script.
 *
 * This is the offline path as much as the dead-link one: the payload is cached in
 * the player's snapshot but the pictures live on someone else's CDN.
 */
function wireImageFallbacks(el: HTMLElement): void {
  for (const img of el.querySelectorAll<HTMLImageElement>(
    'img[data-fallback]',
  )) {
    img.addEventListener(
      'error',
      () => {
        img.closest<HTMLElement>('[data-media]')?.classList.add('is-broken')
      },
      { once: true },
    )
  }
}

/**
 * 24-hour wall time, split into its parts.
 *
 * Signage is read at a glance, so no AM/PM — that's a second thing to parse. The
 * hour and minute come back separately because the colon between them is styled
 * (and pulsed) on its own; `formatToParts` gets them without us reimplementing
 * zero-padding or assuming the locale's separator.
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
 * Deliberately NOT a re-render: re-running `render()` once a minute just to move
 * a clock would rebuild the DOM and restart every entrance animation and the
 * progress bar along with it — the story would visibly twitch on the minute.
 */
function paintClock(): void {
  const el = root?.querySelector('[data-clock]')
  if (!el) {
    return
  }
  const { hour, minute } = clockParts()
  el.innerHTML =
    `<span class="rs-clock-num">${hour}</span>` +
    `<span class="rs-clock-sep">:</span>` +
    `<span class="rs-clock-num">${minute}</span>`
}

function render(): void {
  if (!root) {
    return
  }

  const theme = resolveTheme()
  root.style.background = theme.background
  root.style.color = theme.text
  root.style.setProperty('--rs-accent', theme.accent)
  // The progress bar's fill is a CSS animation, so it needs to know how long a
  // story lasts. One source of truth: the same value that drives the timer.
  root.style.setProperty('--rs-story-seconds', `${storyMs() / 1000}s`)

  if (!data || items.length === 0) {
    root.innerHTML =
      '<div class="center"><p class="rs-empty">Loading stories…</p></div>'
    return
  }

  const mode =
    typeof config.displayMode === 'string' ? config.displayMode : DEFAULT_MODE
  const template = templateFor(mode)

  // The index can outrun the list when a refresh returns a shorter feed, or when
  // the operator lowers `itemCount` mid-rotation. Wrap rather than reset: the
  // CMS re-sends config on every keystroke, and restarting the rotation under
  // the operator's hands each time they nudge a setting would be maddening.
  index %= items.length

  // `is-active` gates the progress animation: a preloaded, off-screen instance
  // must not burn its bar down while the previous item is still on the wall.
  //
  // The clock is chrome, not layout: it hangs off the app root so every template
  // gets it and none of them has to render one.
  root.innerHTML = `
    <div class="rss rs-mode-${escapeAttr(mode)} rs-theme-${
      theme.isDark ? 'dark' : 'light'
    }${active ? ' is-active' : ''}">
      <div class="rs-clock" data-clock></div>
      ${template.render({
        items,
        index,
        feedTitle: data.title,
        qr: qrFor,
      })}
    </div>`

  wireImageFallbacks(root)
  paintClock()
}

/** A display mode reaches a class name, so keep it to the shape of an identifier. */
function escapeAttr(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, '')
}

/**
 * (Re)start the rotation. Only the on-screen instance rotates: the player
 * preloads the next item into a hidden slot, and a hidden RSS app left ticking
 * would burn through the feed and appear mid-rotation.
 */
function restartTimer(): void {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }

  const mode =
    typeof config.displayMode === 'string' ? config.displayMode : DEFAULT_MODE
  if (!active || !templateFor(mode).rotates || items.length < 2) {
    return
  }

  timer = setInterval(() => {
    index = (index + 1) % items.length
    render()
  }, storyMs())
}

// The clock ticks on its own, patching text in place — never through `render()`,
// so it can't disturb the story. 10s rather than 60s so it lands on the new
// minute promptly instead of up to a minute late.
setInterval(paintClock, 10_000)

connectToHost<Record<string, unknown>, RssPayload>(
  (message) => {
    config = message.config
    data = message.data
    durationMs = message.durationMs
    items = visibleItems()

    generation += 1
    const mine = generation
    // Paint the stories now; the codes land a tick later and repaint. Waiting on
    // the encode would leave the screen on the previous story (or blank on first
    // load) for no reason — the story is the content, the code is an affordance.
    render()
    void generateCodes(mine).then(() => {
      if (mine === generation) {
        render()
      }
    })

    restartTimer()
  },
  {
    onActive: (isActive) => {
      // `app-active` re-fires on volume changes too, so only a real
      // hidden → on-screen transition restarts the feed from the top.
      const becameActive = isActive && !active
      active = isActive

      if (becameActive) {
        index = 0
      }
      // Repaint either way: the root's `is-active` class drives the progress
      // animation, so going on- or off-screen has to reach the DOM.
      render()
      restartTimer()
    },
  },
)
