/**
 * Socket.IO event names on the `/player` namespace. Kept here so the backend
 * gateway and the player client can never drift on a string literal.
 */
export const PlayerSocketEvents = {
  PairingCode: 'pairing:code',
  Paired: 'paired',
  /**
   * Server → device: this connection presented a known paired `deviceId` but
   * neither the device token nor a valid one-time recovery code — the server
   * refuses to re-admit on bare identity. The client should discard its local
   * identity, mint a fresh `deviceId` and reconnect into the normal pairing
   * flow.
   */
  RecoveryRequired: 'recovery:required',
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
  /**
   * Device → server: the answer to a `sendDiagnostics` command — cache state,
   * storage and the shell's recent events. Its own message rather than a fatter
   * heartbeat, because it is kilobytes and is worth sending only when asked.
   */
  Diagnostics: 'diagnostics',
  /**
   * Device → server: what this screen has played since the last confirmed batch,
   * as per-item totals rather than a stream of events.
   *
   * The only device message that is ACKNOWLEDGED. Everything else here is a
   * courtesy — a heartbeat or a diagnostic that is worth re-sending later if it
   * is lost. This one is evidence somebody bills against, so the device keeps a
   * batch until the server confirms it, and the server ignores a batch number it
   * has already seen. Losing one costs a customer's report; counting one twice
   * costs their trust.
   */
  Playback: 'playback',
} as const

export type PlayerSocketEvent =
  (typeof PlayerSocketEvents)[keyof typeof PlayerSocketEvents]
