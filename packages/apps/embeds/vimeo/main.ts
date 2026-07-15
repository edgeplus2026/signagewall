import { toVimeoEmbedUrl } from '../../src/vimeo/embed.js'
import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'

const root = document.getElementById('app')

/**
 * Latest state from the host. We only mount the (autoplaying) Vimeo iframe once
 * we are *active* — the player preloads the next item into a hidden slot, and a
 * `display:none` iframe still plays audio, so mounting on config alone would
 * blare sound while the previous item is still on screen. `muted` follows the
 * screen volume (0 ⇒ muted) and is always true in the preview. `muted` is a
 * load-time embed param, so a mute change remounts the iframe. See the
 * `app-active` protocol in `@edge/apps-contract`. Mirrors the YouTube app.
 */
let videoUrl = ''
let active = false
let muted = true
/** The embed URL currently mounted in the DOM, so we don't rebuild needlessly. */
let mountedUrl: string | null = null

function mount(url: string): void {
  if (!root || mountedUrl === url) return
  const frame = document.createElement('iframe')
  frame.className = 'fill-frame'
  frame.title = 'Vimeo'
  frame.src = url
  frame.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'
  frame.allowFullscreen = true
  root.replaceChildren(frame)
  mountedUrl = url
}

function unmount(): void {
  if (!root || mountedUrl === null) return
  // Removing the iframe tears down the player and stops its audio immediately —
  // the whole point of gating on `active`.
  root.replaceChildren()
  mountedUrl = null
}

function render(): void {
  if (!root) return

  const embed = active ? toVimeoEmbedUrl(videoUrl, { muted }) : null

  if (active && !embed) {
    // Active but the URL is unusable — show the error rather than a blank frame.
    mountedUrl = null
    root.innerHTML = '<div class="center"><p>Invalid Vimeo URL</p></div>'
    return
  }

  // Play only while on screen; drop the iframe (and its audio) the moment we
  // become a hidden/preloaded item again. `embed` folds in the mute state, so a
  // volume change to/from 0 remounts with the right `muted` param.
  if (embed) {
    mount(embed)
  } else {
    unmount()
  }
}

connectToHost(
  ({ config }) => {
    videoUrl = typeof config.url === 'string' ? config.url : ''
    render()
  },
  {
    onActive: (nextActive, nextMuted) => {
      active = nextActive
      muted = nextMuted
      render()
    },
  },
)
