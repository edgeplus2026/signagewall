import { toGoogleSlidesEmbedUrl } from '../../src/gslides-public/embed.js'
import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'

const root = document.getElementById('app')

/**
 * We only mount the Slides iframe while *active* (the on-screen item): the player
 * preloads the next item into a hidden slot, and a deck left auto-advancing in a
 * `display:none` frame would be mid-presentation by the time it appears. Mounting
 * on activation restarts it cleanly from the first slide. See the `app-active`
 * protocol in `@edge/apps-contract`. Mirrors the Web / Dashboard apps.
 */
let config: Record<string, unknown> = {}
let active = false
/** The embed URL currently mounted in the DOM, so we don't rebuild needlessly. */
let mountedUrl: string | null = null

function embedUrl(): string | null {
  const url = typeof config.url === 'string' ? config.url : ''
  const slideSeconds =
    typeof config.slideSeconds === 'number' ? config.slideSeconds : undefined
  const loop = config.loop !== false
  return toGoogleSlidesEmbedUrl(url, {
    ...(slideSeconds !== undefined ? { slideSeconds } : {}),
    loop,
  })
}

function mount(url: string): void {
  if (!root || mountedUrl === url) return
  const frame = document.createElement('iframe')
  frame.className = 'fill-frame'
  frame.title = 'Google Slides'
  frame.src = url
  frame.allow = 'autoplay; fullscreen'
  frame.allowFullscreen = true
  root.replaceChildren(frame)
  mountedUrl = url
}

function unmount(): void {
  if (!root || mountedUrl === null) return
  root.replaceChildren()
  mountedUrl = null
}

function render(): void {
  if (!root) return
  const url = active ? embedUrl() : null

  if (active && !url) {
    // Active but the link is unusable — show the error rather than a blank frame.
    mountedUrl = null
    root.innerHTML = '<div class="center"><p>Invalid Google Slides link</p></div>'
    return
  }

  if (url) {
    mount(url)
  } else {
    unmount()
  }
}

connectToHost(
  ({ config: next }) => {
    config = next
    // A config change to a different deck/timing must remount even while active.
    const url = embedUrl()
    if (mountedUrl !== null && mountedUrl !== url) mountedUrl = null
    render()
  },
  {
    onActive: (next) => {
      active = next
      render()
    },
  },
)
