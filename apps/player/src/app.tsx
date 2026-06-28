import { useEffect } from 'preact/hooks'

import { getToken } from './device'
import { loadSnapshot } from './persistence/idb'
import { isPreview, previewParams } from './preview'
import { orientation, paired, scale, snapshot, view } from './store'
import { startDailyReload } from './sync/daily-reload'
import { connectPlayer, connectPreview } from './sync/socket'
import { Diagnostics } from './ui/Diagnostics'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { PairingScreen } from './ui/PairingScreen'
import { Stage } from './ui/Stage'

export function App() {
  useEffect(() => {
    // Preview mode (CMS iframe): a read-only spectator. Skip the whole device
    // boot — no token, no persisted snapshot, no heartbeat, no daily-reload —
    // and just mirror the screen's live content. Orientation/scale come from
    // the URL so the rendered output matches the real device.
    if (isPreview && previewParams) {
      orientation.value = previewParams.orientation
      scale.value = previewParams.scale
      connectPreview({
        screenId: previewParams.screenId,
        token: previewParams.token,
      })
      return undefined
    }

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

    // Drive the automatic daily reload from the persisted/pushed setting. Runs
    // independently of the socket so it works offline.
    const stopDailyReload = startDailyReload()

    return () => {
      stopDailyReload()
    }
  }, [])

  const current = view.value

  // In preview we always render the stage — never the pairing/code screen (the
  // operator never pairs from here) and never diagnostics overlay.
  if (isPreview) {
    return (
      <ErrorBoundary>
        <div class="player-root">
          <Stage />
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div class="player-root">
        {current === 'pairing' && <PairingScreen />}
        {current === 'playing' && <Stage />}
        <Diagnostics />
      </div>
    </ErrorBoundary>
  )
}
