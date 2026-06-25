import type { CloudPickResult } from "@/features/media/cloud/types/cloudPick.types"
import type { CloudImportItem } from "@/features/media/types/media.types"

/** Flattens an ergonomic picker result into the wire DTO the backend expects. */
export function toCloudImportItem(result: CloudPickResult): CloudImportItem {
  const base = {
    provider: result.provider,
    externalId: result.externalId,
    name: result.name,
    mimeType: result.mimeType,
    sizeBytes: result.sizeBytes,
    ...(result.width !== undefined ? { width: result.width } : {}),
    ...(result.height !== undefined ? { height: result.height } : {}),
  }

  switch (result.download.kind) {
    case "url":
      return {
        ...base,
        strategy: "url",
        downloadUrl: result.download.url,
        ...(result.download.authToken
          ? { authToken: result.download.authToken }
          : {}),
      }
    case "google_drive":
      return {
        ...base,
        strategy: "google-drive",
        fileId: result.download.fileId,
        accessToken: result.download.accessToken,
      }
    case "msgraph":
      return {
        ...base,
        strategy: "msgraph",
        endpoint: result.download.endpoint,
        driveId: result.download.driveId,
        itemId: result.download.itemId,
        accessToken: result.download.accessToken,
      }
  }
}
