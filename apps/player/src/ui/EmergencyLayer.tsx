import { effect } from '@preact/signals'
import { useEffect, useRef, useState } from 'preact/hooks'

import { type AppHostHandle, mountAppHost } from '../apps/host-bridge'
import { activeTakeover } from '../apps/takeover-apps'
import { config } from '../config'
import { reportError } from '../sentry'
import { recordPlay } from '../sync/playback-log'
import { orientation, snapshot } from '../store'
import type { AppRenderable } from '../types'

/**
 * How long the alert bundle gets to announce itself before the built-in fallback
 * takes the screen. Much shorter than the rotation's 12s: an evacuation notice
 * that arrives twelve seconds late has already failed, and unlike a content item
 * there is something useful to show instead.
 */
const LOAD_TIMEOUT_MS = 4_000

/**
 * The full-screen emergency layer.
 *
 * Deliberately NOT inside `Stage`. The ticker band lives there because it is
 * decoration on top of content, and it is fine for it to come and go with the
 * playback engine. An emergency message is the opposite: the moment it matters
 * most is the moment the rest of the player is least trustworthy, so it is
 * mounted as a sibling of every view and survives an engine that has crashed,
 * a rotation that is stuck, and a screen that is in standby.
 *
 * It carries its own orientation, for the same reason — a portrait screen must
 * show the notice the right way up without depending on the stage's root
 * element existing.
 */
export function EmergencyLayer() {
  const hostRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  /**
   * Set when the app bundle could not be mounted. Renders the plain fallback
   * below instead — see {@link Fallback}.
   */
  const [failed, setFailed] = useState(false)
  /** The alert being shown, mirrored into state so the fallback can read it. */
  const [alert, setAlert] = useState<AppRenderable | undefined>(undefined)

  useEffect(() => {
    const host = hostRef.current
    const root = rootRef.current
    if (!host || !root) {
      return undefined
    }

    let mounted: { handle: AppHostHandle; signature: string } | null = null

    /**
     * The takeover records its own airtime, because nothing else can.
     *
     * The playback engine is not running while this layer is up — that is the
     * whole point of it — so without this the hours an alert held the screen
     * arrive at the report as nothing at all, and the coverage matrix reads them
     * as "screen unreachable". That is precisely backwards: the screen was
     * working, and it was showing what it was told to. An advertiser asking why
     * their spot did not run for two hours on Tuesday is entitled to the real
     * answer, which is why the design counts a takeover rather than ignoring it.
     */
    let showing: { contentId: string; slug?: string; startedAt: number } | null =
      null

    const endTakeover = (): void => {
      const open = showing
      showing = null
      if (!open) {
        return
      }
      recordPlay({
        contentId: open.contentId,
        kind: 'app',
        ...(open.slug ? { slug: open.slug } : {}),
        startedAt: open.startedAt,
        endedAt: Date.now(),
      })
    }

    const beginTakeover = (overlay: AppRenderable): void => {
      const contentId = overlay.contentId ?? overlay.id
      if (showing?.contentId === contentId) {
        return
      }
      // A different alert replacing this one closes the first one's record
      // rather than merging the two.
      endTakeover()
      showing = {
        contentId,
        ...(overlay.slug ? { slug: overlay.slug } : {}),
        startedAt: Date.now(),
      }
    }

    const dispose = (): void => {
      mounted?.handle.dispose()
      mounted = null
      host.replaceChildren()
    }

    const stop = effect(() => {
      // Orientation is read here rather than in the render, so the layer rotates
      // without the imperatively-mounted iframe being torn down and rebuilt.
      root.dataset.orientation = orientation.value

      const overlay = activeTakeover(snapshot.value)
      setAlert(overlay)
      if (!overlay) {
        endTakeover()
        dispose()
        setFailed(false)
        return
      }

      // Started here rather than after the handshake: the fallback holds the
      // screen just as the bundle does, and an alert that took the screen for an
      // hour took it for an hour either way.
      beginTakeover(overlay)

      // A config edit while the alert is UP (fixing a typo mid-incident) should
      // change the words, not blink the screen — the handshake carries it.
      const signature = JSON.stringify([overlay.slug, overlay.id])
      if (mounted && mounted.signature === signature) {
        mounted.handle.setConfig(overlay)
        return
      }

      dispose()
      const handle = mountAppHost(host, overlay, {
        appsBase: config.appsBase,
        timeoutMs: LOAD_TIMEOUT_MS,
      })
      mounted = { handle, signature }
      host.dataset.ready = 'false'
      handle.ready
        .then(() => {
          host.dataset.ready = 'true'
          setFailed(false)
        })
        .catch((error: unknown) => {
          // Do NOT unmount and retry the way the ticker band does. The band can
          // afford to wait for the next snapshot push; this cannot. Show the
          // built-in message instead — it needs no bundle, no network and no
          // iframe, so it works in the cases that broke the bundle.
          if (mounted?.handle === handle) {
            setFailed(true)
            reportError(error, { layer: 'emergency', slug: overlay.slug })
          }
        })
    })

    return () => {
      stop()
      // Closes the record on the way out — an alert that is still up when the
      // page reloads at midnight would otherwise never be counted at all.
      endTakeover()
      dispose()
    }
  }, [])

  return (
    <div ref={rootRef} class="player-emergency" role="alert" aria-live="assertive">
      <div ref={hostRef} class="player-emergency__host" data-ready="false" />
      {failed && alert ? <Fallback alert={alert} /> : null}
    </div>
  )
}

/** Severity → background, mirroring the alert bundle's own palette. */
const SEVERITY_BG: Record<string, string> = {
  critical: '#B91C1C',
  warning: '#B45309',
  info: '#1D4ED8',
}

/**
 * The message rendered by the player itself, with no iframe involved.
 *
 * This exists because an emergency notice must not depend on a bundle loading.
 * Everything the polished version adds — the icon, the fitted type, the pulsing
 * edge — is worth having and worth losing: what cannot be lost is the words on
 * the screen. Plain markup, inline colours, no assets.
 */
function Fallback({ alert }: { alert: AppRenderable }) {
  const cfg = alert.config as {
    headline?: unknown
    message?: unknown
    severity?: unknown
  }
  const headline =
    typeof cfg.headline === 'string' && cfg.headline.trim()
      ? cfg.headline
      : 'Emergency'
  const message = typeof cfg.message === 'string' ? cfg.message.trim() : ''
  const background =
    SEVERITY_BG[String(cfg.severity)] ?? SEVERITY_BG.critical!

  return (
    <div class="player-emergency__fallback" style={{ background }}>
      <p class="player-emergency__headline">{headline}</p>
      {message ? <p class="player-emergency__message">{message}</p> : null}
    </div>
  )
}
