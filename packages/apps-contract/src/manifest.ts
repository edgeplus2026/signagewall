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
   * Refresh cadence (seconds) for the backend connector, for `server`/`connected`
   * apps only. The scheduler re-fetches a cache-key's data once this many seconds
   * have elapsed since its last fetch. Absent for `static` apps (no connector).
   */
  refreshSeconds?: number
  /** Default icon as inline SVG markup. Super-admin can override in the catalog. */
  icon?: string
  /** Default brand colour (hex). Super-admin can override in the catalog. */
  color?: string
}
