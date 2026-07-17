import {
  DEFAULT_DAILY_RELOAD,
  DEFAULT_ORIENTATION,
  DEFAULT_SCALE,
  type DailyReloadSetting,
  type DeviceOrientation,
  type DeviceScale,
  type DeviceSettings,
  type DeviceUpdateStatus,
  type PlayerRuntime,
} from '@edge/player-contract'

export type ScreenViewMode = 'grid' | 'list'

export type ScreenSortField = 'name' | 'createdAt' | 'status'

export type ScreenSortDirection = 'asc' | 'desc'

export type ScreenStatusFilter = 'all' | 'online' | 'offline'

export type ScreenItemType = 'media' | 'playlist' | 'app'

export type ScreenManageTab = 'content' | 'device' | 'settings' | 'availability'

export interface ScreenDeviceProfile {
  platform?: string
  userAgent?: string
  /** Web (PWA) bundle version. */
  appVersion?: string
  screenWidth?: number
  screenHeight?: number
  /** Native shell (Tauri) version — absent when the device runs in a browser. */
  shellVersion?: string
  runtime?: PlayerRuntime
  updateStatus?: DeviceUpdateStatus
}

// Device display + power settings come from @edge/player-contract — the single
// source of truth shared with the backend + player. Aliased to the historical
// `ScreenDevice*` names so the rest of the CMS keeps importing from here.
export type ScreenDeviceOrientation = DeviceOrientation
export type ScreenDeviceScale = DeviceScale
export type { DailyReloadSetting }
export type ScreenDeviceSettings = DeviceSettings

/** Fallback used when a device has no persisted settings yet. */
export const DEFAULT_DEVICE_SETTINGS: ScreenDeviceSettings = {
  orientation: DEFAULT_ORIENTATION,
  scale: DEFAULT_SCALE,
  dailyReload: { ...DEFAULT_DAILY_RELOAD },
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

/** Split-screen layout presets; `fullscreen` is the classic single region. */
export type ScreenLayout =
  | 'fullscreen'
  | 'main-sidebar'
  | 'main-ticker'
  | 'main-sidebar-ticker'

/** The secondary regions a preset can define; `main` is the screen's `items`. */
export type ScreenZoneKey = 'sidebar' | 'ticker'

/** A secondary region's own rotation (same item shape as the main list). */
export interface ScreenZone {
  key: ScreenZoneKey
  items: ScreenItem[]
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
  /** Split-screen preset; absent ⇒ fullscreen (legacy screens). */
  layout?: ScreenLayout
  /** Secondary regions' rotations; absent until a zone is first edited. */
  zones?: ScreenZone[]
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
  /** Split-screen: the region the list replaces. Absent ⇒ the MAIN zone. */
  zone?: ScreenZoneKey
}

export interface SetScreenLayoutRequest {
  layout: ScreenLayout
}

export interface AddMediaToScreensRequest {
  screenIds: string[]
  mediaIds: string[]
}

export interface AddPlaylistsToScreensRequest {
  screenIds: string[]
  playlistIds: string[]
}

export interface AddAppsToScreensRequest {
  screenIds: string[]
  appInstanceIds: string[]
}
