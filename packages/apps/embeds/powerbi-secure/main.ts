import type { SecurePowerBiConfig } from '../../src/powerbi-secure/config.js'
import type { SecurePowerBiPayload } from '../../src/powerbi-secure/payload.js'
import { stepMs } from '../_shared/dwell.js'
import { type AppDataMeta, connectToHost } from '../_shared/host-bridge.js'
import {
  type SecurePowerBiView,
  type SlideshowLifecycle,
  nextPageIndex,
  reconcileLifecycle,
  retainLastKnownGood,
  snapshotView,
  viewportShape,
} from './runtime.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

let config: Partial<SecurePowerBiConfig> = {}
let meta: AppDataMeta | null = null
let retained: SecurePowerBiPayload | null = null
let view: SecurePowerBiView = snapshotView(null, null)
let lifecycle: SlideshowLifecycle = {
  active: false,
  index: 0,
  contentKey: '',
}
let timer: ReturnType<typeof setInterval> | undefined
/** The slot's dwell, or undefined on a host that imposes none (CMS preview). */
let durationMs: number | undefined
let image: HTMLImageElement | null = null
let status: HTMLElement | null = null
let pagination: HTMLElement | null = null
let broken = new Set<number>()

function clearTimer(): void {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
}

function message(kind: 'pending' | 'empty' | 'error', text: string): void {
  clearTimer()
  image = null
  status = null
  pagination = null
  if (!root) return
  const wrap = document.createElement('div')
  wrap.className = `pbi-message is-${kind}`
  const title = document.createElement('p')
  title.className = 'pbi-message-title'
  title.textContent =
    kind === 'pending'
      ? 'Preparing snapshot'
      : kind === 'error'
        ? 'Snapshot unavailable'
        : 'Power BI Secure'
  const note = document.createElement('p')
  note.className = 'pbi-message-note'
  note.textContent = text
  wrap.append(title, note)
  root.replaceChildren(wrap)
}

function statusText(
  content: Extract<SecurePowerBiView, { kind: 'content' }>,
): string {
  if (content.freshness === 'stale') {
    return `Offline · showing last export · ${content.exportedLabel}`
  }
  if (content.freshness === 'pending') {
    return `Updating · showing last export · ${content.exportedLabel}`
  }
  return content.exportedLabel
}

function applyStageStyle(stage: HTMLElement): void {
  stage.style.background = config.background ?? '#000000'
  stage.classList.toggle('pbi-stage--cover', config.fit === 'cover')
  const shape = viewportShape(stage.clientWidth, stage.clientHeight)
  stage.dataset.shape = shape
}

function showPage(index: number): void {
  if (view.kind !== 'content' || !image) return
  const url = view.pages[index]
  if (!url) return
  lifecycle.index = index
  image.dataset.pageIndex = String(index)
  image.alt = `${view.payload.reportName} — page ${index + 1} of ${view.pages.length}`
  image.src = url
  if (pagination) {
    pagination.textContent = `${index + 1} / ${view.pages.length}`
    pagination.hidden = view.pages.length < 2
  }
}

function nextLoadableIndex(from: number): number {
  if (view.kind !== 'content') return -1
  for (let step = 1; step <= view.pages.length; step += 1) {
    const candidate = (from + step) % view.pages.length
    if (!broken.has(candidate)) return candidate
  }
  return -1
}

function advance(): void {
  if (view.kind !== 'content') return
  const preferred = nextPageIndex(lifecycle.index, view.pages.length)
  const next = broken.has(preferred)
    ? nextLoadableIndex(lifecycle.index)
    : preferred
  if (next < 0) {
    message(
      'error',
      'The exported pages could not be loaded. SignageWall will retry on the next snapshot update.',
    )
    return
  }
  showPage(next)
}

function restartTimer(): void {
  clearTimer()
  if (view.kind !== 'content' || !lifecycle.active || view.pages.length < 2) {
    return
  }
  timer = setInterval(advance, stepMs(view.pages.length, durationMs))
}

function buildStage(
  content: Extract<SecurePowerBiView, { kind: 'content' }>,
): void {
  if (!root) return
  broken = new Set<number>()
  const stage = document.createElement('section')
  stage.className = 'pbi-stage'
  stage.setAttribute('aria-label', content.payload.reportName)

  image = document.createElement('img')
  image.className = 'pbi-page'
  image.addEventListener('error', () => {
    const failed = Number(image?.dataset.pageIndex)
    if (Number.isInteger(failed)) broken.add(failed)
    const next = nextLoadableIndex(failed)
    if (next < 0) {
      message(
        'error',
        'The exported pages could not be loaded. SignageWall will retry on the next snapshot update.',
      )
      return
    }
    showPage(next)
  })

  status = document.createElement('div')
  status.className = `pbi-status is-${content.freshness}`
  status.textContent = statusText(content)

  pagination = document.createElement('div')
  pagination.className = 'pbi-pagination'

  stage.append(image, status, pagination)
  applyStageStyle(stage)
  root.replaceChildren(stage)
  showPage(lifecycle.index)
}

function render(): void {
  const previousKey = lifecycle.contentKey
  lifecycle = reconcileLifecycle(lifecycle, view, lifecycle.active)

  if (view.kind !== 'content') {
    message(view.kind, view.message)
    return
  }

  const stage = root?.querySelector<HTMLElement>('.pbi-stage') ?? null
  if (!stage || lifecycle.contentKey !== previousKey || !image) {
    buildStage(view)
  } else {
    applyStageStyle(stage)
    if (status) {
      status.className = `pbi-status is-${view.freshness}`
      status.textContent = statusText(view)
    }
    showPage(lifecycle.index)
  }
  restartTimer()
}

connectToHost<Partial<SecurePowerBiConfig>, SecurePowerBiPayload>(
  ({ config: incomingConfig, data, meta: incomingMeta, durationMs: dwell }) => {
    config = incomingConfig ?? {}
    meta = incomingMeta
    durationMs = dwell
    const selected = retainLastKnownGood(data, retained, meta)
    if (selected) {
      retained = selected
    } else if (!meta?.pending && !meta?.stale) {
      retained = null
    }
    view = snapshotView(selected, meta)
    render()
  },
  {
    onActive: (active) => {
      const wasActive = lifecycle.active
      lifecycle = reconcileLifecycle(lifecycle, view, active)
      if (active && !wasActive && view.kind === 'content') {
        showPage(0)
      }
      restartTimer()
    },
  },
)

window.addEventListener('resize', () => {
  const stage = root?.querySelector<HTMLElement>('.pbi-stage')
  if (stage) applyStageStyle(stage)
})
