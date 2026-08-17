/**
 * Re-exports the shared device-setting contract (valid values, defaults, and
 * validators) from `@signagewall/player-contract`, the single source of truth shared
 * with the backend + CMS. Kept as a barrel so the rest of the player keeps
 * importing these from one stable path.
 *
 * Kiosk lockdown is the exception and is defined below rather than re-exported:
 * it is set on the device, in the service menu, and never leaves it — so it is not
 * part of the cross-app contract.
 */
export {
  DEFAULT_DAILY_RELOAD,
  DEFAULT_DAILY_RELOAD_TIME,
  DEFAULT_ORIENTATION,
  DEFAULT_SCALE,
  ORIENTATIONS,
  SCALES,
  TIME_RE,
  isOrientation,
  isScale,
  isValidReloadTime,
  normalizeDailyReload,
} from '@signagewall/player-contract'

/**
 * Kiosk lockdown level, enforced by the Android shell. `hard` = an un-escapable
 * Device-Owner lock; `soft` = a user-escapable screen-pin + launcher; `off` = a
 * normal app. Ignored by a plain browser / the Tauri desktop shell.
 *
 * The service menu's switch only ever asks for `hard` or `off` — the shell itself
 * drops to `soft` on a box that isn't Device Owner. `soft` stays in the union
 * because the shell still speaks it and devices locked before this was a
 * device-local setting still have it persisted.
 */
export type KioskMode = 'hard' | 'soft' | 'off'

export const KIOSK_MODES: readonly KioskMode[] = ['hard', 'soft', 'off']

export const DEFAULT_KIOSK_MODE: KioskMode = 'off'

export function isKioskMode(value: unknown): value is KioskMode {
  return typeof value === 'string' && (KIOSK_MODES as string[]).includes(value)
}
