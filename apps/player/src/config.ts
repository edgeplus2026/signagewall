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
} as const
