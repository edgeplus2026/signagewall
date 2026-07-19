import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'

const root = document.getElementById('app')

/**
 * Power BI publish-to-web embed. Like the Web/Dashboard apps it mounts the live
 * iframe only while *active* (the on-screen item) — the player preloads the next
 * item into a hidden slot, and a `display:none` iframe still loads — and it can
 * RELOAD the report on a cadence while on screen so the numbers stay current.
 *
 * The URL is validated to a real `*.powerbi.com` host here as well as in the
 * manifest, so a mistyped or non-Power-BI link fails with a clear message rather
 * than a blank frame.
 */
let pageUrl: string | null = null
let invalid = false
let active = false
let refreshMs = 0
let mountedUrl: string | null = null
let reloadTimer: ReturnType<typeof setInterval> | undefined

/** True only for an https URL on a powerbi.com host. */
function isPowerBiUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase()
    return host === 'powerbi.com' || host.endsWith('.powerbi.com')
  } catch {
    return false
  }
}

function buildFrame(url: string): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  frame.className = 'fill-frame'
  frame.title = 'Power BI'
  frame.src = url
  // Sandbox the embed: deny top-navigation, popups and downloads (kiosk-escape
  // vectors) while keeping scripts + same-origin so the Power BI viewer runs.
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin')
  frame.allow = 'fullscreen'
  frame.onerror = (): void => {
    showCannotEmbed(url)
  }
  return frame
}

function mount(url: string): void {
  if (!root || mountedUrl === url) return
  root.replaceChildren(buildFrame(url))
  mountedUrl = url
  scheduleReload()
}

function unmount(): void {
  if (!root || mountedUrl === null) return
  root.replaceChildren()
  mountedUrl = null
  stopReload()
}

/** Reload the mounted report in place — re-assigning `src` reloads the frame. */
function reload(): void {
  if (!root || mountedUrl === null) return
  const frame = root.querySelector('iframe')
  if (frame) frame.src = mountedUrl
}

function scheduleReload(): void {
  stopReload()
  if (refreshMs > 0) {
    reloadTimer = setInterval(reload, refreshMs)
  }
}

function stopReload(): void {
  if (reloadTimer !== undefined) {
    clearInterval(reloadTimer)
    reloadTimer = undefined
  }
}

function render(): void {
  if (!root) return

  if (invalid) {
    mountedUrl = null
    stopReload()
    root.innerHTML =
      '<div class="center"><p>Not a Power BI embed link — use “Publish to web”.</p></div>'
    return
  }

  // Load the live page only while on screen; drop it (and its reload timer) once
  // hidden, so a preloaded slot never fetches or reloads in the background.
  if (active && pageUrl) {
    mount(pageUrl)
  } else {
    unmount()
  }
}

/** Replace the frame with a message when the report can't be loaded/embedded. */
function showCannotEmbed(url: string): void {
  if (!root) return
  stopReload()
  const host = ((): string => {
    try {
      return new URL(url).host
    } catch {
      return url
    }
  })()
  const wrap = document.createElement('div')
  wrap.className = 'center'
  const line = document.createElement('p')
  line.textContent = `Can't display ${host} — the report may not be published to the web.`
  wrap.appendChild(line)
  root.replaceChildren(wrap)
  mountedUrl = null
}

connectToHost(
  ({ config }) => {
    const url = typeof config.url === 'string' ? config.url.trim() : ''
    invalid = !isPowerBiUrl(url)
    pageUrl = invalid ? null : url
    const minutes =
      typeof config.refreshMinutes === 'number' && config.refreshMinutes > 0
        ? config.refreshMinutes
        : 0
    refreshMs = minutes * 60_000
    // A config change to a different report (or cadence) must remount/reschedule
    // even while active.
    if (mountedUrl !== null && mountedUrl !== pageUrl) {
      mountedUrl = null
    }
    render()
    if (mountedUrl !== null) scheduleReload()
  },
  {
    onActive: (next) => {
      active = next
      render()
    },
  },
)
