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
}

export interface DeviceRevokedEvent {
  deviceId: string;
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
