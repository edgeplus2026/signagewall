import { cloudEnv, requireEnv } from "@/features/media/cloud/lib/cloudEnv"
import { CloudPickerError } from "@/features/media/cloud/lib/cloudPickerError"
import { inferMimeType } from "@/features/media/cloud/lib/inferMimeType"
import { loadScript } from "@/features/media/cloud/lib/loadScript"
import type { CloudPickResult } from "@/features/media/cloud/types/cloudPick.types"

const DROPBOX_SDK = "https://www.dropbox.com/static/api/2/dropins.js"

/**
 * Opens the Dropbox Chooser. With `linkType: "direct"` each result carries a
 * direct (CORS-enabled) download URL the backend fetches server-side.
 *
 * Note: the Chooser opens a popup, so the SDK is preloaded on mount (see
 * CloudProviderCards) to keep this close to the user gesture.
 */
export async function openDropboxPicker(): Promise<CloudPickResult[]> {
  const appKey = requireEnv(cloudEnv.dropboxAppKey)
  await loadScript(DROPBOX_SDK, {
    attrs: { id: "dropboxjs", "data-app-key": appKey },
  })

  const chooser = window.Dropbox
  if (!chooser) {
    throw new CloudPickerError("failed", "Dropbox Chooser unavailable")
  }

  return new Promise<CloudPickResult[]>((resolve, reject) => {
    chooser.choose({
      linkType: "direct",
      multiselect: true,
      extensions: ["images", "video"],
      success: (files) => {
        resolve(
          files
            .filter((file) => !file.isDir)
            .map((file) => ({
              provider: "dropbox",
              externalId: file.id,
              name: file.name,
              mimeType: inferMimeType(file.name),
              sizeBytes: file.bytes,
              ...(file.thumbnailLink
                ? { thumbnailUrl: file.thumbnailLink }
                : {}),
              download: { kind: "url", url: file.link },
            })),
        )
      },
      cancel: () => {
        reject(new CloudPickerError("cancelled"))
      },
    })
  })
}
