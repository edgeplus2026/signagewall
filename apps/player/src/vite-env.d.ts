/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_WS_URL?: string
  readonly VITE_SENTRY_DSN?: string
  /**
   * Share of SCREENS that report errors, 0–1. Defaults to 1 (all of them). Turn
   * it down only once the fleet is large enough that one fault produces hundreds
   * of identical events — see `sentry.ts`.
   */
  readonly VITE_SENTRY_SAMPLE_RATE?: string
  readonly VITE_CMS_ORIGIN?: string
  readonly VITE_APPS_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
