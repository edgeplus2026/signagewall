import type { GslidesPayload } from '../../src/gslides/payload.js'
import { stepMs } from '../_shared/dwell.js'
import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

let slides: string[] = []
let index = 0

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

  // ALWAYS the first slide when the deck comes back on screen. Deliberate: a
  // slot plays from its start every time, so the deck does too. Sharing the slot
  // between the slides (see `stepMs`) is what gets the later ones seen.
  index = 0
  show(0)
  if (slides.length > 1) {
    timer = setInterval(advance, stepMs(slides.length, durationMs))
  }
}

connectToHost<Record<string, unknown>, GslidesPayload>(
  ({ config, data, durationMs }) => {
    setup(config, data, durationMs)
  },
)
