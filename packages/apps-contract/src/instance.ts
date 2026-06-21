/** Generic instance config — keyed by the app's schema field keys. */
export type AppInstanceConfig = Record<string, unknown>

/**
 * A configured instance of an installed app, owned by an organization. This is
 * the shared shape; the backend persists it and the CMS/player consume it.
 */
export interface AppInstance<Config = AppInstanceConfig> {
  id: string
  organizationId: string
  appSlug: string
  name: string
  /** Validated against the app's config schema on write. */
  config: Config
  /** The manifest version the config was saved against (for migration). */
  configVersion: number
  /** Set for `connected` apps — references the OAuth connection used. */
  connectionId?: string
  createdAt: string
  updatedAt: string
}

/**
 * The render-side props passed to a player app component. The player resolves
 * the instance config and (for server/connected apps) the latest payload, then
 * renders into a fixed surface.
 */
export interface AppRenderProps<Config = Record<string, unknown>, Payload = unknown> {
  config: Config
  /** Normalized connector payload; `null` for `static` apps or before first fetch. */
  data: Payload | null
  /** The pixel surface the app must fill (16:9 for fullscreen). */
  surface: { width: number; height: number }
  /** True when rendered inside the CMS preview rather than on a live screen. */
  isPreview: boolean
}
