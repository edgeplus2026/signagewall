import type { ConfigSchema } from '@edge/apps-contract'

export interface EdgeApp {
  id: string
  /** Stable identifier; the player registry key. */
  slug: string
  name: string
  description: string
  /** Short tagline shown on the card and next to the title in the drawer. */
  tagline: string
  /** Whether the current organization already installed the app. */
  isInstalled: boolean
  /** Tailwind gradient classes used to colour the card accent + tv frame. */
  accent: AppAccent
  /** Public image URL for the icon; falls back to the accent gradient when absent. */
  iconUrl?: string
  /** Longer marketing copy rendered in the "About this app" section. */
  about: string
  /** Preview images shown in the drawer carousel. */
  screenshots: string[]
  /** The config form spec for this app's instances. */
  configSchema: ConfigSchema
}

export interface AppAccent {
  /** Gradient for the logo tile. */
  logo: string
  /** Soft glow shown behind the tv frame. */
  glow: string
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

/** Full catalog shape for super-admin management (adds governance fields). */
export interface AdminApp extends EdgeApp {
  runtimeKind: 'native' | 'embed'
  dataSource: 'static' | 'server' | 'connected'
  version: number
  isPublic: boolean
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}
