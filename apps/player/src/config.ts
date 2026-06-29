/** Runtime configuration, read once from Vite env. */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  wsUrl: import.meta.env.VITE_WS_URL ?? 'http://localhost:3000',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  appVersion: __APP_VERSION__,
  /**
   * Origin of the CMS that embeds this player as a preview. When set, the
   * preview postMessage handshake only accepts the operator token from this
   * origin (defense in depth on top of the `event.source === parent` check).
   */
  cmsOrigin: import.meta.env.VITE_CMS_ORIGIN ?? '',
  /**
   * Base path/URL the generic app host loads embed bundles from, as
   * `${appsBase}/<slug>/index.html`. Same-origin under `/apps` by default (the
   * bundles are built into the player's static dir); override to point at a
   * dedicated apps origin if 3rd-party apps are ever hosted separately.
   */
  appsBase: import.meta.env.VITE_APPS_BASE ?? '/apps',
} as const
