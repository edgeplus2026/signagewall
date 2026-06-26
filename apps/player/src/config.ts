/** Runtime configuration, read once from Vite env. */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  wsUrl: import.meta.env.VITE_WS_URL ?? 'http://localhost:3000',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  appVersion: __APP_VERSION__,
} as const
