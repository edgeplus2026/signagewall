import type {
  AddAppsToScreensRequest,
  AddMediaToScreensRequest,
  AddPlaylistsToScreensRequest,
  CreateScreenRequest,
  PairDeviceRequest,
  ReplaceScreenItemsRequest,
  Screen,
  ScreenAvailability,
  ScreenAvailabilityStatus,
  ScreenDetail,
  ScreenDevice,
  ScreenDeviceKioskMode,
  ScreenDeviceOrientation,
  ScreenDeviceScale,
  ScreenItem,
  ScreenSummary,
  SetDeviceDailyReloadRequest,
  UpdateScreenAvailabilityRequest,
  UpdateScreenRequest,
} from '@/features/screens/types/screen.types'
import { ApiError } from '@/lib/api-error'
import { api } from '@/lib/axios'

const SCREENS_BASE = '/screens'

export const screensApi = {
  list: async (): Promise<ScreenSummary[]> => {
    const { data } = await api.get<ScreenSummary[]>(SCREENS_BASE)
    return data
  },

  get: async (id: string): Promise<ScreenDetail | null> => {
    try {
      const { data } = await api.get<ScreenDetail>(`${SCREENS_BASE}/${id}`)
      return data
    } catch (error) {
      // The axios interceptor normalizes errors to ApiError before they reach
      // here, so match on the error code rather than the raw HTTP response.
      if (error instanceof ApiError && error.code === 'NOT_FOUND') {
        return null
      }
      throw error
    }
  },

  getItems: async (id: string): Promise<ScreenItem[]> => {
    const { data } = await api.get<ScreenItem[]>(`${SCREENS_BASE}/${id}/items`)
    return data
  },

  create: async (payload: CreateScreenRequest): Promise<ScreenDetail> => {
    const { data } = await api.post<ScreenDetail>(SCREENS_BASE, payload)
    return data
  },

  update: async (id: string, payload: UpdateScreenRequest): Promise<ScreenDetail> => {
    const { data } = await api.patch<ScreenDetail>(`${SCREENS_BASE}/${id}`, payload)
    return data
  },

  getAvailability: async (id: string): Promise<ScreenAvailability | null> => {
    const { data } = await api.get<ScreenAvailability | null>(
      `${SCREENS_BASE}/${id}/availability`,
    )
    return data
  },

  updateAvailability: async (
    id: string,
    payload: UpdateScreenAvailabilityRequest,
  ): Promise<ScreenAvailability> => {
    const { data } = await api.patch<ScreenAvailability>(
      `${SCREENS_BASE}/${id}/availability`,
      payload,
    )
    return data
  },

  getStatus: async (id: string): Promise<ScreenAvailabilityStatus> => {
    const { data } = await api.get<ScreenAvailabilityStatus>(`${SCREENS_BASE}/${id}/status`)
    return data
  },

  delete: async (ids: string[]): Promise<void> => {
    await api.post(`${SCREENS_BASE}/delete`, { ids })
  },

  replaceItems: async (id: string, payload: ReplaceScreenItemsRequest): Promise<Screen> => {
    const { data } = await api.put<Screen>(`${SCREENS_BASE}/${id}/items`, payload)
    return data
  },

  addMedia: async (payload: AddMediaToScreensRequest): Promise<void> => {
    await api.post(`${SCREENS_BASE}/add-media`, payload)
  },

  addPlaylists: async (payload: AddPlaylistsToScreensRequest): Promise<void> => {
    await api.post(`${SCREENS_BASE}/add-playlists`, payload)
  },

  addApps: async (payload: AddAppsToScreensRequest): Promise<void> => {
    await api.post(`${SCREENS_BASE}/add-apps`, payload)
  },

  getDevice: async (id: string): Promise<ScreenDevice> => {
    const { data } = await api.get<ScreenDevice>(`${SCREENS_BASE}/${id}/device`)
    return data
  },

  /** Presence for every paired device in the org, keyed by screen id. */
  listDevicePresence: async (): Promise<Record<string, ScreenDevice>> => {
    const { data } = await api.get<Record<string, ScreenDevice>>(
      `${SCREENS_BASE}/devices/presence`,
    )
    return data
  },

  pairDevice: async (id: string, payload: PairDeviceRequest): Promise<ScreenDevice> => {
    const { data } = await api.post<ScreenDevice>(`${SCREENS_BASE}/${id}/pair`, payload)
    return data
  },

  unpairDevice: async (id: string): Promise<void> => {
    await api.delete(`${SCREENS_BASE}/${id}/device`)
  },

  setDeviceVolume: async (id: string, volume: number): Promise<ScreenDevice> => {
    const { data } = await api.patch<ScreenDevice>(
      `${SCREENS_BASE}/${id}/device/volume`,
      { volume },
    )
    return data
  },

  setDeviceOrientation: async (
    id: string,
    orientation: ScreenDeviceOrientation,
  ): Promise<ScreenDevice> => {
    const { data } = await api.patch<ScreenDevice>(
      `${SCREENS_BASE}/${id}/device/orientation`,
      { orientation },
    )
    return data
  },

  setDeviceScale: async (
    id: string,
    scale: ScreenDeviceScale,
  ): Promise<ScreenDevice> => {
    const { data } = await api.patch<ScreenDevice>(
      `${SCREENS_BASE}/${id}/device/scale`,
      { scale },
    )
    return data
  },

  setDeviceKioskMode: async (
    id: string,
    kioskMode: ScreenDeviceKioskMode,
  ): Promise<ScreenDevice> => {
    const { data } = await api.patch<ScreenDevice>(
      `${SCREENS_BASE}/${id}/device/kiosk-mode`,
      { kioskMode },
    )
    return data
  },

  setDeviceDailyReload: async (
    id: string,
    payload: SetDeviceDailyReloadRequest,
  ): Promise<ScreenDevice> => {
    const { data } = await api.patch<ScreenDevice>(
      `${SCREENS_BASE}/${id}/device/daily-reload`,
      payload,
    )
    return data
  },

  restartDevice: async (id: string): Promise<void> => {
    await api.post(`${SCREENS_BASE}/${id}/device/restart`)
  },

  stepDevice: async (id: string, direction: 'next' | 'prev'): Promise<void> => {
    await api.post(`${SCREENS_BASE}/${id}/device/step`, { direction })
  },
}

export { SCREENS_BASE }
