import {
  APP_ACTIVE_TYPE,
  APP_CONFIG_TYPE,
  type AppDataMeta,
  isAppReadyMessage,
} from '@signagewall/apps-contract'

/**
 * CMS-side generic iframe app host — the live-preview counterpart of the
 * player's host (`apps/player/src/apps/host-bridge.ts`). It mounts the very same
 * embed bundle the player runs (`${appsBase}/<slug>/index.html`) and drives it
 * with the operator's *draft* config from the config form, so the preview is
 * pixel-identical to playback with zero per-app code.
 *
 * The wire protocol is the shared one in `@signagewall/apps-contract`:
 *   1. app → host:  `{ type: 'app-ready' }` once the bundle is listening.
 *   2. host → app:  `{ type: 'app-config', config, data, meta }`.
 *
 * Unlike the player host (which posts config once on readiness), this host
 * exposes {@link AppPreviewHandle.postConfig} so the caller can re-send on every
 * form edit; bundles re-render idempotently on each `app-config`.
 */

const IFRAME_ALLOW = 'autoplay; encrypted-media; fullscreen; picture-in-picture'

export interface AppPreviewHandle {
  /** The mounted iframe (already appended to the host element). */
  readonly iframe: HTMLIFrameElement
  /**
   * Push the latest config/data to the bundle. Buffered until the bundle posts
   * `app-ready`, then sent immediately; safe to call repeatedly (live edits).
   */
  postConfig(message: {
    config: Record<string, unknown>
    data?: unknown
    meta?: AppDataMeta | null
  }): void
  /**
   * Set the preview's mute state. The preview starts muted (a live preview is
   * never audible on its own); an operator can unmute to verify sound on
   * audio-capable apps (e.g. Live stream, YouTube). Re-sends `app-active` with
   * the new mute state once the bundle is ready.
   */
  setMuted(muted: boolean): void
  /** Detaches the listener and removes the iframe. */
  dispose(): void
}

export interface MountAppPreviewOptions {
  /** Base path/URL bundles are served from (`VITE_APPS_BASE`, default `/apps`). */
  appsBase: string
  /** App slug → `${appsBase}/<slug>/index.html`. */
  slug: string
}

/** Build the bundle URL for a slug under `appsBase`, trimming a trailing slash. */
export function appBundleUrl(appsBase: string, slug: string): string {
  const base = appsBase.replace(/\/+$/, '')
  return `${base}/${encodeURIComponent(slug)}/index.html`
}

/**
 * Resolve the origin a bundle URL loads from, for addressing the config
 * postMessage. Relative bases (`/apps`) are same-origin as the CMS. Falls back
 * to `'*'` only when the URL can't be parsed; the config carries no secrets, so
 * a wildcard fallback is acceptable.
 */
function targetOriginFor(bundleUrl: string): string {
  try {
    return new URL(bundleUrl, window.location.href).origin
  } catch {
    return '*'
  }
}

const DEFAULT_APP_SANDBOX = 'allow-scripts allow-same-origin'
const POWERPOINT_APP_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation'

function appSandbox(slug: string): string {
  return slug === 'powerpoint' ? POWERPOINT_APP_SANDBOX : DEFAULT_APP_SANDBOX
}

/**
 * Mounts the preview iframe for `slug` into `host` and wires the handshake.
 * Sandboxed `allow-scripts allow-same-origin` (the bundle is first-party,
 * same-origin); third-party content rendered *inside* an app (e.g. the `web`
 * app's inner iframe) stays isolated by the browser's cross-origin boundary.
 */
export function mountAppPreview(
  host: HTMLElement,
  options: MountAppPreviewOptions,
): AppPreviewHandle {
  const bundleUrl = appBundleUrl(options.appsBase, options.slug)
  const targetOrigin = targetOriginFor(bundleUrl)

  const iframe = document.createElement('iframe')
  iframe.title = options.slug
  iframe.className = 'size-full border-0'
  // Microsoft 365 viewer capabilities must also be granted by this ancestor:
  // nested frames inherit every sandbox restriction from their parents.
  iframe.setAttribute('sandbox', appSandbox(options.slug))
  // Mirrors the player's host (see `apps/player/src/apps/host-bridge.ts`): a
  // `no-referrer` here reaches the app's own subframes in WebKit, which is enough
  // to break the YouTube embed with its error 153 in a Safari preview.
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  iframe.setAttribute('allow', IFRAME_ALLOW)

  let ready = false
  // Preview starts muted; an operator can unmute to test audio-capable apps.
  let muted = true
  let pending: { config: Record<string, unknown>; data: unknown; meta: AppDataMeta | null } | null =
    null

  const sendActive = (): void => {
    iframe.contentWindow?.postMessage(
      { type: APP_ACTIVE_TYPE, active: true, muted },
      targetOrigin,
    )
  }

  const send = (payload: {
    config: Record<string, unknown>
    data: unknown
    meta: AppDataMeta | null
  }): void => {
    iframe.contentWindow?.postMessage(
      {
        type: APP_CONFIG_TYPE,
        config: payload.config,
        data: payload.data ?? null,
        meta: payload.meta ?? null,
      },
      targetOrigin,
    )
  }

  const onMessage = (event: MessageEvent): void => {
    // Accept readiness only from this iframe's window — never another frame.
    if (event.source !== iframe.contentWindow) {
      return
    }
    if (!isAppReadyMessage(event.data)) {
      return
    }
    ready = true
    if (pending) {
      send(pending)
      pending = null
    }
    // The previewed app is, by definition, the on-screen (active) item — unlike
    // the player there is no hidden preload here. Tell it so, so media apps
    // (e.g. YouTube, which gate playback on `app-active`) actually render. Starts
    // muted; the operator can unmute via {@link AppPreviewHandle.setMuted}.
    sendActive()
  }

  window.addEventListener('message', onMessage)
  iframe.src = bundleUrl
  host.appendChild(iframe)

  return {
    iframe,
    postConfig(message): void {
      const payload = {
        config: message.config,
        data: message.data ?? null,
        meta: message.meta ?? null,
      }
      // Send now if the bundle is listening; otherwise buffer the latest state
      // so the config lands the moment it announces `app-ready`.
      if (ready) {
        send(payload)
      } else {
        pending = payload
      }
    },
    setMuted(next): void {
      muted = next
      if (ready) {
        sendActive()
      }
    },
    dispose(): void {
      window.removeEventListener('message', onMessage)
      iframe.removeAttribute('src')
      iframe.remove()
    },
  }
}
