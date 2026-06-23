import { cloudEnv, requireEnv } from "@/features/media/cloud/lib/cloudEnv"
import { CloudPickerError } from "@/features/media/cloud/lib/cloudPickerError"
import { loadScript } from "@/features/media/cloud/lib/loadScript"

const GIS_SDK = "https://accounts.google.com/gsi/client"

interface CachedGoogleToken {
  token: string
  expiresAt: number
}

// Tokens are cached per scope so a provider can check (synchronously) whether
// it already has consent — letting it avoid a second popup in one gesture.
const tokenCache = new Map<string, CachedGoogleToken>()

/** Returns a still-valid cached token for the scope, or null. */
export function getCachedGoogleToken(scope: string): string | null {
  const entry = tokenCache.get(scope)
  if (entry && entry.expiresAt > Date.now() + 60_000) {
    return entry.token
  }
  return null
}

/**
 * Obtains a short-lived Google OAuth access token for the requested scope via
 * Google Identity Services (implicit token client). Opens a consent popup, so
 * call it from a user gesture. The token is cached and handed to the backend to
 * download the picked bytes, so it must not be revoked client-side.
 */
export async function getGoogleAccessToken(scope: string): Promise<string> {
  const cached = getCachedGoogleToken(scope)
  if (cached) {
    return cached
  }

  const clientId = requireEnv(cloudEnv.googleClientId)
  await loadScript(GIS_SDK)

  const oauth2 = window.google?.accounts.oauth2
  if (!oauth2) {
    throw new CloudPickerError("failed", "Google Identity Services unavailable")
  }

  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (response) => {
        if (response.access_token) {
          const ttlMs = (response.expires_in ?? 3600) * 1000
          tokenCache.set(scope, {
            token: response.access_token,
            expiresAt: Date.now() + ttlMs,
          })
          resolve(response.access_token)
        } else {
          reject(
            new CloudPickerError(
              "failed",
              response.error_description ?? response.error,
            ),
          )
        }
      },
      error_callback: (error) => {
        reject(
          new CloudPickerError(
            error.type === "popup_closed" ? "cancelled" : "failed",
          ),
        )
      },
    })
    client.requestAccessToken({ prompt: "" })
  })
}
