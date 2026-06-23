import type { PublicClientApplication as Msal } from "@azure/msal-browser"

import { cloudEnv, requireEnv } from "@/features/media/cloud/lib/cloudEnv"

// Single shared MSAL instance — creating one per click leaks
// `interaction_in_progress` state across attempts.
let msalPromise: Promise<Msal> | null = null

function getMsal(): Promise<Msal> {
  msalPromise ??= (async () => {
    const clientId = requireEnv(cloudEnv.msClientId)
    const authority =
      cloudEnv.msAuthority ?? "https://login.microsoftonline.com/common"
    const { PublicClientApplication } = await import("@azure/msal-browser")
    const instance = new PublicClientApplication({
      auth: {
        clientId,
        authority,
        // Dedicated page that runs MSAL's redirect bridge so the login popup
        // completes (see msal.html / src/msal-redirect.ts).
        redirectUri: `${window.location.origin}/msal.html`,
      },
      cache: { cacheLocation: "localStorage" },
    })
    await instance.initialize()
    return instance
  })().catch((error: unknown) => {
    msalPromise = null // don't cache a failed init
    throw error
  })
  return msalPromise
}

/**
 * Returns a Microsoft Graph access token via the OAuth 2.0 authorization-code
 * flow with PKCE (MSAL). Tries silently first, then a single interactive login
 * popup — so this MUST be called from a user gesture. Browsing afterwards is
 * plain Graph REST (no further popups), which keeps us to one popup per click.
 */
export async function getGraphToken(scopes: string[]): Promise<string> {
  const msal = await getMsal()
  const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0]
  if (account) {
    try {
      const result = await msal.acquireTokenSilent({ scopes, account })
      msal.setActiveAccount(result.account)
      return result.accessToken
    } catch {
      // fall through to interactive login
    }
  }
  const result = await msal.acquireTokenPopup({ scopes })
  msal.setActiveAccount(result.account)
  return result.accessToken
}

/** True when an MSAL error represents the user closing/cancelling the popup. */
export function isUserCancellation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "errorCode" in error &&
    (error as { errorCode?: string }).errorCode === "user_cancelled"
  )
}
