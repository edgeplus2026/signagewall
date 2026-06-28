/**
 * Re-exports the shared device-setting contract (valid values, defaults, and
 * validators) from `@edge/player-contract`, the single source of truth shared
 * with the backend + CMS. Kept as a barrel so the rest of the player keeps
 * importing these from one stable path.
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
} from '@edge/player-contract'
