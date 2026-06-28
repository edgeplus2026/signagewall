/**
 * In-process domain events that drive realtime player pushes. Content-owning
 * modules (screens/playlists/media) emit these via `EventEmitter2`; the
 * {@link PlayerGateway} subscribes with `@OnEvent` and fans out Socket.IO
 * messages to the affected screen/device rooms. This keeps those modules fully
 * decoupled from the websocket layer (they never import the gateway), and gives
 * us a clean seam to later replace the in-memory emitter with Redis pub/sub for
 * horizontal scaling.
 */
import type { DeviceOrientation, DeviceScale } from './schemas/device.schema';

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

/** Display + power settings delivered to the player (mirrors DeviceSettings). */
export interface DeviceSettingsPayload {
  orientation: DeviceOrientation;
  scale: DeviceScale;
  dailyReload: { enabled: boolean; time: string };
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
  /** Defaults to true; false when the device was just unpaired. */
  paired?: boolean;
}

/** Player control commands fanned out to a specific device's socket. */
export type PlayerCommand =
  | { type: 'volume'; value: number }
  | { type: 'orientation'; value: DeviceOrientation }
  | { type: 'scale'; value: DeviceScale }
  | { type: 'restart' }
  | { type: 'dailyReload'; value: { enabled: boolean; time: string } }
  // Transient playback nudges (no persisted state) — typically issued from the
  // CMS preview so the operator can step the live display through its content.
  | { type: 'next' }
  | { type: 'prev' };

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

/** Socket.IO event names. Kept here so client and server stay in lockstep. */
export const PlayerSocketEvents = {
  PairingCode: 'pairing:code',
  Paired: 'paired',
  ContentUpdate: 'content:update',
  Sleep: 'sleep',
  Command: 'command',
  Revoked: 'paired:revoked',
  Heartbeat: 'heartbeat',
  /**
   * Device → server: the item the device just put on screen. The gateway relays
   * it to the screen room so CMS preview spectators mirror the device 1:1.
   */
  NowPlaying: 'now-playing',
  /**
   * Preview → server → device: a freshly-joined preview asks the device to
   * re-announce its current item, so it syncs immediately instead of waiting for
   * the device's next natural transition.
   */
  NowPlayingRequest: 'now-playing:request',
} as const;
