/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  // Cloud import picker credentials (public). See apps/cms/.env.example.
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_GOOGLE_API_KEY?: string
  readonly VITE_GOOGLE_APP_ID?: string
  readonly VITE_MS_CLIENT_ID?: string
  readonly VITE_MS_AUTHORITY?: string
  readonly VITE_MS_SHAREPOINT_BASE?: string
  readonly VITE_DROPBOX_APP_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
