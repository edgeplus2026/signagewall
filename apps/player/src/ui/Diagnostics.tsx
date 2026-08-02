import { useEffect, useState } from 'preact/hooks'

import { config } from '../config'
import {
  connection,
  lastError,
  paired,
  playingItemId,
  screenAwake,
  snapshot,
} from '../store'

/**
 * Hidden operator overlay. Toggle with the `d` key — useful for diagnosing a
 * remote screen over a remote-desktop session without shipping a debug build.
 */
export function Diagnostics() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'd' || event.key === 'D') {
        setOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!open) {
    return null
  }

  return (
    <div class="player-diagnostics">
      <div>version: {config.appVersion}</div>
      <div>connection: {connection.value}</div>
      <div>paired: {String(paired.value)}</div>
      <div>revision: {snapshot.value?.revision ?? '—'}</div>
      <div>items: {snapshot.value?.items.length ?? 0}</div>
      <div>playing: {playingItemId.value ?? '—'}</div>
      {/* False on a browser that has no Wake Lock API (or refused it): the
          display will follow its own screensaver, not us. */}
      <div>screenAwake: {String(screenAwake.value)}</div>
      <div>lastError: {lastError.value ?? '—'}</div>
    </div>
  )
}
