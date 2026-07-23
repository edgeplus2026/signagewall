/**
 * Re-exports the shared device-setting contract (valid values, defaults, and
 * validators) from `@edge/player-contract`, the single source of truth shared
 * with the backend + CMS. Kept as a barrel so the rest of the player keeps
 * importing these from one stable path.
 */
export {
  DEFAULT_DAILY_RELOAD,
  DEFAULT_DAILY_RELOAD_TIME,
  DEFAULT_KIOSK_MODE,
  DEFAULT_ORIENTATION,
  DEFAULT_SCALE,
  KIOSK_MODES,
  ORIENTATIONS,
  SCALES,
  TIME_RE,
  isKioskMode,
  isOrientation,
  isScale,
  isValidReloadTime,
  normalizeDailyReload,
} from '@edge/player-contract'
