import type HlsType from 'hls.js'

import { connectToHost } from '../_shared/host-bridge.js'
import {
  isFrameKind,
  isVideoKind,
  resolveSource,
  type ResolvedSource,
  type StreamKind,
} from './sources.js'

import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

/**
 * We only run the stream while *active* (the on-screen item): the player preloads
 * the next item into a hidden slot, and a hidden video/iframe keeps its socket
 * open and its audio playing. Mounting on activation and tearing down on
 * deactivation is the same pattern as the YouTube app.
 *
 * `muted` follows the screen volume (0 ⇒ muted) and is always true in the CMS
 * preview; the "Play audio" gate is ANDed on top. For `<video>` kinds mute is a
 * live property (no remount); for the platform iframes it's a load-time URL param
 * so a mute flip remounts the frame.
 */
let url = ''
let source = 'auto'
let fit: 'contain' | 'cover' = 'contain'
let playAudio = false
let active = false
let screenMuted = true

let hls: HlsType | null = null
let dashPlayer: { reset: () => void } | null = null
let peer: RTCPeerConnection | null = null
let video: HTMLVideoElement | null = null
let frame: HTMLIFrameElement | null = null

/** What is currently mounted, so a mute/volume change doesn't needlessly rebuild. */
let mounted: { key: string; kind: StreamKind; muted: boolean } | null = null
/** Bumped on every mount so a slow async import from a stale mount is ignored. */
let mountToken = 0

/** Muted unless the operator asked for audio AND the screen isn't muted. */
function effectiveMuted(): boolean {
  return !playAudio || screenMuted
}

/** `${source}|${url}|${fit}` — the inputs that require a full rebuild. */
function baseKey(): string {
  return `${source}|${url}|${fit}`
}

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
  mountToken += 1
  if (hls) {
    hls.destroy()
    hls = null
  }
  if (dashPlayer) {
    dashPlayer.reset()
    dashPlayer = null
  }
  if (peer) {
    peer.close()
    peer = null
  }
  if (video) {
    video.pause()
    video.srcObject = null
    video.removeAttribute('src')
    video.load()
    video = null
  }
  frame = null
  mounted = null
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

function makeVideo(): HTMLVideoElement {
  const el = document.createElement('video')
  el.className = `stream-video fit-${fit}`
  el.autoplay = true
  el.loop = true
  el.muted = effectiveMuted()
  el.playsInline = true
  el.setAttribute('playsinline', '')
  el.setAttribute('webkit-playsinline', '')
  return el
}

/** Recover from a fatal hls.js error where possible; otherwise show a message. */
function handleFatal(HlsClass: typeof HlsType, data: { type: string }): void {
  if (!hls) return
  if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) {
    hls.startLoad()
  } else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
    hls.recoverMediaError()
  } else {
    showMessage("Can't play this stream")
  }
}

async function mountHls(el: HTMLVideoElement, token: number): Promise<void> {
  const { default: Hls } = await import('hls.js')
  if (token !== mountToken) return
  if (Hls.isSupported()) {
    hls = new Hls()
    hls.loadSource(url)
    hls.attachMedia(el)
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) handleFatal(Hls, data)
    })
    hls.on(Hls.Events.MANIFEST_PARSED, () => tryPlay())
  } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
    el.src = url // Safari / iOS play HLS natively.
    tryPlay()
  } else {
    showMessage("This screen can't play this stream")
  }
}

async function mountDash(el: HTMLVideoElement, mediaUrl: string, token: number): Promise<void> {
  const dashjs = await import('dashjs')
  if (token !== mountToken) return
  const player = dashjs.MediaPlayer().create()
  dashPlayer = player
  player.initialize(el, mediaUrl, true)
}

async function mountWhep(el: HTMLVideoElement, endpoint: string, token: number): Promise<void> {
  const pc = new RTCPeerConnection()
  peer = pc
  pc.addTransceiver('video', { direction: 'recvonly' })
  pc.addTransceiver('audio', { direction: 'recvonly' })
  pc.ontrack = (event) => {
    if (video && event.streams[0]) {
      video.srcObject = event.streams[0]
      tryPlay()
    }
  }
  const offer = await pc.createOffer()
  if (token !== mountToken) return
  await pc.setLocalDescription(offer)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: offer.sdp ?? '',
  })
  if (token !== mountToken) return
  if (!response.ok) {
    showMessage("Can't play this stream")
    return
  }
  const answer = await response.text()
  if (token !== mountToken) return
  await pc.setRemoteDescription({ type: 'answer', sdp: answer })
}

function mountFrame(frameUrl: string): void {
  if (!root) return
  const el = document.createElement('iframe')
  el.className = 'stream-frame'
  el.src = frameUrl
  // `allow` already grants fullscreen, and the browser warns that it takes
  // precedence over the legacy `allowfullscreen` attribute — so setting both
  // only adds a console warning on every mount and grants nothing extra.
  el.allow =
    'autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope'
  el.setAttribute('referrerpolicy', 'no-referrer-when-downgrade')
  frame = el
  root.replaceChildren(el)
}

function mount(resolved: ResolvedSource): void {
  if (!root) return
  teardown()
  const token = mountToken
  const muted = effectiveMuted()

  if (isFrameKind(resolved.kind) && resolved.frameUrl) {
    mountFrame(resolved.frameUrl)
    mounted = { key: baseKey(), kind: resolved.kind, muted }
    return
  }

  if (isVideoKind(resolved.kind) && resolved.url) {
    const el = makeVideo()
    video = el
    root.replaceChildren(el)
    mounted = { key: baseKey(), kind: resolved.kind, muted }
    if (resolved.kind === 'hls') {
      void mountHls(el, token)
    } else if (resolved.kind === 'dash') {
      void mountDash(el, resolved.url, token)
    } else if (resolved.kind === 'whep') {
      void mountWhep(el, resolved.url, token).catch(() => showMessage("Can't play this stream"))
    } else {
      el.src = resolved.url // direct file
      tryPlay()
    }
    return
  }

  showMessage('Invalid stream link')
}

function render(): void {
  if (!root) return

  if (!active) {
    // Off-screen: drop the video/iframe (stops the socket and any audio).
    if (mounted !== null || root.childElementCount > 0) {
      teardown()
      root.replaceChildren()
    }
    return
  }

  const muted = effectiveMuted()
  const resolved = resolveSource(url, source, muted, location.hostname)

  if (resolved.kind === 'blocked') {
    showMessage("This kind of link (RTMP/RTSP) can't play in a browser — use an HLS, DASH or WebRTC link.")
    return
  }
  if (resolved.kind === 'invalid') {
    showMessage('Invalid stream link')
    return
  }

  if (mounted?.key !== baseKey()) {
    mount(resolved)
    return
  }

  // Same source already mounted — react to a mute/volume change only.
  if (isVideoKind(mounted.kind)) {
    if (video) {
      video.muted = muted
      tryPlay()
    }
  } else if (mounted.muted !== muted) {
    // Platform iframe: mute is a load-time param, so rebuild with the new value.
    mount(resolved)
  }
}

connectToHost(
  ({ config }) => {
    url = typeof config.url === 'string' ? config.url.trim() : ''
    source = typeof config.source === 'string' ? config.source : 'auto'
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
