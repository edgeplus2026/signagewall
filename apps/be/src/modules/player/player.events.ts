/**
 * In-process domain events that drive realtime player pushes. Content-owning
 * modules (screens/playlists/media) emit these via `EventEmitter2`; the
 * {@link PlayerGateway} subscribes with `@OnEvent` and fans out Socket.IO
 * messages to the affected screen/device rooms. This keeps those modules fully
 * decoupled from the websocket layer (they never import the gateway), and gives
 * us a clean seam to later replace the in-memory emitter with Redis pub/sub for
 * horizontal scaling.
 */
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

export interface DevicePairedEvent {
  deviceId: string;
  organizationId: string;
  screenId: string;
  /** Opaque token to deliver to the device so it can persist + reconnect. */
  token: string;
  /** Persisted playback volume 0–100 the player should adopt on pair. */
  volume: number;
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
export type PlayerCommand = { type: 'volume'; value: number };

/** A live control command targeted at one device (e.g. set volume). */
export interface DeviceCommandEvent {
  deviceId: string;
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
} as const;
