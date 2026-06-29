import type { AppRenderable } from '../types'

/**
 * Generic iframe app host (player side of the player ↔ app handshake).
 *
 * Every app — first or third party — is a self-contained web bundle served at
 * `${appsBase}/<slug>/index.html`. The player has no per-app code: it mounts a
 * sandboxed iframe, waits for the bundle to announce itself, then hands it the
 * instance config + connector payload over `postMessage`. This mirrors the
 * preview-token handshake in `../sync/preview-handshake.ts`:
 *
 *   1. app → host:  `{ type: 'app-ready' }` once the bundle is listening.
 *   2. host → app:  `{ type: 'app-config', config, data, meta }` addressed to
 *      the app's origin only (`meta` carries server-app data freshness).
 *
 * The returned `ready` promise resolves on `app-ready` and rejects on load
 * timeout or iframe error, so the engine can gate the on-screen swap on the app
 * actually being live (same readiness contract as image/video prepare).
 */

const READY_TYPE = 'app-ready'
const CONFIG_TYPE = 'app-config'

interface AppReadyMessage {
  type: typeof READY_TYPE
}

function isReadyMessage(data: unknown): data is AppReadyMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === READY_TYPE
  )
}

export interface AppHostHandle {
  /** The mounted iframe (already appended to the host element). */
  readonly iframe: HTMLIFrameElement
  /** Resolves once the app posts `app-ready`; rejects on timeout / load error. */
  readonly ready: Promise<void>
  /** Detaches the listener, clears the timeout and removes the iframe. */
  dispose(): void
}

export interface MountAppHostOptions {
  /** Base path/URL bundles are served from (`config.appsBase`). */
  appsBase: string
  /** Reject `ready` if the app hasn't announced itself within this window. */
  timeoutMs: number
}

/** `autoplay`/media permissions granted to the app iframe (mirrors the old YouTube embed). */
const IFRAME_ALLOW = 'autoplay; encrypted-media; fullscreen; picture-in-picture'

/** Build the bundle URL for a slug under `appsBase`, trimming a trailing slash. */
export function appBundleUrl(appsBase: string, slug: string): string {
  const base = appsBase.replace(/\/+$/, '')
  return `${base}/${encodeURIComponent(slug)}/index.html`
}

/**
 * Resolve the origin a bundle URL loads from, for addressing the config
 * postMessage. Relative bases (`/apps`) are same-origin as the player. Returns
 * `'*'` only if the URL can't be parsed (e.g. in a non-browser test shim) —
 * the config carries no secrets, so a wildcard fallback is acceptable.
 */
function targetOriginFor(bundleUrl: string): string {
  try {
    return new URL(bundleUrl, window.location.href).origin
  } catch {
    return '*'
  }
}

/**
 * Mounts the app for `item` into `host` and runs the readiness handshake.
 * The iframe is sandboxed: `allow-scripts` to run the bundle and
 * `allow-same-origin` so the (first-party, same-origin) bundle can load its own
 * assets. Third-party content rendered *inside* the app (e.g. the `web` app's
 * inner iframe) stays isolated by the browser's cross-origin boundary.
 */
export function mountAppHost(
  host: HTMLElement,
  item: AppRenderable,
  options: MountAppHostOptions,
): AppHostHandle {
  const bundleUrl = appBundleUrl(options.appsBase, item.slug)
  const targetOrigin = targetOriginFor(bundleUrl)

  const iframe = document.createElement('iframe')
  iframe.className = 'player-media'
  iframe.title = item.slug
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
  iframe.setAttribute('referrerpolicy', 'no-referrer')
  iframe.setAttribute('allow', IFRAME_ALLOW)

  let settled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let onMessage: ((event: MessageEvent) => void) | undefined
  let onError: (() => void) | undefined
  let rejectReady: ((error: Error) => void) | undefined

  const cleanupListeners = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    if (onMessage) {
      window.removeEventListener('message', onMessage)
      onMessage = undefined
    }
    if (onError) {
      iframe.removeEventListener('error', onError)
      onError = undefined
    }
  }

  const ready = new Promise<void>((resolve, reject) => {
    rejectReady = reject
    onMessage = (event: MessageEvent): void => {
      // Accept readiness only from this iframe's window — never another frame.
      if (event.source !== iframe.contentWindow) {
        return
      }
      if (!isReadyMessage(event.data)) {
        return
      }
      settled = true
      cleanupListeners()
      // Hand over config + payload, addressed to the app's origin only.
      iframe.contentWindow?.postMessage(
        {
          type: CONFIG_TYPE,
          config: item.config,
          data: item.data ?? null,
          meta: item.dataMeta ?? null,
        },
        targetOrigin,
      )
      resolve()
    }

    onError = (): void => {
      if (settled) return
      settled = true
      cleanupListeners()
      reject(new Error(`app load error: ${item.slug}`))
    }

    timer = setTimeout(() => {
      if (settled) return
      settled = true
      cleanupListeners()
      reject(new Error(`app load timeout: ${item.slug}`))
    }, options.timeoutMs)

    window.addEventListener('message', onMessage)
    iframe.addEventListener('error', onError)
  })

  iframe.src = bundleUrl
  host.appendChild(iframe)

  return {
    iframe,
    ready,
    dispose(): void {
      // Settle a still-pending `ready` so a superseded/torn-down load never
      // leaves the awaiting `prepare()` hanging (image/video resolve the same
      // way on supersession). A no-op once already resolved/rejected.
      if (!settled) {
        settled = true
        rejectReady?.(new Error(`app disposed: ${item.slug}`))
      }
      cleanupListeners()
      iframe.removeAttribute('src')
      iframe.remove()
    },
  }
}
