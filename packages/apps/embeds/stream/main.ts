import Hls from 'hls.js'

import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

/**
 * We only run the stream while *active* (the on-screen item): the player preloads
 * the next item into a hidden slot, and a `display:none` video keeps its socket
 * open and its audio playing, so a preloaded stream would make noise behind the
 * current item and hold a connection for nothing. Mounting on activation and
 * tearing down on deactivation is the same pattern as the YouTube app.
 *
 * `muted` follows the screen volume (0 ⇒ muted) and is always true in the CMS
 * preview; the "Play audio" config gate is ANDed on top. Mute is a live property
 * on the <video>, so a volume change never remounts — only a URL/fit change does.
 */
let url = ''
let fit: 'contain' | 'cover' = 'contain'
let playAudio = false
let active = false
let screenMuted = true

let hls: Hls | null = null
let video: HTMLVideoElement | null = null
/** `${url}|${fit}` currently mounted, so a volume change doesn't rebuild. */
let mountedKey: string | null = null

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** Muted unless the operator asked for audio AND the screen isn't muted. */
function effectiveMuted(): boolean {
  return !playAudio || screenMuted
}

/** Attempt playback; if an unmuted autoplay is blocked, fall back to muted. */
function tryPlay(): void {
  if (!video) return
  video.play().catch(() => {
    if (video && !video.muted) {
      video.muted = true
      video.play().catch(() => undefined)
    }
  })
}

function teardown(): void {
  if (hls) {
    hls.destroy()
    hls = null
  }
  if (video) {
    video.pause()
    video.removeAttribute('src')
    video.load()
    video = null
  }
  mountedKey = null
}

function showMessage(text: string): void {
  if (!root) return
  teardown()
  const wrap = document.createElement('div')
  wrap.className = 'center'
  const line = document.createElement('p')
  line.textContent = text
  wrap.appendChild(line)
  root.replaceChildren(wrap)
}

/** Recover from a fatal hls.js error where possible; otherwise show a message. */
function handleFatal(data: { type: string }): void {
  if (!hls) return
  if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
    // A dropped segment/manifest fetch — keep trying rather than going black.
    hls.startLoad()
  } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
    hls.recoverMediaError()
  } else {
    showMessage("Can't play this stream")
  }
}

function mount(): void {
  if (!root) return
  teardown()

  const el = document.createElement('video')
  el.className = `stream-video fit-${fit}`
  el.autoplay = true
  el.loop = true
  el.muted = effectiveMuted()
  el.playsInline = true
  // Belt-and-braces for older WebViews that read the attributes, not the props.
  el.setAttribute('playsinline', '')
  el.setAttribute('webkit-playsinline', '')
  video = el
  root.replaceChildren(el)

  if (Hls.isSupported()) {
    hls = new Hls()
    hls.loadSource(url)
    hls.attachMedia(el)
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) handleFatal(data)
    })
    hls.on(Hls.Events.MANIFEST_PARSED, () => tryPlay())
  } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari / iOS play HLS natively.
    el.src = url
    tryPlay()
  } else {
    showMessage("This screen can't play this stream")
    return
  }

  mountedKey = `${url}|${fit}`
}

function render(): void {
  if (!root) return

  if (active && !isHttpUrl(url)) {
    showMessage('Invalid stream URL')
    return
  }

  if (active && isHttpUrl(url)) {
    if (mountedKey !== `${url}|${fit}`) {
      mount()
    } else if (video) {
      // Same stream, but the mute state (or a re-activation) may have changed.
      video.muted = effectiveMuted()
      tryPlay()
    }
  } else {
    // Off-screen: drop the video (stops the socket and any audio).
    if (mountedKey !== null || (root.childElementCount > 0 && !active)) {
      teardown()
      root.replaceChildren()
    }
  }
}

connectToHost(
  ({ config }) => {
    url = typeof config.url === 'string' ? config.url.trim() : ''
    fit = config.fit === 'cover' ? 'cover' : 'contain'
    playAudio = config.audio === true
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
