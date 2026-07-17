import { effect } from '@preact/signals'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

import { PlaybackController } from '../engine/playback-controller'
import { isPreview } from '../preview'
import { reportError } from '../sentry'
import { registerPlaybackControls } from '../sync/playback-bus'
import {
  lastError,
  online,
  orientation,
  playingItemId,
  scale,
  snapshot,
  volume,
} from '../store'
import type { PlayerSnapshot, ScreenZoneKey } from '../types'

/** Hide the back/next controls after this long without user activity. */
const CONTROLS_HIDE_MS = 3_000

/**
 * The split-screen regions to actually draw, degraded to the zones that arrived
 * with content: a `main-sidebar-ticker` snapshot whose sidebar resolved empty
 * plays as `main-ticker`, and a split snapshot with no populated zones at all
 * plays exactly like a classic fullscreen one. Geometry itself is pure CSS,
 * keyed on the `data-layout` this computes.
 */
function effectiveZones(snap: PlayerSnapshot | null): {
  layout: string
  zoneKeys: ScreenZoneKey[]
} {
  if (!snap?.layout || snap.layout === 'fullscreen' || !snap.zones?.length) {
    return { layout: 'fullscreen', zoneKeys: [] }
  }
  const has = (key: ScreenZoneKey): boolean =>
    snap.layout !== undefined &&
    snap.layout.includes(key) &&
    (snap.zones ?? []).some((zone) => zone.key === key && zone.items.length > 0)
  const zoneKeys: ScreenZoneKey[] = []
  if (has('sidebar')) zoneKeys.push('sidebar')
  if (has('ticker')) zoneKeys.push('ticker')
  if (zoneKeys.length === 0) {
    return { layout: 'fullscreen', zoneKeys: [] }
  }
  return { layout: `main-${zoneKeys.join('-')}`, zoneKeys }
}

/**
 * A secondary split-screen region: its own playback loop over the zone's items,
 * inside its own CSS-positioned container. Deliberately mute (audio belongs to
 * the main zone alone), never reported as "now playing", and free-running even
 * in the CMS preview — the device only mirrors the main zone.
 */
function ZoneRegion({ zone }: { zone: ScreenZoneKey }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) {
      return undefined
    }
    const controller = new PlaybackController(root, {
      onError: (error) => {
        // Same policy as the main loop: offline load failures are expected.
        if (navigator.onLine) {
          reportError(error)
        }
      },
    })
    controller.setVolume(0)

    const stop = effect(() => {
      controller.setOnline(online.value)
      const snap = snapshot.value
      const entry = snap?.zones?.find((candidate) => candidate.key === zone)
      if (snap && entry && entry.items.length > 0) {
        controller.load({
          screenId: snap.screenId,
          name: snap.name,
          // Zone-scoped revision, so a zone edit reloads this loop while an
          // untouched zone's controller dedupes and keeps its place.
          revision: `${snap.revision}:${zone}`,
          items: entry.items,
        })
      }
    })

    return () => {
      stop()
      controller.destroy()
    }
  }, [zone])

  return <div ref={ref} class={`player-zone player-zone--${zone}`} />
}

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
  // Which secondary regions to draw; changes only when the layout genuinely
  // changes (guarded below), so zone edits never churn the main engine's DOM.
  const [zoneKeys, setZoneKeys] = useState<ScreenZoneKey[]>([])
  const layoutSigRef = useRef('fullscreen:')

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
      // Split-screen: reflect the effective layout as a data-attribute (CSS owns
      // the region geometry) and mount/unmount the secondary regions. Guarded by
      // a signature so only a real layout change re-renders the zone list.
      const zones = effectiveZones(snap)
      root.dataset.layout = zones.layout
      const signature = `${zones.layout}:${zones.zoneKeys.join(',')}`
      if (signature !== layoutSigRef.current) {
        layoutSigRef.current = signature
        setZoneKeys(zones.zoneKeys)
      }
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
      if (event.key === 'ArrowLeft') {
        goPrevious()
      } else if (event.key === 'ArrowRight') {
        goNext()
      }
    }
    // A tap/click anywhere reveals the controls and pulls focus back to the
    // parent (off any app iframe), so keyboard nav survives after interaction.
    const onPointerDown = (): void => {
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

  // The engine roots are the ZONE containers, not the stage: each controller
  // appends its slot elements directly into its own `.player-zone`, and those
  // zone divs are all keyed so Preact never recreates (or reorders) a container
  // whose children an engine manages imperatively. The controls overlay stays a
  // sibling of the stage; it is fixed/full-screen, so it covers everything.
  // No back/next overlay in preview — see the effect above.
  const stage = (
    <div ref={rootRef} class="player-stage">
      <div key="main" ref={mainRef} class="player-zone player-zone--main" />
      {zoneKeys.map((zone) => (
        <ZoneRegion key={zone} zone={zone} />
      ))}
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
