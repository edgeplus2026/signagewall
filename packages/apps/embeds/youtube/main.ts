import { toYouTubeEmbedUrl } from '../../src/youtube/embed.js'
import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'

const root = document.getElementById('app')

function render(config: Record<string, unknown>): void {
  if (!root) return
  const url = typeof config.url === 'string' ? config.url : ''
  const embed = toYouTubeEmbedUrl(url)

  if (!embed) {
    root.innerHTML = '<div class="center"><p>Invalid YouTube URL</p></div>'
    return
  }

  const frame = document.createElement('iframe')
  frame.className = 'fill-frame'
  frame.title = 'YouTube'
  frame.src = embed
  frame.allow = 'autoplay; encrypted-media; picture-in-picture'
  frame.allowFullscreen = true
  root.replaceChildren(frame)
}

connectToHost(({ config }) => render(config))
