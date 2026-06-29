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
    root.innerHTML = '<div class="center"><p>Set a published Slides URL</p></div>'
    return
  }
  const frame = document.createElement('iframe')
  frame.className = 'fill-frame'
  frame.title = 'Slides'
  frame.src = url
  frame.allow = 'autoplay; fullscreen'
  frame.allowFullscreen = true
  root.replaceChildren(frame)
}

connectToHost(({ config }) => render(config))
