/**
 * Normalized OneDrive payload — shared contract between the backend `onedrive`
 * connector and the embed bundle. The connector resolves a short-lived,
 * pre-authenticated URL (the player never sees the access token); the bundle
 * renders it as an image or in an iframe based on the file kind.
 */
export interface OneDrivePayload {
  name: string
  /** Short-lived URL the player can load directly (no auth header needed). */
  url: string
  /** Coarse render kind chosen from the file's mime type. */
  kind: 'image' | 'embed'
  fetchedAt: string
}
