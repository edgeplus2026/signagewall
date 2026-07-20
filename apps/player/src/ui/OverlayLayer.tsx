import { effect } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'

import { type AppHostHandle, mountAppHost } from '../apps/host-bridge'
import { config } from '../config'
import { reportError } from '../sentry'
import { snapshot } from '../store'
import type { AppRenderable } from '../types'

const LOAD_TIMEOUT_MS = 12_000

interface MountedOverlay {
  handle: AppHostHandle
  el: HTMLDivElement
  /** Fingerprint of what was mounted; a change remounts the band. */
  signature: string
}

/** The band pins to the edge the operator chose in the app's config. */
function positionOf(overlay: AppRenderable): 'top' | 'bottom' {
  return overlay.config.position === 'top' ? 'top' : 'bottom'
}

function signatureOf(overlay: AppRenderable): string {
  return JSON.stringify([overlay.slug, overlay.config, overlay.data ?? null])
}

/**
 * Persistent overlay apps (snapshot `overlays`, e.g. the ticker band): each
 * mounts the same sandboxed app-host iframe the rotation uses, but pinned to
 * the top or bottom edge of the stage, above every zone, for as long as the
 * snapshot carries it. Fully imperative (like the zone engines): the map of
 * mounted hosts is reconciled against the snapshot inside a signal effect, so
 * config/data edits remount only the band that changed. Overlays are always
 * muted — audio belongs to the rotation.
 */
export function OverlayLayer() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) {
      return undefined
    }
    const mounted = new Map<string, MountedOverlay>()

    const unmount = (id: string): void => {
      const entry = mounted.get(id)
      if (!entry) return
      entry.handle.dispose()
      entry.el.remove()
      mounted.delete(id)
    }

    const stop = effect(() => {
      const overlays = snapshot.value?.overlays ?? []
      const seen = new Set<string>()
      for (const overlay of overlays) {
        seen.add(overlay.id)
        const signature = signatureOf(overlay)
        const existing = mounted.get(overlay.id)
        if (existing && existing.signature === signature) {
          continue
        }
        unmount(overlay.id)

        const el = document.createElement('div')
        el.className = `player-overlay player-overlay--${positionOf(overlay)}`
        root.appendChild(el)
        const handle = mountAppHost(el, overlay, {
          appsBase: config.appsBase,
          timeoutMs: LOAD_TIMEOUT_MS,
        })
        // Reveal only once the app is live (the same readiness gating the
        // rotation gets), so a loading band never flashes a blank strip. A
        // failed load removes the strip; the next snapshot push retries it.
        el.dataset.ready = 'false'
        handle.ready
          .then(() => {
            el.dataset.ready = 'true'
          })
          .catch((error: unknown) => {
            if (mounted.get(overlay.id)?.handle === handle) {
              unmount(overlay.id)
            }
            if (navigator.onLine) {
              reportError(error)
            }
          })
        // Overlays are permanently active (their animations run) and muted.
        handle.setActive(true, true)
        mounted.set(overlay.id, { handle, el, signature })
      }
      for (const id of [...mounted.keys()]) {
        if (!seen.has(id)) {
          unmount(id)
        }
      }
    })

    return () => {
      stop()
      for (const id of [...mounted.keys()]) {
        unmount(id)
      }
    }
  }, [])

  return <div ref={ref} class="player-overlays" />
}
