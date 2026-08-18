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

interface GoogleTokenOptions {
  /**
   * GIS `prompt`. Default `""` reuses the signed-in account silently.
   * `"consent"` forces the grant dialog so a scope the user has not granted yet
   * is actually shown — without it they can end up holding a token that lacks
   * it, and the picker bounces with "connect again".
   */
  prompt?: "" | "consent" | "select_account"
  /** Skip the cache so a fresh consent/selection always takes effect. */
  skipCache?: boolean
  /** Pre-select this account email so token and picker tab share an identity. */
  loginHint?: string
  /**
   * Scope that MUST appear in the granted set, else reject. Catches the case
   * where the user proceeds without granting a sensitive scope.
   */
  requireGrantedScope?: string
}

/**
 * Obtains a short-lived Google OAuth access token for the requested scope via
 * Google Identity Services (implicit token client). Opens a consent popup, so
 * call it from a user gesture. The token is cached and handed to the backend to
 * download the picked bytes, so it must not be revoked client-side.
 */
export async function getGoogleAccessToken(
  scope: string,
  options: GoogleTokenOptions = {},
): Promise<string> {
  if (!options.skipCache) {
    const cached = getCachedGoogleToken(scope)
    if (cached) {
      return cached
    }
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
      ...(options.loginHint ? { login_hint: options.loginHint } : {}),
      enable_serial_consent: true,
      callback: (response) => {
        if (response.access_token) {
          // A token can come back without a sensitive scope being granted —
          // surface that clearly instead of letting the picker fail cryptically.
          if (
            options.requireGrantedScope &&
            !hasScope(response.scope, options.requireGrantedScope)
          ) {
            reject(
              new CloudPickerError(
                "failed",
                `Required permission not granted: ${options.requireGrantedScope}`,
              ),
            )
            return
          }
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
    client.requestAccessToken({
      prompt: options.prompt ?? "",
      ...(options.loginHint ? { hint: options.loginHint } : {}),
    })
  })
}

/** Whether `granted` (GIS space-delimited scope string) includes `scope`. */
function hasScope(granted: string | undefined, scope: string): boolean {
  if (!granted) return false
  return granted.split(" ").includes(scope)
}
