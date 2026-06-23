// Ambient typings for the third-party picker SDKs loaded at runtime via
// `loadScript`. Narrow to only what the picker modules use.

interface GoogleTokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

interface GoogleTokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void
}

interface GoogleOAuth2 {
  initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: GoogleTokenResponse) => void
    error_callback?: (error: { type?: string }) => void
  }) => GoogleTokenClient
  revoke: (token: string, done?: () => void) => void
}

interface GooglePickerDocument {
  id: string
  name: string
  mimeType: string
  sizeBytes?: number
  url?: string
  [key: string]: unknown
}

interface GooglePickerResponse {
  action: string
  docs?: GooglePickerDocument[]
  [key: string]: unknown
}

interface GooglePickerInstance {
  setVisible: (visible: boolean) => void
}

interface GooglePickerDocsView {
  setIncludeFolders: (value: boolean) => GooglePickerDocsView
  setSelectFolderEnabled: (value: boolean) => GooglePickerDocsView
  setMimeTypes: (mimeTypes: string) => GooglePickerDocsView
}

interface GooglePickerBuilder {
  setAppId: (appId: string) => GooglePickerBuilder
  setOAuthToken: (token: string) => GooglePickerBuilder
  setDeveloperKey: (key: string) => GooglePickerBuilder
  addView: (view: GooglePickerDocsView) => GooglePickerBuilder
  enableFeature: (feature: string) => GooglePickerBuilder
  setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder
  setTitle: (title: string) => GooglePickerBuilder
  build: () => GooglePickerInstance
}

interface GooglePickerNamespace {
  PickerBuilder: new () => GooglePickerBuilder
  DocsView: new (viewId?: string) => GooglePickerDocsView
  ViewId: {
    DOCS_IMAGES_AND_VIDEOS: string
    DOCS_IMAGES: string
    DOCS_VIDEOS: string
  }
  Feature: { MULTISELECT_ENABLED: string }
  Action: { PICKED: string; CANCEL: string }
  Response: { ACTION: string; DOCUMENTS: string }
}

interface GoogleNamespace {
  accounts: { oauth2: GoogleOAuth2 }
  picker: GooglePickerNamespace
}

interface DropboxChooserFile {
  id: string
  name: string
  link: string
  bytes: number
  icon: string
  thumbnailLink?: string
  isDir: boolean
}

interface DropboxChooseOptions {
  success: (files: DropboxChooserFile[]) => void
  cancel?: () => void
  linkType?: "direct" | "preview"
  multiselect?: boolean
  extensions?: string[]
  folderselect?: boolean
}

interface DropboxChooser {
  choose: (options: DropboxChooseOptions) => void
}

interface Window {
  gapi?: { load: (moduleName: string, callback: () => void) => void }
  google?: GoogleNamespace
  Dropbox?: DropboxChooser
}
