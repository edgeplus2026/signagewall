import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge"

/*
 * Redirect target for MSAL popup auth (the Microsoft / OneDrive / SharePoint
 * sign-in popup lands here). MSAL v5 completes the popup flow via a
 * BroadcastChannel "redirect bridge": this page parses the auth response from
 * the URL and broadcasts it back to the opener, which lets acquireTokenPopup
 * resolve and closes the popup. Without this the popup would hang on a blank
 * page until it times out. Kept separate from the main app entry so the full
 * SPA never boots inside the popup.
 */
void broadcastResponseToMainFrame().catch((error: unknown) => {
  console.error("MSAL redirect bridge failed", error)
})
