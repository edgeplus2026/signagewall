import type { CanvaPayload } from '../../src/canva/payload.js'
import { stepMs } from '../_shared/dwell.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'

/** Display settings the operator sets in the config form (applied client-side). */
interface CanvaConfig {
  maxPages?: number
  /** The currently-selected design ({ id, label } from the picker). */
  design?: { id?: string }
}


const root = document.getElementById('app')
let slideTimer: ReturnType<typeof setInterval> | undefined

function clearTimer(): void {
  if (slideTimer !== undefined) {
    clearInterval(slideTimer)
    slideTimer = undefined
  }
}

function renderLoading(pending = false): void {
  if (!root) return
  // While an export job is still rendering (esp. video), say so; otherwise it's
  // the brief initial load.
  const label = pending ? 'Generating…' : 'Loading design…'
  root.innerHTML = `<div class="center"><p>${label}</p></div>`
}

/**
 * Shown when the exported video will not play. The design name is operator text,
 * so it goes in through `textContent` rather than the innerHTML used above.
 */
function renderVideoFallback(name: string): void {
  if (!root) return
  const wrap = document.createElement('div')
  wrap.className = 'center'
  const title = document.createElement('p')
  title.textContent = name
  const note = document.createElement('p')
  note.style.opacity = '0.6'
  note.textContent = 'This design could not be played.'
  wrap.append(title, note)
  root.replaceChildren(wrap)
}

function renderVideo(url: string, name: string): void {
  if (!root) return
  const video = document.createElement('video')
  video.className = 'fill-frame'
  video.style.objectFit = 'contain'
  // Muted must be set (property + attribute) before playback for autoplay to be
  // allowed by the browser's autoplay policy.
  video.muted = true
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.autoplay = true
  video.loop = true
  video.setAttribute('aria-label', name)
  // A silent black frame is the worst way for a screen to fail, and these export
  // URLs do stop working (they expire in ~24h) or arrive over a link that drops
  // mid-load. Retry the load once, then say something rather than showing black
  // for the whole slot — and leave a console line, since the player host cannot
  // see errors raised inside this iframe.
  let retried = false
  video.addEventListener('error', () => {
    if (!retried) {
      retried = true
      video.load()
      void video.play().catch(() => undefined)
      return
    }
    console.warn('[canva] export video failed to load', url)
    renderVideoFallback(name)
  })
  video.src = url
  root.replaceChildren(video)
  // The `autoplay` attribute doesn't always fire in embedded iframes; kick off
  // playback explicitly and ignore the rejection if the policy still blocks it.
  void video.play().catch(() => undefined)
}

function renderSlideshow(pages: string[], name: string, durationMs: number): void {
  if (!root) return
  const first = pages[0]
  if (!first) {
    renderLoading()
    return
  }
  const img = document.createElement('img')
  img.className = 'fill-frame'
  img.style.objectFit = 'contain'
  img.alt = name
  img.src = first
  root.replaceChildren(img)

  // A single page is static; multiple pages rotate on a loop.
  if (pages.length <= 1) return
  let index = 0
  slideTimer = setInterval(() => {
    index = (index + 1) % pages.length
    img.src = pages[index] ?? first
  }, durationMs)
}

function render(
  config: CanvaConfig,
  data: CanvaPayload | null,
  meta: AppDataMeta | null,
  durationMs: number | undefined,
): void {
  // Always drop any previous slideshow timer before (re)rendering.
  clearTimer()
  if (!root) return
  // When the operator picks a new design, config updates immediately but the
  // payload still holds the previous design until the (slow) re-export finishes.
  // Show the loading state rather than the stale previous design.
  const selectedId = config.design?.id
  const isStaleDesign =
    !!data && !!selectedId && data.designId !== selectedId
  if (!data || data.slides.length === 0 || isStaleDesign) {
    renderLoading(Boolean(meta?.pending))
    return
  }

  if (data.kind === 'video') {
    renderVideo(data.slides[0] ?? '', data.name)
    return
  }

  const maxPages =
    typeof config.maxPages === 'number' && config.maxPages > 0
      ? config.maxPages
      : undefined
  const pages = maxPages ? data.slides.slice(0, maxPages) : data.slides
  renderSlideshow(pages, data.name, stepMs(pages.length, durationMs))
}

connectToHost<CanvaConfig, CanvaPayload>(({ config, data, meta, durationMs }) => {
  render(config, data, meta, durationMs)
})
