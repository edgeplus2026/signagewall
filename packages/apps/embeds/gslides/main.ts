import type { GslidesPayload } from '../../src/gslides/payload.js'
import { resumeIndex, stepMs } from '../_shared/dwell.js'
import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

let slides: string[] = []
let index = 0
/**
 * Which slide to open on next time, kept across `setup` calls.
 *
 * A deck is re-set-up every time it comes back on screen, and starting from zero
 * each time means a deck longer than one slot's worth of slides shows its
 * opening slides forever and never the rest — a twelve-slide deck in a fifteen
 * second slot was, in practice, a two-slide deck. Resuming instead walks the
 * whole deck across a few rotations.
 */
let slideCursor = 0
let timer: ReturnType<typeof setInterval> | undefined
let img: HTMLImageElement | null = null
/**
 * Slides whose image failed to load, so `advance` can step over them. A
 * mirrored slide should always load, but a screen that has been up for weeks
 * against a half-purged bucket must degrade to the slides it *can* show rather
 * than parking on a broken-image icon.
 */
let broken = new Set<number>()

function stop(): void {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
}

/** The next index with a loadable image, or -1 when every slide is broken. */
function nextIndex(from: number): number {
  for (let step = 1; step <= slides.length; step++) {
    const candidate = (from + step) % slides.length
    if (!broken.has(candidate)) return candidate
  }
  return -1
}

function show(i: number): void {
  const url = slides[i]
  if (img && url) {
    index = i
    slideCursor = i
    img.src = url
  }
}

function advance(): void {
  const next = nextIndex(index)
  if (next === -1) {
    stop()
    if (root) {
      root.innerHTML =
        '<div class="gsl"><p class="gsl-empty">Slides unavailable</p></div>'
      img = null
    }
    return
  }
  show(next)
}

function setup(
  config: Record<string, unknown>,
  data: GslidesPayload | null,
  durationMs: number | undefined,
): void {
  if (!root) return

  const all = data?.slides ?? []
  const max =
    typeof config.maxSlides === 'number' && config.maxSlides > 0
      ? config.maxSlides
      : all.length
  slides = all.slice(0, max)
  broken = new Set()
  const seconds =
    typeof config.slideSeconds === 'number' && config.slideSeconds > 0
      ? config.slideSeconds
      : 8

  stop()

  if (slides.length === 0) {
    root.innerHTML = '<div class="gsl"><p class="gsl-empty">Loading…</p></div>'
    img = null
    return
  }

  // Warm the browser cache so each swap is instant (no flash between slides).
  for (const url of slides) {
    const preload = new Image()
    preload.src = url
  }

  const wrap = document.createElement('div')
  wrap.className = 'gsl'
  img = document.createElement('img')
  img.className = 'gsl-img'
  img.alt = ''
  img.addEventListener('error', () => {
    broken.add(index)
    advance()
  })
  wrap.append(img)
  root.replaceChildren(wrap)

  // Carry on from where the last appearance was cut off, not from the top.
  index = resumeIndex(slideCursor, slides.length)
  show(index)
  if (slides.length > 1) {
    // `slideSeconds` is a ceiling: a deck whose slides would not all get a turn
    // inside this slot shares the slot between them instead of parking on the
    // first one until the rotation moves on.
    timer = setInterval(
      advance,
      stepMs(seconds * 1000, slides.length, durationMs),
    )
  }
}

connectToHost<Record<string, unknown>, GslidesPayload>(
  ({ config, data, durationMs }) => {
    setup(config, data, durationMs)
  },
)
