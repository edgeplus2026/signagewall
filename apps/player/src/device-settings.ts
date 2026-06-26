import type {
  DailyReloadSetting,
  DeviceOrientation,
  DeviceScale,
} from './types'

/**
 * Single source of truth for the valid device-setting values, their defaults,
 * and the validators that gate them. Imported by the persistence layer
 * (device.ts), the live-command layer (socket.ts), and the scheduler, so all
 * three accept exactly the same set — adding an orientation/scale is a one-line
 * change here instead of editing several lockstep copies.
 */

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
export const DEFAULT_DAILY_RELOAD: DailyReloadSetting = {
  enabled: true,
  time: '03:00',
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
