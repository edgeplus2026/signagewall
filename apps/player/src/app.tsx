import { useEffect } from 'preact/hooks'

import { getToken } from './device'
import { loadSnapshot } from './persistence/idb'
import { audioUnlocked, paired, snapshot, view } from './store'
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
      if (persisted && !snapshot.value) {
        snapshot.value = persisted
      }
    })

    connectPlayer()

    // The first user gesture unlocks audio so subsequent videos can play unmuted.
    const unlock = (): void => {
      audioUnlocked.value = true
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
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
