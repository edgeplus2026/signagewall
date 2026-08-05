import type {
  HydratedPrivateAssetRef,
  PrivateAssetRef,
} from '@signagewall/apps-contract'

/**
 * Credential-free connector payload. Only an authorized player/CMS delivery
 * boundary may add the short-lived `url` on each page reference.
 */
export interface SecurePowerBiPayload {
  reportName: string
  /** Connector cache: private ref; authorized preview/snapshot: hydrated ref. */
  pages: Array<PrivateAssetRef | HydratedPrivateAssetRef>
  exportedAt: string
  sourceVersion?: string
}
