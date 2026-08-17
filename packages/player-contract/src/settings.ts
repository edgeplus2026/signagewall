/**
 * Single source of truth for the player's display + power settings: the valid
 * values, their defaults, and the validators that gate them. Shared by the
 * player (persistence + live commands), the backend (Mongoose enums + payloads),
 * and the CMS (forms + types) so the three can never drift — adding an
 * orientation/scale is a one-line change here.
 *
 * Kiosk lockdown is deliberately NOT here: it is set on the device itself, in the
 * player's service menu, and never travels over the wire. A remote kiosk switch
 * is a control you can only ever use to lock yourself out of a screen you are not
 * standing in front of, so the player owns that state alone (apps/player/src/sync/kiosk.ts).
 */

/** How the player rotates its output relative to the physical display. */
export type DeviceOrientation =
  | 'landscape'
  | 'landscape-flipped'
  | 'portrait'
  | 'portrait-flipped'

/** How content fits the screen (maps to CSS object-fit on the player). */
export type DeviceScale = 'none' | 'fit' | 'stretch' | 'zoom'

export const ORIENTATIONS: readonly DeviceOrientation[] = [
  'landscape',
  'landscape-flipped',
  'portrait',
  'portrait-flipped',
]

export const SCALES: readonly DeviceScale[] = ['none', 'fit', 'stretch', 'zoom']

/** 24h 'HH:mm'. */
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export const DEFAULT_ORIENTATION: DeviceOrientation = 'landscape'
export const DEFAULT_SCALE: DeviceScale = 'fit'
export const DEFAULT_DAILY_RELOAD_TIME = '03:00'

/** Automatic once-a-day player reload, in the device's local time. */
export interface DailyReloadSetting {
  enabled: boolean
  /** 24h 'HH:mm' in the device's local timezone. */
  time: string
}

export const DEFAULT_DAILY_RELOAD: DailyReloadSetting = {
  enabled: true,
  time: DEFAULT_DAILY_RELOAD_TIME,
}

/** Display + power settings pushed from the CMS to the player. */
export interface DeviceSettings {
  orientation: DeviceOrientation
  scale: DeviceScale
  dailyReload: DailyReloadSetting
}

export function isOrientation(value: unknown): value is DeviceOrientation {
  return (
    typeof value === 'string' && (ORIENTATIONS as string[]).includes(value)
  )
}

export function isScale(value: unknown): value is DeviceScale {
  return typeof value === 'string' && (SCALES as string[]).includes(value)
}

export function isValidReloadTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value)
}

/**
 * Normalizes an arbitrary (possibly malformed) daily-reload value to a valid
 * setting. An invalid/missing `time` falls back to the default time, but the
 * `enabled` flag is always honored — so a "disable" with a bad time still
 * disables rather than being dropped wholesale.
 */
export function normalizeDailyReload(value: unknown): DailyReloadSetting {
  const candidate = (value ?? {}) as Partial<DailyReloadSetting>
  return {
    enabled: candidate.enabled !== false,
    time: isValidReloadTime(candidate.time)
      ? candidate.time
      : DEFAULT_DAILY_RELOAD.time,
  }
}
