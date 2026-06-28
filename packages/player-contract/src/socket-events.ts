/**
 * Socket.IO event names on the `/player` namespace. Kept here so the backend
 * gateway and the player client can never drift on a string literal.
 */
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
} as const

export type PlayerSocketEvent =
  (typeof PlayerSocketEvents)[keyof typeof PlayerSocketEvents]
