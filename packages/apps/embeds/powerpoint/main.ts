import type { PowerPointPayload } from '../../src/powerpoint/payload.js'
import {
  POWERPOINT_SOURCE_EMBED,
  normalizePowerPointEmbedUrl,
  resolvePowerPointSource,
  type PowerPointSource,
} from '../../src/powerpoint/source.js'
import type { AppDataMeta } from '../_shared/host-bridge.js'
import { connectToHost } from '../_shared/host-bridge.js'

// base.css first (shared reset + `.center`), then this app's chrome — the
// cascade breaks ties on import order (see the note in wisdom/main.ts).
import '../_shared/base.css'
import './style.css'

/** Display settings the operator sets in the config form (applied client-side). */
interface PowerPointConfig extends Record<string, unknown> {
  source?: PowerPointSource
  embedUrl?: string
  embedRefreshMinutes?: number
  slideDuration?: number
  fit?: 'contain' | 'cover'
  background?: string
}

const DEFAULT_SECONDS = 15
const MIN_SECONDS = 3
const MAX_SECONDS = 120
const DEFAULT_EMBED_REFRESH_MINUTES = 15

const root = document.getElementById('app')

/** The whole of this app's state; the DOM is a function of it. */
let config: PowerPointConfig = {}
let source: PowerPointSource = POWERPOINT_SOURCE_EMBED
let slides: string[] = []
let slidesKey = ''
let meta: AppDataMeta | null = null
/** Whether we are the on-screen item (the player preloads us hidden first). */
let active = false
let index = 0
let slideTimer: ReturnType<typeof setInterval> | undefined
/** The two crossfade layers; `front` indexes the currently-visible one. */
let layers: HTMLImageElement[] = []
let front = 0
/** Bumped on every rebuild so an in-flight decode from a stale stage is ignored. */
let generation = 0

/** Public/no-account Microsoft viewer state. */
let embedUrl: string | null = null
let mountedEmbedUrl: string | null = null
let embedReloadTimer: ReturnType<typeof setInterval> | undefined

/** How long one locally-rendered slide holds the screen. */
function seconds(): number {
  const value = config.slideDuration
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SECONDS
  }
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.floor(value)))
}

function clearSlideTimer(): void {
  if (slideTimer !== undefined) {
    clearInterval(slideTimer)
    slideTimer = undefined
  }
}

function clearEmbedReloadTimer(): void {
  if (embedReloadTimer !== undefined) {
    clearInterval(embedReloadTimer)
    embedReloadTimer = undefined
  }
}

function showMessage(message: string): void {
  if (!root) return
  const wrap = document.createElement('div')
  wrap.className = 'center'
  const line = document.createElement('p')
  line.textContent = message
  wrap.append(line)
  root.replaceChildren(wrap)
}

function renderLoading(): void {
  clearSlideTimer()
  layers = []
  const label = meta?.pending ? 'Preparing slides…' : 'Loading presentation…'
  showMessage(label)
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
  unmountEmbed()
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

/** Crossfade to the next locally-rendered slide. */
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

/** Rotate only while the connected/cached instance is actually on screen. */
function restartSlideTimer(): void {
  clearSlideTimer()
  if (source === POWERPOINT_SOURCE_EMBED || !active || slides.length < 2) {
    return
  }
  slideTimer = setInterval(advance, seconds() * 1000)
}

function applySlides(data: PowerPointPayload | null): void {
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
  restartSlideTimer()
}

function embedRefreshMs(): number {
  const minutes = config.embedRefreshMinutes
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    return DEFAULT_EMBED_REFRESH_MINUTES * 60_000
  }
  return Math.min(1440, Math.max(1, Math.floor(minutes))) * 60_000
}

function buildEmbedFrame(url: string): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  frame.className = 'ppt-embed'
  frame.title = 'PowerPoint presentation'
  frame.src = url
  // Microsoft 365's hosted viewer uses internal forms and nested popup contexts.
  // Keep top navigation user-activation-gated so unattended signage cannot be
  // redirected without an operator click. The outer app-host frame grants the
  // same capabilities because ancestor sandbox restrictions are inherited.
  frame.setAttribute(
    'sandbox',
    'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation',
  )
  frame.setAttribute(
    'allow',
    'autoplay; fullscreen; clipboard-read; clipboard-write',
  )
  frame.referrerPolicy = 'strict-origin-when-cross-origin'
  frame.onerror = (): void => {
    mountedEmbedUrl = null
    clearEmbedReloadTimer()
    showMessage(
      'Cannot display this presentation — check that it is a public PowerPoint embed URL.',
    )
  }
  return frame
}

function scheduleEmbedReload(): void {
  clearEmbedReloadTimer()
  if (!active || !mountedEmbedUrl) return
  embedReloadTimer = setInterval(() => {
    if (!root || !mountedEmbedUrl) return
    const frame = root.querySelector<HTMLIFrameElement>('iframe.ppt-embed')
    if (frame) frame.src = mountedEmbedUrl
  }, embedRefreshMs())
}

function mountEmbed(url: string): void {
  if (!root || mountedEmbedUrl === url) return
  root.replaceChildren(buildEmbedFrame(url))
  mountedEmbedUrl = url
  scheduleEmbedReload()
}

function unmountEmbed(): void {
  clearEmbedReloadTimer()
  if (!root || mountedEmbedUrl === null) return
  root.replaceChildren()
  mountedEmbedUrl = null
}

function renderEmbed(): void {
  clearSlideTimer()
  layers = []
  generation++

  if (!embedUrl) {
    unmountEmbed()
    showMessage(
      'Paste the public embed code from PowerPoint, not an ordinary private share link.',
    )
    return
  }
  if (active) {
    mountEmbed(embedUrl)
  } else {
    unmountEmbed()
  }
}

connectToHost<PowerPointConfig, PowerPointPayload>(
  ({ config: incoming, data, meta: incomingMeta }) => {
    config = incoming ?? {}
    meta = incomingMeta
    const nextSource = resolvePowerPointSource(config)
    const sourceChanged = nextSource !== source
    source = nextSource

    if (source === POWERPOINT_SOURCE_EMBED) {
      slides = []
      slidesKey = ''
      embedUrl = normalizePowerPointEmbedUrl(config.embedUrl)
      if (sourceChanged) mountedEmbedUrl = null
      renderEmbed()
      if (mountedEmbedUrl) scheduleEmbedReload()
      return
    }

    embedUrl = null
    unmountEmbed()
    applySlides(data)
  },
  {
    onActive: (isActive) => {
      // `app-active` also re-fires on volume changes, so only a real
      // hidden → on-screen transition restarts a cached deck from slide one.
      const becameActive = isActive && !active
      active = isActive
      if (source === POWERPOINT_SOURCE_EMBED) {
        renderEmbed()
        return
      }
      if (becameActive && slides.length > 0) {
        buildStage()
      }
      restartSlideTimer()
    },
  },
)
