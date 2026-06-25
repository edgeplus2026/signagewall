import { CloudPickerError } from "@/features/media/cloud/lib/cloudPickerError"

/** Public picker credentials, provisioned per provider (see .env.example). */
export const cloudEnv = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  googleApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  googleAppId: import.meta.env.VITE_GOOGLE_APP_ID,
  msClientId: import.meta.env.VITE_MS_CLIENT_ID,
  msAuthority: import.meta.env.VITE_MS_AUTHORITY,
  msSharePointBase: import.meta.env.VITE_MS_SHAREPOINT_BASE,
  dropboxAppKey: import.meta.env.VITE_DROPBOX_APP_KEY,
} as const

/** Returns the value or throws a `not_configured` picker error. */
export function requireEnv(value: string | undefined): string {
  if (!value) {
    throw new CloudPickerError("not_configured")
  }
  return value
}
