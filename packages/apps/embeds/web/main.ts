import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'

const root = document.getElementById('app')

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function render(config: Record<string, unknown>): void {
  if (!root) return
  const url = typeof config.url === 'string' ? config.url.trim() : ''

  if (!isHttpUrl(url)) {
    root.innerHTML = '<div class="center"><p>Invalid URL</p></div>'
    return
  }

  const frame = document.createElement('iframe')
  frame.className = 'fill-frame'
  frame.title = 'Web page'
  frame.src = url
  // Let embedded dashboards autoplay/fullscreen; the player iframe sandbox is
  // the outer security boundary.
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
}

connectToHost(({ config }) => render(config))
