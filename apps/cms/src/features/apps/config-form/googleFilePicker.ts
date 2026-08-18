import { cloudEnv, requireEnv } from '@/features/media/cloud/lib/cloudEnv'
import { CloudPickerError } from '@/features/media/cloud/lib/cloudPickerError'
import { getGoogleAccessToken } from '@/features/media/cloud/lib/googleAuth'
import { loadGapiModule, loadScript } from '@/features/media/cloud/lib/loadScript'

const GAPI_SDK = 'https://apis.google.com/js/api.js'

/**
 * `drive.file` — non-sensitive, and per-file: the app may touch only what the
 * user picked here. It is what lets the connectors read a spreadsheet or a deck
 * without `drive.metadata.readonly`, whose only job was to list file names and
 * which would have pulled the whole project into an annual CASA assessment.
 */
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

/**
 * Drive MIME type per `remoteSource`. The same source names the backend browse
 * endpoints used, so a manifest keeps its `remoteSource` when it opts into the
 * picker and nothing downstream has to learn a second vocabulary.
 */
const MIME_BY_SOURCE: Record<string, string> = {
  'google-sheets': 'application/vnd.google-apps.spreadsheet',
  'google-presentations': 'application/vnd.google-apps.presentation',
}

/** What the picker returns, shaped like the stored `remote-select` value. */
export interface GooglePickedFile {
  id: string
  label: string
}

/** Whether this `remoteSource` can be satisfied by the Google Picker. */
export function supportsGooglePicker(source: string): boolean {
  return source in MIME_BY_SOURCE
}

/**
 * Opens the Google Picker on one file type and resolves with the chosen file.
 *
 * The access token is used only to open the picker. It is deliberately NOT sent
 * anywhere: picking a file grants the OAuth CLIENT lasting `drive.file` access
 * to it, so the backend reads it later with its own stored connection — which
 * only works because the browser and the backend share one `client_id`. Point
 * `VITE_GOOGLE_DRIVE_CLIENT_ID` at a different client and every pick will look
 * fine here and 404 on the server.
 *
 * Rejects with a `cancelled` {@link CloudPickerError} when the user closes it,
 * which callers are expected to swallow.
 */
export async function openGoogleFilePicker(
  source: string,
): Promise<GooglePickedFile> {
  const mimeType = MIME_BY_SOURCE[source]
  if (!mimeType) {
    throw new CloudPickerError('failed', `No Google picker for source "${source}"`)
  }

  const apiKey = requireEnv(cloudEnv.googleApiKey)

  await loadScript(GAPI_SDK)
  await loadGapiModule('picker')
  const accessToken = await getGoogleAccessToken(DRIVE_SCOPE)

  const picker = window.google?.picker
  if (!picker) {
    throw new CloudPickerError('failed', 'Google Picker unavailable')
  }

  return new Promise<GooglePickedFile>((resolve, reject) => {
    const view = new picker.DocsView()
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false)
      .setMimeTypes(mimeType)

    const builder = new picker.PickerBuilder()
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .addView(view)
      // Single file: the config field holds one id, and a multi-select picker
      // would silently drop everything after the first.
      .setCallback((data) => {
        if (data.action === picker.Action.PICKED) {
          const doc = data.docs?.[0]
          if (!doc) {
            reject(new CloudPickerError('failed', 'Picker returned no file'))
            return
          }
          resolve({ id: doc.id, label: doc.name })
        } else if (data.action === picker.Action.CANCEL) {
          reject(new CloudPickerError('cancelled'))
        }
      })

    if (cloudEnv.googleAppId) {
      builder.setAppId(cloudEnv.googleAppId)
    }

    builder.build().setVisible(true)
  })
}
