/**
 * Player-side contract. The cross-app types now live in `@edge/player-contract`
 * (the single source of truth shared with the backend + CMS); this barrel
 * re-exports them so existing intra-app imports keep working, and adds the
 * player-only UI state that has no place in the cross-app contract.
 */
export type {
  AppRenderable,
  AvailabilityRule,
  DailyReloadSetting,
  DeviceOrientation,
  DeviceScale,
  DeviceSettings,
  ImageRenderable,
  PairedPayload,
  PairingCodePayload,
  PlayerCommand,
  PlayerSnapshot,
  Renderable,
  VideoRenderable,
} from '@edge/player-contract'

export type ConnectionState =
  | 'connecting'
  | 'online'
  | 'offline'
  | 'reconnecting'
