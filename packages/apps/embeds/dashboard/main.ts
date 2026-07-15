import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'

const root = document.getElementById('app')

/**
 * Like the Web and YouTube apps, we only mount the live iframe while *active*
 * (the on-screen item): the player preloads the next item into a hidden slot,
 * and a `display:none` iframe still loads (and could play audio). On top of that,
 * this app RELOADS the page on a cadence so a wall dashboard's numbers stay
 * current — but only while it is on screen; a hidden slot never reloads. See the
 * `app-active` protocol in `@edge/apps-contract`.
 */
let pageUrl: string | null = null
let invalid = false
let active = false
let refreshMs = 0
/** The page URL currently mounted in the DOM, so we don't rebuild needlessly. */
let mountedUrl: string | null = null
let reloadTimer: ReturnType<typeof setInterval> | undefined

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function buildFrame(url: string): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  frame.className = 'fill-frame'
  frame.title = 'Dashboard'
  frame.src = url
  // Sandbox the operator-supplied page: deny top-navigation, popups and downloads
  // (the kiosk-escape vectors) while keeping scripts + same-origin so real
  // dashboards work. Defense-in-depth on top of the outer app-host iframe.
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin')
  frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture'
  // A site that refuses framing (X-Frame-Options / CSP) renders a blank frame the
  // parent can't read cross-origin; there's no reliable load event for that, so
  // the field help is the real fix. `onerror` still catches DNS/network failures.
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
  // Dropping the iframe stops any loading/audio the moment we leave the screen.
  root.replaceChildren()
  mountedUrl = null
  stopReload()
}

/** Reload the mounted page in place — re-assigning `src` reloads the frame. */
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
    root.innerHTML = '<div class="center"><p>Invalid dashboard URL</p></div>'
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

/** Replace the frame with a message when a page can't be loaded/embedded. */
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
  line.textContent = `Can't display ${host} — the dashboard may not allow embedding.`
  wrap.appendChild(line)
  root.replaceChildren(wrap)
  // The iframe is gone; let a later re-render (config edit / re-activation)
  // rebuild it rather than treating the message as the mounted page.
  mountedUrl = null
}

connectToHost(
  ({ config }) => {
    const url = typeof config.url === 'string' ? config.url.trim() : ''
    invalid = !isHttpUrl(url)
    pageUrl = invalid ? null : url
    const minutes =
      typeof config.refreshMinutes === 'number' && config.refreshMinutes > 0
        ? config.refreshMinutes
        : 0
    refreshMs = minutes * 60_000
    // A config change to a different page (or cadence) must remount/reschedule
    // even while active.
    if (mountedUrl !== null && mountedUrl !== pageUrl) {
      mountedUrl = null
    }
    render()
    // Re-apply the cadence to an already-mounted page whose URL didn't change.
    if (mountedUrl !== null) scheduleReload()
  },
  {
    onActive: (next) => {
      active = next
      render()
    },
  },
)
