import { effect } from '@preact/signals'
import { useEffect } from 'preact/hooks'

import { getDeviceId, getToken } from './device'
import {
  bootstrapNativeIdentity,
  bootstrapNativeRuntime,
} from './native/bootstrap'
import { startLiveness } from './native/liveness'
import {
  reportHealthy,
  startMaintenanceUpdates,
  startStandbyUpdate,
} from './native/updater'
import { loadSnapshot, purgeOutdatedMediaCaches } from './persistence/idb'
import { isPreview, previewParams } from './preview'
import { reflectDeviceIdInUrl } from './recovery'
import {
  connection,
  orientation,
  paired,
  playingItemId,
  scale,
  snapshot,
  view,
} from './store'
import { startAvailability } from './sync/availability'
import { startDailyReload } from './sync/daily-reload'
import { startKioskLock, startScreenNameBridge } from './sync/kiosk'
import { startOnline } from './sync/online'
import { startPrefetch } from './sync/prefetch'
import { requestPreviewToken } from './sync/preview-handshake'
import { startWakeLock } from './sync/wake-lock'
import { connectPlayer, connectPreview, disconnectPlayer } from './sync/socket'
import { Diagnostics } from './ui/Diagnostics'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { PairingScreen } from './ui/PairingScreen'
import { Stage } from './ui/Stage'
import { Standby } from './ui/Standby'

export function App() {
  // Confirm to the native shell's post-update watchdog that this build actually
  // WORKS — not merely that React mounted. `reportAlive` (in main.tsx) already
  // said the page loaded; we withhold `reportHealthy` until the player reaches a
  // real working state, so a build that mounts but can't play content is caught
  // and rolled back instead of being promoted to last-known-good. Healthy means:
  //   - content is actually on screen (`playingItemId` set — proves decode/render
  //     works, and covers offline playback of cached content), OR
  //   - we connected to the backend AND it settled on a legit idle view (paired-
  //     but-empty pairing screen, or standby/off-hours) — nothing to play, but
  //     provably functioning.
  // Native no-op in a browser or the CMS preview iframe. Fires once.
  useEffect(() => {
    let reported = false
    const stop = effect(() => {
      const contentOnScreen = playingItemId.value !== null
      const connectedAndIdle =
        connection.value === 'online' &&
        (view.value === 'pairing' || view.value === 'standby')
      if (!reported && (contentOnScreen || connectedAndIdle)) {
        reported = true
        void reportHealthy()
      }
    })
    return stop
  }, [])

  useEffect(() => {
    // Preview mode (CMS iframe): a read-only spectator. Skip the whole device
    // boot — no token, no persisted snapshot, no heartbeat, no daily-reload —
    // and just mirror the screen's live content. Orientation/scale come from
    // the URL so the rendered output matches the real device.
    if (isPreview && previewParams) {
      const params = previewParams
      orientation.value = params.orientation
      scale.value = params.scale
      // The operator token is delivered over postMessage (never the URL), so we
      // connect only once the embedding CMS hands it to us. connectPreview is
      // idempotent (guards on an existing socket), so a repeated token message
      // is harmless.
      const stopHandshake = requestPreviewToken((token) => {
        connectPreview({ screenId: params.screenId, token })
      })
      // Mirror standby too: the preview must go dark outside working hours
      // exactly as the device will, evaluating the same rule from the snapshot.
      const stopAvailability = startAvailability()
      return () => {
        stopHandshake()
        stopAvailability()
      }
    }

    // Track connectivity from the very first paint (independent of the async
    // boot) so network-only apps are correctly hidden even if we start offline.
    const stopOnline = startOnline()

    // Native shell first: seed the deviceId from the native store and load the
    // shell version BEFORE anything reads the identity, so the socket sends the
    // recovered native id (not a freshly-minted UUID) and the first heartbeat
    // already carries the shell version. Both no-op in a plain browser. useEffect
    // can't be async, so run boot in a guarded IIFE and collect disposers.
    let disposed = false
    let stopKioskLock: (() => void) | undefined
    let stopScreenName: (() => void) | undefined
    let stopDailyReload: (() => void) | undefined
    let stopAvailability: (() => void) | undefined
    let stopPrefetch: (() => void) | undefined
    let stopWakeLock: (() => void) | undefined
    let stopStandbyUpdate: (() => void) | undefined
    let stopMaintenanceUpdates: (() => void) | undefined
    let stopLiveness: (() => void) | undefined

    void (async () => {
      await bootstrapNativeIdentity()
      await bootstrapNativeRuntime()
      if (disposed) return

      // Mirror our stable identity into the URL (?device=<uuid>) so this tab is a
      // durable bookmark: if localStorage is later wiped, reopening this URL lets
      // the player re-adopt the same deviceId and recover its paired screen.
      reflectDeviceIdInUrl(getDeviceId())

      // Offline-first boot: if we already hold a token we are paired, and we can
      // render the last persisted snapshot instantly — before the network is up.
      if (getToken()) {
        paired.value = true
      }
      void loadSnapshot().then((persisted) => {
        // Re-hydrate only while still paired: a revoke that lands before this
        // resolves clears the token, and we must not resurface old content.
        if (persisted && !snapshot.value && getToken()) {
          snapshot.value = persisted
        }
      })

      connectPlayer()

      // Liveness beat for the native keep-alive supervisor — started as early as
      // the bridge allows so a freeze at any later point is still caught. No-op in
      // a browser / on Android (no desktop watchdog).
      stopLiveness = startLiveness()

      // Enforce the kiosk lockdown before the content loops so the device locks
      // as early as possible; reads the persisted mode, so it re-locks even while
      // offline (no-op off the Android shell).
      stopKioskLock = startKioskLock()
      stopScreenName = startScreenNameBridge()

      // Hold the display awake. The native shells keep the screen on at the OS
      // level, so this is what covers the web player — a browser on a TV or
      // tablet otherwise hits its screensaver mid-loop, since nobody ever
      // touches a signage screen.
      stopWakeLock = startWakeLock()

      // Offline-capable background loops: daily reload, standby (availability),
      // and media prefetch (keeps the cache warm even during standby).
      stopDailyReload = startDailyReload()
      stopAvailability = startAvailability()
      // Apply a pending shell update whenever the screen is dark (standby) —
      // the catch-up for devices powered off or offline during the nightly
      // window. Started after availability so `view` reflects the rule.
      stopStandbyUpdate = startStandbyUpdate()
      // Backstop on a fixed cadence, independent of daily-reload/standby, so a
      // 24/7 always-on screen still applies shell updates rather than never.
      stopMaintenanceUpdates = startMaintenanceUpdates()
      // Prefetch starts last because it alone has to wait: media cached in a
      // format this build can no longer serve is dropped first, or the warm-up
      // would see those entries as already cached and leave them in place for
      // another 30 days. Nothing above is held up by that.
      await purgeOutdatedMediaCaches()
      if (disposed) return
      stopPrefetch = startPrefetch()
    })()

    // Symmetric teardown: stop whatever boot managed to start. Safe before boot
    // finishes — the disposers are undefined and disconnectPlayer guards on a
    // null socket; `disposed` also aborts a late boot so it never starts loops
    // after unmount. Keeps dev StrictMode/HMR remounts from leaking sockets/timers.
    return () => {
      disposed = true
      stopOnline()
      stopMaintenanceUpdates?.()
      stopStandbyUpdate?.()
      stopPrefetch?.()
      stopAvailability?.()
      stopDailyReload?.()
      stopWakeLock?.()
      stopScreenName?.()
      stopKioskLock?.()
      stopLiveness?.()
      disconnectPlayer()
    }
  }, [])

  const current = view.value

  // In preview we always render the stage — never the pairing/code screen (the
  // operator never pairs from here) and never diagnostics overlay.
  if (isPreview) {
    return (
      <ErrorBoundary>
        <div class="player-root">
          {current === 'standby' ? <Standby /> : <Stage />}
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div class="player-root">
        {current === 'pairing' && <PairingScreen />}
        {current === 'playing' && <Stage />}
        {current === 'standby' && <Standby />}
        <Diagnostics />
      </div>
    </ErrorBoundary>
  )
}
