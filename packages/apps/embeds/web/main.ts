import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'

const root = document.getElementById('app')

/**
 * Like the YouTube app, we only mount the live page iframe while *active* (the
 * on-screen item). The player preloads the next item into a hidden slot, and a
 * `display:none` iframe still loads and can play audio — so mounting on config
 * alone would let a preloaded dashboard/page make sound behind the current item.
 * See the `app-active` protocol in `@signagewall/apps-contract`.
 */
let pageUrl: string | null = null
let invalid = false
let active = false
/** The page URL currently mounted in the DOM, so we don't rebuild needlessly. */
let mountedUrl: string | null = null

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function mount(url: string): void {
  if (!root || mountedUrl === url) return
  const frame = document.createElement('iframe')
  frame.className = 'fill-frame'
  frame.title = 'Web page'
  frame.src = url
  // Sandbox the arbitrary operator-supplied page. Without this it can navigate
  // the whole kiosk away (top-navigation), spawn popups, or trigger downloads —
  // all denied by default once a sandbox attribute is present. `allow-scripts`
  // and `allow-same-origin` keep real dashboards functional; the omitted
  // capabilities are the kiosk-escape vectors. (The outer app-host iframe is the
  // first boundary; this is defense-in-depth on the untrusted inner content.)
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin')
  // Let embedded dashboards autoplay/fullscreen.
  frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture'
  // A site that refuses framing (X-Frame-Options / CSP frame-ancestors) renders
  // a blank/error frame the parent can't read cross-origin — there is no
  // reliable load event to detect that, so configuration-time guidance (the
  // field help) is the real fix. `onerror` still catches the cases the browser
  // does surface (DNS/network failure), where we show an actionable message
  // instead of a silent blank screen.
  frame.onerror = (): void => {
    showCannotEmbed(url)
  }
  root.replaceChildren(frame)
  mountedUrl = url
}

function unmount(): void {
  if (!root || mountedUrl === null) return
  // Dropping the iframe stops any loading/audio the moment we leave the screen.
  root.replaceChildren()
  mountedUrl = null
}

function render(): void {
  if (!root) return

  if (invalid) {
    mountedUrl = null
    root.innerHTML = '<div class="center"><p>Invalid URL</p></div>'
    return
  }

  // Load the live page only while on screen; drop it (and any audio) once hidden.
  if (active && pageUrl) {
    mount(pageUrl)
  } else {
    unmount()
  }
}

/** Replace the frame with a message when a page can't be loaded/embedded. */
function showCannotEmbed(url: string): void {
  if (!root) return
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
  line.textContent = `Can't display ${host} — the site may not allow embedding.`
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
    // A config change to a different page must remount even while active.
    if (mountedUrl !== null && mountedUrl !== pageUrl) {
      mountedUrl = null
    }
    render()
  },
  {
    onActive: (next) => {
      active = next
      render()
    },
  },
)
