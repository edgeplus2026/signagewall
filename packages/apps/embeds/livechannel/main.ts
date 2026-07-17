import {
  type LivePlatform,
  toLiveChannelEmbedUrl,
} from '../../src/livechannel/embed.js'
import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'

const root = document.getElementById('app')

/**
 * We only mount the (autoplaying) Twitch/Kick iframe once we are *active* — the
 * player preloads the next item into a hidden slot, and a `display:none` iframe
 * still plays audio. `screenMuted` follows the screen volume (always muted in the
 * preview); the mute state is a load-time embed param, so a change remounts the
 * frame. `parent` for Twitch is the player's own hostname. See the `app-active`
 * protocol in `@edge/apps-contract`.
 */
let platform: LivePlatform = 'twitch'
let channel = ''
let wantAudio = false
let active = false
let screenMuted = true
let mountedUrl: string | null = null

function currentUrl(): string | null {
  if (!active) return null
  const muted = !wantAudio || screenMuted
  return toLiveChannelEmbedUrl(platform, channel, {
    muted,
    parent: window.location.hostname,
  })
}

function mount(url: string): void {
  if (!root || mountedUrl === url) return
  const frame = document.createElement('iframe')
  frame.className = 'fill-frame'
  frame.title = 'Live channel'
  frame.src = url
  frame.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture'
  frame.allowFullscreen = true
  root.replaceChildren(frame)
  mountedUrl = url
}

function unmount(): void {
  if (!root || mountedUrl === null) return
  // Removing the iframe tears down the player and stops its audio at once.
  root.replaceChildren()
  mountedUrl = null
}

function render(): void {
  if (!root) return
  const url = currentUrl()

  if (active && channel && !url) {
    // Active with a channel we can't turn into an embed — show the error rather
    // than a blank frame.
    mountedUrl = null
    root.innerHTML = '<div class="center"><p>Invalid channel</p></div>'
    return
  }

  if (url) {
    mount(url)
  } else {
    unmount()
  }
}

connectToHost(
  ({ config }) => {
    platform = config.platform === 'kick' ? 'kick' : 'twitch'
    channel = typeof config.channel === 'string' ? config.channel : ''
    wantAudio = config.audio === true
    render()
  },
  {
    onActive: (nextActive, nextMuted) => {
      active = nextActive
      screenMuted = nextMuted
      render()
    },
  },
)
