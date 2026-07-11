/**
 * In-process domain events that drive realtime player pushes. Content-owning
 * modules (screens/playlists/media) emit these via `EventEmitter2`; the
 * {@link PlayerGateway} subscribes with `@OnEvent` and fans out Socket.IO
 * messages to the affected screen/device rooms. This keeps those modules fully
 * decoupled from the websocket layer (they never import the gateway), and gives
 * us a clean seam to later replace the in-memory emitter with Redis pub/sub for
 * horizontal scaling.
 */
import {
  PlayerSocketEvents,
  type DeviceSettingsPayload,
  type DeviceUpdateStatus,
  type PlayerCommand,
} from '@edge/player-contract';

// Re-exported so the rest of the backend keeps importing these from the player
// module while the single source of truth lives in @edge/player-contract.
export { PlayerSocketEvents };
export type { DeviceSettingsPayload, PlayerCommand };

export const PlayerEvents = {
  /** A screen's own items changed (added/removed/reordered/replaced). */
  ScreenContentChanged: 'player.screen.content-changed',
  /** A playlist changed; every screen referencing it must re-resolve. */
  PlaylistChanged: 'player.playlist.changed',
  /** A media item finished processing (e.g. video transcode) and is now ready. */
  MediaReady: 'player.media.ready',
  /** Screens were deleted; bound devices must be unpaired. */
  ScreensDeleted: 'player.screens.deleted',
  /** A device was just paired to a screen (CMS action) — push token + snapshot. */
  DevicePaired: 'player.device.paired',
  /** A device was unpaired / its token revoked — tell it to drop the token. */
  DeviceRevoked: 'player.device.revoked',
  /** A paired device's online/offline status changed — push live to the CMS. */
  DevicePresenceChanged: 'player.device.presence-changed',
  /** A device setting changed (e.g. volume) — push live to the player. */
  DeviceCommand: 'player.device.command',
  /**
   * A `server` app's connector data changed for a cache key — every screen whose
   * instances resolve to that key must re-resolve so the new payload reaches the
   * player. The cache is global (shared across orgs), so this event carries no
   * organizationId; the gateway resolves the affected screens across all orgs.
   */
  AppDataChanged: 'player.app.data-changed',
  /**
   * An app instance's config was edited (CMS) — every screen using that instance
   * (directly or via a playlist) must re-resolve so the new config reaches the
   * player live, without a manual reload.
   */
  AppInstanceChanged: 'player.app.instance-changed',
} as const;

export interface ScreenContentChangedEvent {
  organizationId: string;
  screenId: string;
}

export interface PlaylistChangedEvent {
  organizationId: string;
  playlistId: string;
}

export interface MediaReadyEvent {
  organizationId: string;
  mediaId: string;
}

export interface ScreensDeletedEvent {
  organizationId: string;
  screenIds: string[];
}

export interface DevicePairedEvent {
  deviceId: string;
  organizationId: string;
  screenId: string;
  /** Opaque token to deliver to the device so it can persist + reconnect. */
  token: string;
  /** Persisted playback volume 0–100 the player should adopt on pair. */
  volume: number;
  /** Persisted display + power settings to adopt on pair. */
  settings: DeviceSettingsPayload;
}

export interface DeviceRevokedEvent {
  deviceId: string;
}

/**
 * A paired device flipped online/offline (or was unpaired). The {@link
 * PlayerGateway} relays this to the CMS realtime channel so operators see live
 * presence without polling. `paired: false` means the device was detached from
 * the screen, so the CMS should drop it rather than mark it offline.
 */
export interface DevicePresenceChangedEvent {
  organizationId: string;
  screenId: string;
  deviceId: string;
  online: boolean;
  lastSeenAt: string;
  appVersion?: string;
  /** Native shell version, when the device runs inside the Tauri shell. */
  shellVersion?: string;
  /**
   * Latest OTA outcome (`available` / `installing` / `error` / `unhealthy` / …)
   * so a rollout can be watched from the screens list instead of one device tab
   * at a time — a device that rolled back still looks perfectly "online".
   */
  updateResult?: DeviceUpdateStatus['lastResult'];
  /** Defaults to true; false when the device was just unpaired. */
  paired?: boolean;
}

/**
 * A live control command targeted at one device. `screenId` lets the gateway
 * also fan the command out to the `screen:<id>` room so any CMS preview
 * spectators stay in lockstep with the real device (e.g. a remote next/prev).
 */
export interface DeviceCommandEvent {
  deviceId: string;
  screenId: string;
  command: PlayerCommand;
}

/**
 * A connector cache key's payload changed. No `organizationId`: the cache is
 * global, so the gateway resolves every affected screen across all orgs.
 */
export interface AppDataChangedEvent {
  cacheKey: string;
  slug: string;
}

/**
 * An app instance's config changed (operator edit). Org-scoped: the gateway
 * re-pushes the screens in this org that use the instance directly or via a
 * playlist.
 */
export interface AppInstanceChangedEvent {
  organizationId: string;
  instanceId: string;
}
