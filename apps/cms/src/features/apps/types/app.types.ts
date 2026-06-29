import type { ConfigSchema, DataSource } from '@edge/apps-contract'

export interface EdgeApp {
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
  description: string
  /** Short tagline shown on the card and next to the title in the drawer. */
  tagline: string
  /** Whether the current organization already installed the app. */
  isInstalled: boolean
  /** Inline SVG markup for the app icon. */
  iconSvg: string
  /** Brand colour (hex) for the icon tile / accent. */
  color: string
  /** Longer marketing copy rendered in the "About this app" section. */
  about: string
  /** The config form spec for this app's instances. */
  configSchema: ConfigSchema
  /** Ids of the catalog categories this app belongs to. */
  categoryIds: string[]
}

/** A super-admin-managed catalog category for grouping/filtering apps. */
export interface AppCategory {
  id: string
  name: string
  slug: string
  order: number
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
export interface AdminApp extends EdgeApp {
  runtimeKind: 'native' | 'embed'
  version: number
  isPublic: boolean
  createdAt: string
  updatedAt: string
}
