import { cloudEnv, requireEnv } from "@/features/media/cloud/lib/cloudEnv"
import { CloudPickerError } from "@/features/media/cloud/lib/cloudPickerError"
import { getGoogleAccessToken } from "@/features/media/cloud/lib/googleAuth"
import { loadGapiModule, loadScript } from "@/features/media/cloud/lib/loadScript"
import type { CloudPickResult } from "@/features/media/cloud/types/cloudPick.types"

const GAPI_SDK = "https://apis.google.com/js/api.js"
// drive.file is non-sensitive (no CASA audit): grants access only to the files
// the user explicitly picks.
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"

/**
 * Opens the Google Picker scoped to images & videos. Each result carries the
 * Drive fileId plus the access token; the backend downloads via
 * files/{id}?alt=media. The token is intentionally not revoked here — the
 * backend needs it when the user commits the upload.
 */
export async function openGoogleDrivePicker(): Promise<CloudPickResult[]> {
  const apiKey = requireEnv(cloudEnv.googleApiKey)

  await loadScript(GAPI_SDK)
  await loadGapiModule("picker")
  const accessToken = await getGoogleAccessToken(DRIVE_SCOPE)

  const picker = window.google?.picker
  if (!picker) {
    throw new CloudPickerError("failed", "Google Picker unavailable")
  }

  return new Promise<CloudPickResult[]>((resolve, reject) => {
    const view = new picker.DocsView(picker.ViewId.DOCS_IMAGES_AND_VIDEOS)
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false)

    const builder = new picker.PickerBuilder()
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .addView(view)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .setCallback((data) => {
        if (data.action === picker.Action.PICKED) {
          const docs = data.docs ?? []
          resolve(
            docs.map((doc) => ({
              provider: "google_drive",
              externalId: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              sizeBytes: doc.sizeBytes ?? 0,
              download: {
                kind: "google_drive",
                fileId: doc.id,
                accessToken,
              },
            })),
          )
        } else if (data.action === picker.Action.CANCEL) {
          reject(new CloudPickerError("cancelled"))
        }
      })

    if (cloudEnv.googleAppId) {
      builder.setAppId(cloudEnv.googleAppId)
    }

    builder.build().setVisible(true)
  })
}
