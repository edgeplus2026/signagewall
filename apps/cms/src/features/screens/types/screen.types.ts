export type ScreenViewMode = 'grid' | 'list'

export type ScreenSortField = 'name' | 'createdAt' | 'status'

export type ScreenSortDirection = 'asc' | 'desc'

export type ScreenStatusFilter = 'all' | 'online' | 'offline'

export type ScreenItemType = 'media' | 'playlist' | 'app'

export type ScreenManageTab = 'content' | 'device' | 'settings' | 'availability'

export interface ScreenDeviceProfile {
  platform?: string
  userAgent?: string
  appVersion?: string
  screenWidth?: number
  screenHeight?: number
}

/** How the player rotates its output relative to the physical display. */
export type ScreenDeviceOrientation =
  | 'landscape'
  | 'landscape-flipped'
  | 'portrait'
  | 'portrait-flipped'

/** How content fits the screen (maps to CSS object-fit on the player). */
export type ScreenDeviceScale = 'none' | 'fit' | 'stretch' | 'zoom'

export interface DailyReloadSetting {
  enabled: boolean
  /** 24h 'HH:mm' in the device's local timezone. */
  time: string
}

/** Display + power settings of the bound device. */
export interface ScreenDeviceSettings {
  orientation: ScreenDeviceOrientation
  scale: ScreenDeviceScale
  dailyReload: DailyReloadSetting
}

/** Fallback used when a device has no persisted settings yet. */
export const DEFAULT_DEVICE_SETTINGS: ScreenDeviceSettings = {
  orientation: 'landscape',
  scale: 'fit',
  dailyReload: { enabled: true, time: '03:00' },
}

/** Pairing/online status of the physical display bound 1:1 to this screen. */
export interface ScreenDevice {
  paired: boolean
  online: boolean
  deviceId?: string
  lastSeenAt?: string
  profile?: ScreenDeviceProfile
  /** Playback volume 0–100. */
  volume?: number
  /** Display + power settings. */
  settings?: ScreenDeviceSettings
}

export interface PairDeviceRequest {
  code: string
}

export interface SetDeviceDailyReloadRequest {
  enabled: boolean
  time: string
}

export type ScreenAvailabilityMode = 'always' | 'weekly' | 'special'

export type WeekdayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface WeeklyDayHours {
  day: WeekdayKey
  enabled: boolean
  start: string
  end: string
}

export interface SpecialAvailabilityWindow {
  startDate: string
  endDate: string
  start: string
  end: string
}

export interface ScreenAvailability {
  mode: ScreenAvailabilityMode
  /** IANA timezone, e.g. 'Europe/Belgrade'. Working hours are local to this. */
  timezone: string
  weekly: WeeklyDayHours[]
  special: SpecialAvailabilityWindow
}

export type UpdateScreenAvailabilityRequest = ScreenAvailability

export interface ScreenAvailabilityStatus {
  isOn: boolean
  mode: ScreenAvailabilityMode
  timezone: string
  currentWindow?: { start: string; end: string }
  nextTransition?: { at: string; to: 'on' | 'off' }
}

export interface ScreenItem {
  id: string
  type: ScreenItemType
  mediaId?: string
  playlistId?: string
  appInstanceId?: string
  order: number
  duration?: number
  disabled?: boolean
}

export interface ScreenSummary {
  id: string
  name: string
  itemCount: number
  totalDuration: number
  thumbnailUrl?: string
  createdAt: string
  updatedAt: string
}

export interface ScreenDetail extends ScreenSummary {
  description?: string
}

export type Screen = ScreenDetail & {
  items: ScreenItem[]
}

export interface CreateScreenRequest {
  name: string
  description?: string
}

export interface UpdateScreenRequest {
  name?: string
  description?: string
}

export interface ReplaceScreenItemInput {
  id?: string
  type: ScreenItemType
  mediaId?: string
  playlistId?: string
  appInstanceId?: string
  duration?: number
  disabled?: boolean
}

export interface ReplaceScreenItemsRequest {
  items: ReplaceScreenItemInput[]
  /** The `updatedAt` last observed by the client, for lost-update protection. */
  expectedUpdatedAt?: string
}

export interface AddMediaToScreensRequest {
  screenIds: string[]
  mediaIds: string[]
}

export interface AddPlaylistsToScreensRequest {
  screenIds: string[]
  playlistIds: string[]
}
