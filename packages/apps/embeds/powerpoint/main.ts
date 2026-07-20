import type { PowerPointPayload } from '../../src/powerpoint/payload.js'
import type { AppDataMeta } from '../_shared/host-bridge.js'
import { connectToHost } from '../_shared/host-bridge.js'

// base.css first (shared reset + `.center`), then this app's chrome — the
// cascade breaks ties on import order (see the note in wisdom/main.ts).
import '../_shared/base.css'
import './style.css'

/** Display settings the operator sets in the config form (applied client-side). */
interface PowerPointConfig {
  slideDuration?: number
  fit?: 'contain' | 'cover'
  background?: string
}

const DEFAULT_SECONDS = 15
const MIN_SECONDS = 3
const MAX_SECONDS = 120

const root = document.getElementById('app')

/** The whole of this app's state; the DOM is a function of it. */
let config: PowerPointConfig = {}
let slides: string[] = []
let slidesKey = ''
let meta: AppDataMeta | null = null
/** Whether we are the on-screen item (the player preloads us hidden first). */
let active = false
let index = 0
let timer: ReturnType<typeof setInterval> | undefined
/** The two crossfade layers; `front` indexes the currently-visible one. */
let layers: HTMLImageElement[] = []
let front = 0
/** Bumped on every rebuild so an in-flight decode from a stale stage is ignored. */
let generation = 0

/** How long one slide holds the screen. */
function seconds(): number {
  const value = config.slideDuration
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SECONDS
  }
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.floor(value)))
}

function clearTimer(): void {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
}

function renderLoading(): void {
  clearTimer()
  layers = []
  if (!root) return
  const label = meta?.pending ? 'Preparing slides…' : 'Loading presentation…'
  root.innerHTML = `<div class="center"><p>${label}</p></div>`
}

function applyStageStyles(stage: HTMLElement): void {
  // Slides always crossfade — a hard cut reads as a glitch on signage.
  stage.classList.add('ppt--fade')
  stage.classList.toggle('ppt--cover', config.fit === 'cover')
  stage.style.background = config.background ?? '#000000'
}

/** Build the two-layer stage and show the first slide (no fade on first paint). */
function buildStage(): void {
  const first = slides[0]
  if (!root || !first) return
  const stage = document.createElement('div')
  stage.className = 'ppt'
  const a = document.createElement('img')
  const b = document.createElement('img')
  a.className = 'ppt-slide'
  b.className = 'ppt-slide'
  a.alt = ''
  b.alt = ''
  stage.append(a, b)
  applyStageStyles(stage)
  root.replaceChildren(stage)

  layers = [a, b]
  front = 0
  index = 0
  generation++
  a.src = first
  a.classList.add('is-visible')
}

/** Crossfade to the next slide. */
function advance(): void {
  if (layers.length < 2 || slides.length < 2) return
  const next = (index + 1) % slides.length
  const incoming = layers[front === 0 ? 1 : 0]
  const outgoing = layers[front]
  const url = slides[next]
  if (!incoming || !outgoing || !url) return
  const stageGen = generation
  const swap = (): void => {
    // A rebuild (new deck / on-screen transition) happened while we were
    // decoding — the layers/index we captured are stale, so drop this swap.
    if (stageGen !== generation) return
    incoming.classList.add('is-visible')
    outgoing.classList.remove('is-visible')
    front = front === 0 ? 1 : 0
    index = next
  }
  incoming.src = url
  // Wait for the frame to decode so the fade reveals a complete image, not a
  // half-painted one. `decode()` is best-effort — swap anyway if it rejects.
  if (typeof incoming.decode === 'function') {
    incoming.decode().then(swap).catch(swap)
  } else {
    swap()
  }
}

/**
 * (Re)start rotation. Only the on-screen instance rotates: the player preloads
 * the next item hidden, and a hidden slideshow left ticking would arrive
 * mid-rotation when it comes on screen.
 */
function restartTimer(): void {
  clearTimer()
  if (!active || slides.length < 2) return
  timer = setInterval(advance, seconds() * 1000)
}

function apply(data: PowerPointPayload | null): void {
  slides = data?.slides ?? []
  if (slides.length === 0) {
    renderLoading()
    return
  }

  const key = slides.join('\n')
  if (key !== slidesKey || layers.length === 0) {
    // New deck / new version — rebuild from the first slide.
    slidesKey = key
    buildStage()
  } else if (root?.firstElementChild instanceof HTMLElement) {
    // Same slides, operator only tweaked a display knob — re-apply styles.
    applyStageStyles(root.firstElementChild)
  }
  restartTimer()
}

connectToHost<PowerPointConfig, PowerPointPayload>(
  ({ config: incoming, data, meta: incomingMeta }) => {
    config = incoming ?? {}
    meta = incomingMeta
    apply(data)
  },
  {
    onActive: (isActive) => {
      // `app-active` also re-fires on volume changes, so only a real
      // hidden → on-screen transition restarts the deck from slide one.
      const becameActive = isActive && !active
      active = isActive
      if (becameActive && slides.length > 0) {
        buildStage()
      }
      restartTimer()
    },
  },
)
