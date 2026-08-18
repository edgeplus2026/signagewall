/** Cloud providers a user can import media from. */
export type CloudProvider = "google_drive" | "onedrive" | "dropbox"

/**
 * Tells the backend how to fetch the raw bytes for one picked item. Carries
 * exactly what each provider's server-side download needs — never dereferenced
 * on the client.
 */
export type CloudDownload =
  // A direct/temporary provider link (Dropbox). Backend GETs the URL; the
  // optional bearer token exists for links that need one.
  | { kind: "url"; url: string; authToken?: string }
  // Google Drive — backend builds the googleapis URL and GETs it with the token.
  | { kind: "google_drive"; fileId: string; accessToken: string }
  // OneDrive — backend resolves @microsoft.graph.downloadUrl, GETs.
  | {
      kind: "msgraph"
      endpoint: string
      driveId: string
      itemId: string
      accessToken: string
    }

/** Normalized result a picker produces per selected item. */
export interface CloudPickResult {
  provider: CloudProvider
  externalId: string
  name: string
  mimeType: string
  /** 0 when the provider does not report a size. */
  sizeBytes: number
  width?: number
  height?: number
  /** Provider thumbnail for display only; may be short-lived. */
  thumbnailUrl?: string
  download: CloudDownload
}

/** A picker module: opens the provider UI and resolves the user's selection. */
export interface CloudPicker {
  openPicker: () => Promise<CloudPickResult[]>
}
