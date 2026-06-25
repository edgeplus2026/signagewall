import { inferMimeType } from "@/features/media/cloud/lib/inferMimeType"
import type { CloudPickResult } from "@/features/media/cloud/types/cloudPick.types"

const GRAPH = "https://graph.microsoft.com/v1.0"

/**
 * Delegated Graph scope. `Files.Read` works the same for personal Microsoft
 * accounts and work/school (business) accounts — both browse via `/me/drive`,
 * so a single flow covers both with no tenant-specific configuration.
 */
export const GRAPH_SCOPES = ["Files.Read"]

export interface GraphDriveItem {
  id: string
  name: string
  size?: number
  folder?: { childCount?: number }
  file?: { mimeType?: string }
  image?: { width?: number; height?: number }
  video?: { width?: number; height?: number }
  parentReference?: { driveId?: string }
  thumbnails?: { medium?: { url?: string } }[]
}

interface GraphChildrenResponse {
  value: GraphDriveItem[]
  "@odata.nextLink"?: string
}

async function graphGet<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error(
      `Microsoft Graph request failed (${String(response.status)})`,
    )
  }
  return (await response.json()) as T
}

function childrenUrl(folderId: string | null): string {
  const base = `${GRAPH}/me/drive`
  const path = folderId
    ? `/items/${encodeURIComponent(folderId)}/children`
    : "/root/children"
  const query =
    "?$top=200&$expand=thumbnails($select=medium)" +
    "&$select=id,name,size,folder,file,image,video,parentReference"
  return `${base}${path}${query}`
}

/** Lists a folder's children (paging through all results). */
export async function listChildren(
  token: string,
  folderId: string | null,
): Promise<GraphDriveItem[]> {
  const items: GraphDriveItem[] = []
  let nextUrl: string | undefined = childrenUrl(folderId)
  while (nextUrl) {
    const page: GraphChildrenResponse = await graphGet<GraphChildrenResponse>(
      nextUrl,
      token,
    )
    items.push(...page.value)
    nextUrl = page["@odata.nextLink"]
  }
  return items
}

/** Whether a drive item is a selectable image/video (not a folder). */
export function isMediaItem(item: GraphDriveItem): boolean {
  if (item.folder) return false
  const mime = item.file?.mimeType ?? inferMimeType(item.name)
  return mime.startsWith("image/") || mime.startsWith("video/")
}

/**
 * Maps a Graph drive item to the normalized pick. The backend re-resolves a
 * fresh @microsoft.graph.downloadUrl from driveId/itemId with this token, so
 * the download survives staging delays (msgraph strategy).
 */
export function toCloudPick(
  item: GraphDriveItem,
  token: string,
): CloudPickResult {
  const dimensions = item.image ?? item.video
  const thumbnailUrl = item.thumbnails?.[0]?.medium?.url
  return {
    provider: "onedrive",
    externalId: item.id,
    name: item.name,
    mimeType: item.file?.mimeType ?? inferMimeType(item.name),
    sizeBytes: item.size ?? 0,
    ...(dimensions?.width ? { width: dimensions.width } : {}),
    ...(dimensions?.height ? { height: dimensions.height } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    download: {
      kind: "msgraph",
      endpoint: GRAPH,
      driveId: item.parentReference?.driveId ?? "",
      itemId: item.id,
      accessToken: token,
    },
  }
}
