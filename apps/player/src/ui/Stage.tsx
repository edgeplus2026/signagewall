import { effect } from '@preact/signals'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

import { PlaybackController } from '../engine/playback-controller'
import { isFollowPreview, isPreview } from '../preview'
import { OverlayLayer } from './OverlayLayer'
import { reportError } from '../sentry'
import { registerPlaybackControls } from '../sync/playback-bus'
import { recordPlay } from '../sync/playback-log'
import {
  lastError,
  online,
  orientation,
  playingItemId,
  scale,
  serviceMenuOpen,
  snapshot,
  volume,
} from '../store'

/** Hide the back/next controls after this long without user activity. */
const CONTROLS_HIDE_MS = 3_000

/**
 * Hosts the imperative playback engine inside Preact. Preact only owns the
 * stable root element; the engine manages the media DOM directly (via the
 * pooled slots) to avoid any VDOM churn on the hot path.
 *
 * On top of the media we overlay back/next controls — left/right gradient
 * affordances that also respond to the keyboard arrows. They auto-hide after a
 * few seconds of inactivity so they never burn into a 24/7 screen.
 */
export function Stage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<PlaybackController | null>(null)
  const hideTimerRef = useRef<number | undefined>(undefined)
  const shieldRef = useRef<HTMLDivElement>(null)
  const [controlsVisible, setControlsVisible] = useState(false)

  // Pull keyboard focus back to the parent (our transparent shield) and off any
  // app iframe. An iframe with focus swallows the arrow keys, so without this
  // the back/next keyboard nav silently dies whenever an app is on screen.
  const focusShield = useCallback((): void => {
    shieldRef.current?.focus({ preventScroll: true })
  }, [])

  // Show the controls and (re)arm the inactivity timer that hides them again.
  const reveal = useCallback((): void => {
    setControlsVisible(true)
    if (hideTimerRef.current !== undefined) {
      window.clearTimeout(hideTimerRef.current)
    }
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false)
    }, CONTROLS_HIDE_MS)
  }, [])

  const goPrevious = useCallback((): void => {
    controllerRef.current?.previous()
    reveal()
  }, [reveal])

  const goNext = useCallback((): void => {
    controllerRef.current?.next()
    reveal()
  }, [reveal])

  useEffect(() => {
    const root = rootRef.current
    const mainRoot = mainRef.current
    if (!root || !mainRoot) {
      return undefined
    }

    const controller = new PlaybackController(
      mainRoot,
      {
        onItem: (item) => {
          playingItemId.value = item.id
          // Reclaim focus from the outgoing app's iframe so keyboard nav keeps
          // working on the next item (a no-op for images/videos).
          focusShield()
        },
        // Proof-of-play. Only a real device counts: a CMS preview is somebody's
        // browser tab, and its plays are not the screen's.
        ...(isPreview ? {} : { onPlay: recordPlay }),
        onError: (error) => {
          lastError.value =
            error instanceof Error ? error.message : String(error)
          // Offline load failures are expected (uncached item, no network) and
          // the engine just skips them — don't spam Sentry with that noise.
          if (navigator.onLine) {
            reportError(error)
          }
        },
      },
      undefined,
      // A device-mirroring preview never runs its own playback clock — it moves
      // only when the device says so. A standalone content preview does run one,
      // exactly as a device would; there is nothing for it to mirror.
      { follow: isFollowPreview },
    )
    controllerRef.current = controller

    // Expose step controls to the realtime command channel so a remote next/prev
    // (e.g. from the CMS preview) drives this engine — both on the real device
    // and inside the preview iframe, keeping them in lockstep.
    const unregisterControls = registerPlaybackControls({
      next: () => controller.next(),
      previous: () => controller.previous(),
      showItem: (itemId) => controller.showItem(itemId),
    })

    const stop = effect(() => {
      // The CMS live preview is never audible — force-mute everything (videos via
      // volume 0, apps via the mute propagated on that same 0). On a real device
      // the screen volume governs; 0 there mutes apps too, not just videos.
      controller.setVolume(isPreview ? 0 : volume.value / 100)
      // Orientation + scale are reflected as data-attributes on the stage root
      // (driven by CSS), so they never touch the imperatively-managed media
      // slots inside it — no VDOM churn on the hot path.
      root.dataset.orientation = orientation.value
      root.dataset.scale = scale.value
      // Connectivity gates network-only apps: apply it before (re)loading so an
      // offline load skips them, and so a live online↔offline flip re-bases the
      // rotation instantly without a reload (setOnline is a no-op if unchanged).
      controller.setOnline(online.value)
      const snap = snapshot.value
      if (snap) {
        controller.load(snap)
      }
    })

    return () => {
      stop()
      unregisterControls()
      controller.destroy()
      controllerRef.current = null
      // Nothing is playing once the stage is gone (e.g. standby) — without
      // this the heartbeat/now-playing stream would keep reporting the last
      // item as on-screen.
      playingItemId.value = null
    }
  }, [])

  // Surface the controls on any pointer activity; drive back/next from arrows.
  // Skipped in preview: the operator shouldn't be able to scrub content in the
  // CMS iframe — the preview must mirror what the device is actually playing.
  useEffect(() => {
    if (isPreview) {
      return undefined
    }

    // Focus the shield up front so the arrow keys work immediately, even when
    // the very first item is an app whose iframe would otherwise hold focus.
    focusShield()

    const onKeyDown = (event: KeyboardEvent): void => {
      // The service menu owns the arrows while it is open — it stops propagation
      // in the capture phase, so this is belt-and-braces for a browser that
      // delivers the event anyway.
      if (serviceMenuOpen.peek()) {
        return
      }
      if (event.key === 'ArrowLeft') {
        goPrevious()
      } else if (event.key === 'ArrowRight') {
        goNext()
      }
    }
    // A tap/click anywhere reveals the controls and pulls focus back to the
    // parent (off any app iframe), so keyboard nav survives after interaction.
    const onPointerDown = (): void => {
      // Not while the menu is up: yanking focus back to the shield mid-tap is
      // how a menu button ends up looking dead on a touchscreen.
      if (serviceMenuOpen.peek()) {
        return
      }
      focusShield()
      reveal()
    }

    window.addEventListener('pointermove', reveal)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointermove', reveal)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      if (hideTimerRef.current !== undefined) {
        window.clearTimeout(hideTimerRef.current)
      }
    }
  }, [reveal, goPrevious, goNext, focusShield])

  // The engine root is the main container, not the stage: the controller
  // appends its slot elements directly into it, and it is keyed so Preact never
  // recreates a container whose children the engine manages imperatively. The
  // controls overlay stays a sibling of the stage; it is fixed/full-screen, so
  // it covers everything. No back/next overlay in preview — see the effect above.
  const stage = (
    <div ref={rootRef} class="player-stage">
      <div key="main" ref={mainRef} class="player-zone player-zone--main" />
      {/* Persistent overlay apps (ticker band): pinned above the content,
          inside the stage so orientation/rotation applies to them too. */}
      <OverlayLayer key="overlays" />
    </div>
  )

  if (isPreview) {
    return stage
  }

  return (
    <>
      {stage}
      <div class="player-controls" data-visible={controlsVisible ? 'true' : 'false'}>
        {/* Transparent, focusable capture layer sitting above the app iframes
            but below the buttons. Without it an on-screen app iframe swallows
            pointer/keyboard events, so the controls never reveal on mouse move
            and the arrow keys never reach us. Signage apps are display-only, so
            shielding their input is harmless (and prevents stray interaction). */}
        <div ref={shieldRef} class="player-input-shield" tabindex={-1} />
        <button
          type="button"
          class="player-control player-control--prev"
          aria-label="Previous"
          onClick={goPrevious}
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          class="player-control player-control--next"
          aria-label="Next"
          onClick={goNext}
        >
          <ChevronRight />
        </button>
      </div>
    </>
  )
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}
