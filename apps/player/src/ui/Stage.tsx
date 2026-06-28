import { effect } from '@preact/signals'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

import { PlaybackController } from '../engine/playback-controller'
import { isPreview } from '../preview'
import { reportError } from '../sentry'
import { registerPlaybackControls } from '../sync/playback-bus'
import {
  lastError,
  orientation,
  playingItemId,
  scale,
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
  const controllerRef = useRef<PlaybackController | null>(null)
  const hideTimerRef = useRef<number | undefined>(undefined)
  const [controlsVisible, setControlsVisible] = useState(false)

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
    if (!root) {
      return undefined
    }

    const controller = new PlaybackController(
      root,
      {
        onItem: (item) => {
          playingItemId.value = item.id
        },
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
      // The preview mirrors the device; it never runs its own playback clock.
      { follow: isPreview },
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

    // Coming back online, re-warm the cache so any items that couldn't be
    // prefetched while offline get pulled in before the next drop.
    const onOnline = (): void => {
      controllerRef.current?.prefetchAll()
    }
    window.addEventListener('online', onOnline)

    const stop = effect(() => {
      controller.setVolume(volume.value / 100)
      // Orientation + scale are reflected as data-attributes on the stage root
      // (driven by CSS), so they never touch the imperatively-managed media
      // slots inside it — no VDOM churn on the hot path.
      root.dataset.orientation = orientation.value
      root.dataset.scale = scale.value
      const snap = snapshot.value
      if (snap) {
        controller.load(snap)
      }
    })

    return () => {
      stop()
      unregisterControls()
      window.removeEventListener('online', onOnline)
      controller.destroy()
      controllerRef.current = null
    }
  }, [])

  // Surface the controls on any pointer activity; drive back/next from arrows.
  // Skipped in preview: the operator shouldn't be able to scrub content in the
  // CMS iframe — the preview must mirror what the device is actually playing.
  useEffect(() => {
    if (isPreview) {
      return undefined
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft') {
        goPrevious()
      } else if (event.key === 'ArrowRight') {
        goNext()
      }
    }

    window.addEventListener('pointermove', reveal)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointermove', reveal)
      window.removeEventListener('keydown', onKeyDown)
      if (hideTimerRef.current !== undefined) {
        window.clearTimeout(hideTimerRef.current)
      }
    }
  }, [reveal, goPrevious, goNext])

  // The controls are a *sibling* of the engine root, not a child: the engine
  // appends its slot elements directly into `player-stage`, so keeping any JSX
  // out of that node guarantees Preact never reconciles (and risks reordering)
  // the imperatively-managed media layers. The overlay is fixed/full-screen, so
  // it covers the stage regardless of DOM parent.
  // No back/next overlay in preview — see the effect above.
  if (isPreview) {
    return <div ref={rootRef} class="player-stage" />
  }

  return (
    <>
      <div ref={rootRef} class="player-stage" />
      <div class="player-controls" data-visible={controlsVisible ? 'true' : 'false'}>
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
