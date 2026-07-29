import type { ConfigSchema, DataSource } from '@signagewall/apps-contract'

/**
 * An app in the catalog. Copy (tagline/description/about) and category
 * membership are NOT on this shape — they're code + i18n, resolved by `slug`
 * via `@/features/apps/lib/appCopy`.
 */
export interface CatalogApp {
  id: string
  /** Stable identifier; the player registry key. */
  slug: string
  /**
   * Where the app's data comes from. `static` renders from config alone;
   * `server`/`connected` carry a connector payload — the live preview fetches it
   * via the preview-data endpoint.
   */
  dataSource: DataSource
  name: string
  /** Whether the current organization already installed the app. */
  isInstalled: boolean
  /** Inline SVG markup for the app icon. */
  iconSvg: string
  /** Brand colour (hex) for the icon tile / accent. */
  color: string
  /** The config form spec for this app's instances. */
  configSchema: ConfigSchema
  /**
   * True for persistent-overlay apps (e.g. the ticker band): they render over a
   * screen's content instead of taking a rotation slot, so the library hides
   * them from the add-to-content pickers — the operator assigns screens in the
   * app's own settings instead.
   */
  overlay?: boolean
}

/** A configured instance of an installed app. */
export interface AppInstance {
  id: string
  appId: string
  appSlug: string
  name: string
  /** Validated against the app's config schema; shape varies per app. */
  config: AppInstanceConfig
  /** The app version the config was saved against. */
  configVersion: number
  createdAt: string
  updatedAt: string
}

/** Generic instance config — keyed by the app's schema field keys. */
export type AppInstanceConfig = Record<string, unknown>

/** Full catalog shape for super-admin management (adds the public toggle). */
export interface AdminApp extends CatalogApp {
  runtimeKind: 'native' | 'embed'
  version: number
  isPublic: boolean
  /** Number of organizations that have installed this app. */
  installCount: number
  createdAt: string
  updatedAt: string
}
