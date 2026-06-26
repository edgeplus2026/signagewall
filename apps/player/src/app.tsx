import { useEffect } from 'preact/hooks'

import { getToken } from './device'
import { loadSnapshot } from './persistence/idb'
import { paired, snapshot, view } from './store'
import { connectPlayer } from './sync/socket'
import { Diagnostics } from './ui/Diagnostics'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { PairingScreen } from './ui/PairingScreen'
import { Stage } from './ui/Stage'

export function App() {
  useEffect(() => {
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
  }, [])

  const current = view.value

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
