import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
// Vite emits the worker as a same-origin asset under `/apps/pdf/`; its URL is
// what pdf.js loads as a (module) Worker. This stays within the player's CSP
// (`worker-src 'self'`, `wasm-unsafe-eval`).
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

import { connectToHost } from '../_shared/host-bridge.js'

// Load-bearing import order (see the same note in embeds/wisdom/main.ts): the
// shared reset must be emitted before this app's own rules.
import '../_shared/base.css'
import './style.css'

GlobalWorkerOptions.workerSrc = workerUrl

// The directory this chunk is served from (`/apps/assets/`), where the build
// also drops pdf.js's `standard_fonts/` and `cmaps/` data. Fetched same-origin,
// within the player's CSP. If missing, pdf.js just falls back (no crash).
const ASSET_BASE = new URL('.', import.meta.url).href

/**
 * PDF Reader runtime.
 *
 * Shows an uploaded PDF (delivered as a base64 `data:` URL in `config.file`)
 * page by page on a canvas. A multi-page PDF auto-advances at `config.speed`.
 * As with every rotator here, only the on-screen (active) instance ticks — the
 * player preloads the next item hidden, and a hidden PDF left advancing would
 * arrive mid-document.
 */

const root = document.getElementById('app')

/** How long a page holds the screen, per the `speed` select. */
const SPEED_SECONDS: Record<string, number> = { slow: 10, medium: 7, fast: 5 }
const DEFAULT_SPEED = 7

/** The whole of this app's state. */
let config: Record<string, unknown> = {}
let active = false
let pdfDoc: PDFDocumentProxy | undefined
let numPages = 0
let pageIndex = 0
let timer: ReturnType<typeof setInterval> | undefined

/** The `data:` URL currently loaded, so re-sent config doesn't reload it. */
let loadedFile = ''
/** Bumped per load; a superseded async load must not replace a newer one. */
let loadToken = 0
/** Bumped per page render; a superseded async render must not draw stale pixels. */
let renderSeq = 0
let renderTask: RenderTask | undefined

let stage: HTMLElement | null = null
let canvas: HTMLCanvasElement | null = null

function speedSeconds(): number {
  const key = typeof config.speed === 'string' ? config.speed : ''
  return SPEED_SECONDS[key] ?? DEFAULT_SPEED
}

/** Replace the stage with a centered message (empty / loading / error). */
function showMessage(text: string): void {
  if (!root) return
  stage = null
  canvas = null
  root.innerHTML = `<div class="center"><p class="pdf-hint">${text}</p></div>`
}

/** Ensure the canvas stage exists (a prior message may have replaced it). */
function ensureCanvas(): HTMLCanvasElement | null {
  if (!root) return null
  if (canvas && canvas.isConnected) return canvas
  root.innerHTML = '<div class="pdf-stage"><canvas class="pdf-canvas"></canvas></div>'
  stage = root.querySelector('.pdf-stage')
  canvas = root.querySelector('.pdf-canvas')
  return canvas
}

/** Decode a base64 `data:` URL to the bytes pdf.js parses. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function loadPdf(dataUrl: string): Promise<void> {
  const token = (loadToken += 1)
  showMessage('Loading…')
  try {
    const bytes = dataUrlToBytes(dataUrl)
    const doc = await getDocument({
      data: bytes,
      cMapUrl: `${ASSET_BASE}cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${ASSET_BASE}standard_fonts/`,
    }).promise
    if (token !== loadToken) {
      // A newer file arrived while we were parsing — drop this one.
      void doc.loadingTask.destroy()
      return
    }
    void pdfDoc?.loadingTask.destroy()
    pdfDoc = doc
    numPages = doc.numPages
    pageIndex = 0
    await renderCurrentPage()
    restartTimer()
  } catch {
    if (token !== loadToken) return
    pdfDoc = undefined
    numPages = 0
    showMessage('Couldn’t open this PDF.')
  }
}

async function renderCurrentPage(): Promise<void> {
  if (!pdfDoc) return
  const cv = ensureCanvas()
  if (!cv || !stage || !root) return

  const seq = (renderSeq += 1)
  try {
    renderTask?.cancel()
  } catch {
    // Nothing to cancel.
  }
  renderTask = undefined

  const page = await pdfDoc.getPage(pageIndex + 1)
  if (seq !== renderSeq) return

  const cw = stage.clientWidth || root.clientWidth
  const ch = stage.clientHeight || root.clientHeight
  const unit = page.getViewport({ scale: 1 })
  // Contain: the largest scale that fits the page in the slot both ways.
  const fit = Math.min(cw / unit.width, ch / unit.height) || 1
  const dpr = window.devicePixelRatio || 1
  const viewport = page.getViewport({ scale: fit * dpr })

  cv.width = Math.max(1, Math.floor(viewport.width))
  cv.height = Math.max(1, Math.floor(viewport.height))
  cv.style.width = `${String(Math.floor(viewport.width / dpr))}px`
  cv.style.height = `${String(Math.floor(viewport.height / dpr))}px`

  const ctx = cv.getContext('2d')
  if (!ctx) return

  // Retrigger the fade for the new page.
  cv.classList.remove('is-fresh')
  void cv.offsetWidth
  cv.classList.add('is-fresh')

  const task = page.render({ canvasContext: ctx, canvas: cv, viewport })
  renderTask = task
  try {
    await task.promise
  } catch {
    // Cancelled by a newer render — expected.
  }
}

/**
 * (Re)start the page rotation. Only the on-screen instance rotates, and only a
 * multi-page PDF has anything to rotate through.
 */
function restartTimer(): void {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
  if (!active || numPages < 2) return
  timer = setInterval(() => {
    pageIndex = (pageIndex + 1) % numPages
    void renderCurrentPage()
  }, speedSeconds() * 1000)
}

// Re-fit the current page when the slot resizes (e.g. the CMS preview pane).
let resizeTimer: ReturnType<typeof setTimeout> | undefined
window.addEventListener('resize', () => {
  if (resizeTimer !== undefined) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    void renderCurrentPage()
  }, 150)
})

connectToHost<Record<string, unknown>>(
  (message) => {
    config = message.config
    const file = typeof config.file === 'string' ? config.file : ''

    if (file === '') {
      loadedFile = ''
      loadToken += 1
      void pdfDoc?.loadingTask.destroy()
      pdfDoc = undefined
      numPages = 0
      restartTimer()
      showMessage('Upload a PDF to display it here.')
      return
    }

    if (file !== loadedFile) {
      loadedFile = file
      void loadPdf(file)
    } else {
      // Same PDF, some other setting changed (e.g. speed) — pick it up.
      restartTimer()
    }
  },
  {
    onActive: (isActive) => {
      const becameActive = isActive && !active
      active = isActive
      if (becameActive) {
        // Start from the first page whenever we come on-screen.
        pageIndex = 0
        void renderCurrentPage()
      }
      restartTimer()
    },
  },
)
