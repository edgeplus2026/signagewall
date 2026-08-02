import { parseYouTubeId } from '../../src/youtube/embed.js'
import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'

/**
 * Minimal surface of the YouTube IFrame Player API we use. Driving the player
 * through the API rather than a bare `<iframe src>` is what lets us *notice*
 * that autoplay was refused and recover from it — see {@link watchPlayback}.
 */
interface YouTubePlayer {
  playVideo(): void
  mute(): void
  unMute(): void
  getPlayerState(): number
  destroy(): void
}

interface YouTubePlayerOptions {
  videoId: string
  host?: string
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: () => void
    onError?: (event: { data: number }) => void
  }
}

type YouTubePlayerConstructor = new (
  element: HTMLElement,
  options: YouTubePlayerOptions,
) => YouTubePlayer

declare global {
  interface Window {
    YT?: { Player: YouTubePlayerConstructor }
    onYouTubeIframeAPIReady?: () => void
  }
}

/** `YT.PlayerState` values — the enum itself only exists once the API loads. */
const STATE_PLAYING = 1
const STATE_BUFFERING = 3
/** Errors that mean the owner disallowed embedding, as opposed to a bad link. */
const EMBED_BLOCKED_ERRORS = new Set([101, 150])
/**
 * How long a play attempt gets to prove itself before we assume the browser's
 * autoplay policy refused it. A permitted play reaches BUFFERING almost at once;
 * a refused one never leaves UNSTARTED, so this only has to outlast the former.
 */
const AUTOPLAY_GRACE_MS = 2_000

const root = document.getElementById('app')

/**
 * Latest state from the host. We only mount the (autoplaying) player once we are
 * *active* — the player preloads the next item into a hidden slot, and a
 * `display:none` iframe still plays audio, so mounting on config alone would
 * blare sound while the previous item is still on screen. `muted` follows the
 * screen volume (0 ⇒ muted) and is always true in the preview. See the
 * `app-active` protocol in `@signagewall/apps-contract`.
 */
let videoId: string | null = null
let active = false
let muted = true
let player: YouTubePlayer | null = null
/** The video currently mounted, so a repeated config doesn't restart playback. */
let mountedId: string | null = null
/**
 * Bumped on every mount/unmount. The API script loads asynchronously, so a mount
 * that resolves after the host has moved us on must not build a player into a
 * slot that no longer wants one.
 */
let generation = 0
let playbackTimer: ReturnType<typeof setTimeout> | undefined

let apiPromise: Promise<YouTubePlayerConstructor> | null = null

/** Loads the IFrame API once per document and resolves with its constructor. */
function loadPlayerApi(): Promise<YouTubePlayerConstructor> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise<YouTubePlayerConstructor>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT.Player)
      return
    }
    // The API calls this global exactly once, when `YT` is ready to use.
    window.onYouTubeIframeAPIReady = () => {
      const constructor = window.YT?.Player
      if (constructor) resolve(constructor)
      else reject(new Error('youtube api loaded without a Player'))
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => {
      reject(new Error('youtube api failed to load'))
    }
    document.head.append(script)
  })
  return apiPromise
}

function renderMessage(text: string): void {
  if (!root) return
  root.innerHTML = `<div class="center"><p>${text}</p></div>`
}

function clearPlaybackWatch(): void {
  if (playbackTimer !== undefined) {
    clearTimeout(playbackTimer)
    playbackTimer = undefined
  }
}

function isPlaying(target: YouTubePlayer): boolean {
  const state = target.getPlayerState()
  return state === STATE_PLAYING || state === STATE_BUFFERING
}

/**
 * Confirms a play attempt actually started and, if it did not, gives up the
 * sound to keep the picture.
 *
 * Autoplay with sound needs a permission the browser may simply not grant — iOS
 * never does without a user gesture, so an unmuted embed there sits frozen on
 * its poster forever. Muted autoplay is always allowed, so falling back to it is
 * the difference between a playing screen and a dead one. This mirrors what the
 * player's own `<video>` slot does for uploaded clips.
 */
function watchPlayback(seq: number): void {
  clearPlaybackWatch()
  playbackTimer = setTimeout(() => {
    playbackTimer = undefined
    if (seq !== generation || !player || isPlaying(player)) return
    player.mute()
    player.playVideo()
  }, AUTOPLAY_GRACE_MS)
}

/**
 * Pushes the screen's mute state onto a live player. `mute` used to be a
 * load-time URL param, so a volume change restarted the video from zero; through
 * the API it applies in place. Unmuting can itself be refused (the browser
 * pauses the media instead), which is why it is watched like any other play.
 */
function applyMute(seq: number): void {
  if (!player) return
  if (muted) {
    player.mute()
    clearPlaybackWatch()
    return
  }
  player.unMute()
  watchPlayback(seq)
}

/**
 * Disposes the live player and the watch armed against it. Both must go
 * together: a watch that survives its player would call `mute`/`playVideo` on a
 * detached iframe, which the API only answers with console warnings.
 */
function teardownPlayer(): void {
  clearPlaybackWatch()
  if (player) {
    // Destroying the player tears down its iframe and stops the audio
    // immediately — the whole point of gating on `active`.
    player.destroy()
    player = null
  }
}

function unmount(): void {
  teardownPlayer()
  generation += 1
  mountedId = null
  if (root) root.replaceChildren()
}

async function mount(id: string): Promise<void> {
  if (!root) return
  unmount()
  const seq = generation
  mountedId = id

  const holder = document.createElement('div')
  holder.className = 'fill-frame'
  root.replaceChildren(holder)

  let Player: YouTubePlayerConstructor
  try {
    Player = await loadPlayerApi()
  } catch {
    if (seq !== generation) return
    mountedId = null
    renderMessage('YouTube is unavailable')
    return
  }
  // The host moved us on while the API was loading — that mount owns the slot.
  if (seq !== generation) return

  player = new Player(holder, {
    videoId: id,
    host: 'https://www.youtube-nocookie.com',
    playerVars: {
      autoplay: 1,
      mute: muted ? 1 : 0,
      controls: 0,
      // `loop` needs `playlist` set to the same id to loop a single video, which
      // also keeps YouTube's recommended-videos end screen off a signage display.
      loop: 1,
      playlist: id,
      playsinline: 1,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      disablekb: 1,
    },
    events: {
      onReady: () => {
        if (seq !== generation || !player) return
        player.playVideo()
        watchPlayback(seq)
      },
      onError: (event) => {
        if (seq !== generation) return
        // Drop the player before painting over it, so the autoplay watch can't
        // outlive the frame it was watching.
        teardownPlayer()
        mountedId = null
        renderMessage(
          EMBED_BLOCKED_ERRORS.has(event.data)
            ? 'This video cannot be embedded'
            : 'This video is unavailable',
        )
      },
    },
  })
}

function render(): void {
  if (!root) return

  // Play only while on screen; drop the player (and its audio) the moment we
  // become a hidden/preloaded item again.
  if (!active) {
    unmount()
    return
  }
  if (!videoId) {
    // Active but the URL is unusable — show the error rather than a blank frame.
    unmount()
    renderMessage('Invalid YouTube URL')
    return
  }
  if (mountedId === videoId) {
    applyMute(generation)
    return
  }
  void mount(videoId)
}

connectToHost(
  ({ config }) => {
    videoId = typeof config.url === 'string' ? parseYouTubeId(config.url) : null
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
