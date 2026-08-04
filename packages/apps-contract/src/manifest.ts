import type { ConfigSchema } from './field-schema.js'

/**
 * How an app's player runtime is delivered.
 * - `native` — a Preact component compiled into the player (first-party apps).
 * - `embed`  — a sandboxed html/js/css bundle loaded in an iframe (third-party,
 *              injected scripts). Reserved for later; not built yet.
 */
export type RuntimeKind = 'native' | 'embed'

/**
 * Where an app gets its data.
 * - `static`    — everything is in the config; no server calls (e.g. YouTube URL, clock).
 * - `server`    — a backend connector fetches & normalizes (e.g. RSS, weather).
 * - `connected` — needs an OAuth/account connection (e.g. Google Calendar, Canva).
 */
export type DataSource = 'static' | 'server' | 'connected'

/**
 * The static description of an app. Authored alongside the app source (for
 * native apps) and published into the catalog. The super-admin manages
 * presentation (icon/screenshots/visibility) but not the schema/contract.
 */
export interface AppManifest {
  /** Stable identifier; the player registry key and catalog slug. */
  slug: string
  name: string
  tagline: string
  description: string
  runtimeKind: RuntimeKind
  dataSource: DataSource
  /** The config form spec. */
  configSchema: ConfigSchema
  /** Bumped when the schema or runtime contract changes; instances record the version they were saved against. */
  version: number
  /**
   * True when the app can't render meaningfully without live internet at the
   * player — it embeds live remote content (e.g. YouTube's stream, an arbitrary
   * web page, a Canva CDN asset) that the backend never captures into the
   * snapshot. The player hides such apps from the rotation while offline and
   * brings them back the moment connectivity returns (no reload). Absent/false
   * for apps that work offline: `static` apps (clock, QR, text) and data-backed
   * apps (weather, gcal) whose last-synced payload is cached in the snapshot.
   */
  requiresNetwork?: boolean
  /**
   * Refresh cadence (seconds) for the backend connector, for `server`/`connected`
   * apps only. The scheduler re-fetches a cache-key's data once this many seconds
   * have elapsed since its last fetch. Absent for `static` apps (no connector).
   */
  refreshSeconds?: number
  /**
   * True when the app decodes video while it is on screen — YouTube, a stream, a
   * Canva design carrying a clip. It is NOT about the app's own correctness: it
   * tells the player's engine that this item is holding one of the device's video
   * decoders.
   *
   * That matters because signage hardware has very few. The Android TV this was
   * measured on advertises exactly TWO hardware AVC instances, and anything past
   * them silently falls back to a software decoder that SEGV-crashed five times in
   * one night of ordinary playback. The engine already refuses to warm a second
   * video while one is playing, but it decided that by looking at `kind`, so an
   * on-screen YouTube did not stop it buffering an .mp4 into the other slot — and
   * `youtube -> mp4` is a completely ordinary rotation.
   *
   * Only set it for apps that decode while ACTIVE. A preloaded app is mounted
   * silent and inert until `activate`, so it opens no decoder and does not count.
   */
  usesVideoDecoder?: boolean
  /**
   * True for apps that render as a persistent OVERLAY on top of whatever a
   * screen is playing (e.g. the ticker band), instead of taking a slot in the
   * content rotation. Overlay apps are not addable to screens/playlists as
   * items; the operator picks the screens they appear on via a `screens`
   * config field, and the player draws them above the stage on every snapshot
   * that carries them.
   */
  overlay?: boolean
  /** Default icon as inline SVG markup. Super-admin can override in the catalog. */
  icon?: string
  /** Default brand colour (hex). Super-admin can override in the catalog. */
  color?: string
}
