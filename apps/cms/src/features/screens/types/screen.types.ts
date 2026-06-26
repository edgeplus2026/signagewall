export type ScreenViewMode = 'grid' | 'list'

export type ScreenSortField = 'name' | 'createdAt'

export type ScreenSortDirection = 'asc' | 'desc'

export type ScreenItemType = 'media' | 'playlist' | 'app'

export type ScreenManageTab = 'content' | 'device' | 'settings' | 'availability'

export interface ScreenDeviceProfile {
  platform?: string
  userAgent?: string
  appVersion?: string
  screenWidth?: number
  screenHeight?: number
}

/** Pairing/online status of the physical display bound 1:1 to this screen. */
export interface ScreenDevice {
  paired: boolean
  online: boolean
  deviceId?: string
  lastSeenAt?: string
  profile?: ScreenDeviceProfile
}

export interface PairDeviceRequest {
  code: string
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
