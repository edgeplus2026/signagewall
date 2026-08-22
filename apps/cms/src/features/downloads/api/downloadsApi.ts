import { api } from '@/lib/axios'

/** The player build currently on the release channel. */
export interface AndroidRelease {
  versionName: string
  versionCode: number
  url: string
  size?: number
  sha256?: string
  publishedAt?: string
}

export const downloadsApi = {
  /**
   * Asked of our own API rather than of the release bucket directly: the bucket is
   * public but sends no CORS headers, so the browser cannot read the manifest that
   * says which build is current.
   */
  androidRelease: async (): Promise<AndroidRelease | null> => {
    const { data } = await api.get<AndroidRelease | null>('/player/release/android')
    return data ?? null
  },
}
