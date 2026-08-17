import { effect } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'

import { type AppHostHandle, mountAppHost } from '../apps/host-bridge'
import { isTakeoverOverlay } from '../apps/takeover-apps'
import { config } from '../config'
import { reportError } from '../sentry'
import { snapshot } from '../store'
import type { AppRenderable } from '../types'

const LOAD_TIMEOUT_MS = 12_000

interface MountedOverlay {
  handle: AppHostHandle
  el: HTMLDivElement
  /** Fingerprint of what was MOUNTED; a change rebuilds the band. */
  signature: string
  /** Fingerprint of the payload last handed over; a change re-configures it. */
  dataSignature: string
}

/** The band pins to the edge the operator chose in the app's config. */
function positionOf(overlay: AppRenderable): 'top' | 'bottom' {
  return overlay.config.position === 'top' ? 'top' : 'bottom'
}

/**
 * What forces a REBUILD: a different app, or a config edit (which can move the
 * band to the other edge, so the element itself has to change).
 *
 * `data` is deliberately not here. It used to be, which meant every RSS refresh
 * disposed the iframe and built a new one: the band disappeared and its scroll
 * restarted, every five minutes, for the whole life of the screen. A payload
 * change now travels over the handshake instead — see {@link dataSignatureOf}.
 */
function signatureOf(overlay: AppRenderable): string {
  return JSON.stringify([overlay.slug, overlay.config])
}

/** What forces a re-CONFIG: the connector payload, and its freshness. */
function dataSignatureOf(overlay: AppRenderable): string {
  return JSON.stringify([overlay.data ?? null, overlay.dataMeta ?? null])
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
      // Takeovers are overlays too, but they cover the whole screen and must
      // outlive the playback engine — so they are drawn by `EmergencyLayer`, a
      // sibling of every view, not as a band inside the stage.
      const overlays = (snapshot.value?.overlays ?? []).filter(
        (overlay) => !isTakeoverOverlay(overlay),
      )
      const seen = new Set<string>()
      for (const overlay of overlays) {
        seen.add(overlay.id)
        const signature = signatureOf(overlay)
        const dataSignature = dataSignatureOf(overlay)
        const existing = mounted.get(overlay.id)
        if (existing && existing.signature === signature) {
          // Same band, fresher payload: hand it over in place. The bundle is
          // required to re-render idempotently on a repeated `app-config`, so
          // the scroll and the animation carry on undisturbed.
          if (existing.dataSignature !== dataSignature) {
            existing.dataSignature = dataSignature
            existing.handle.setConfig(overlay)
          }
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
        mounted.set(overlay.id, { handle, el, signature, dataSignature })
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
