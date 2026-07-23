/**
 * Bridge between the NestJS DI world and the plain-object connectors, for the
 * one thing several connectors need and none of them can do: take a binary that
 * only *we* are allowed to fetch and re-host it somewhere a player can load.
 *
 * Connectors (see connector-registry.ts) are stateless plain objects invoked by
 * the app-data scheduler with a `ctx` — they have no DI, so they can't inject
 * `R2StorageService`. `AssetMirrorService` (a provider in MediaModule) registers
 * itself here on module init and connectors read it back via
 * {@link getAssetMirror}. Same deliberate, single-purpose service locator as
 * {@link ../powerpoint/pptx-renderer.registry PptxRenderer}, kept tiny and typed
 * rather than widening the shared `ConnectorContext` contract with backend deps.
 *
 * WHY THIS EXISTS AT ALL: a provider that hands back a *temporary* or
 * *authenticated* asset URL can't be pointed at directly. Google Slides thumbnail
 * URLs expire in ~30 minutes; a screen that cached one shows a broken image the
 * next morning, and an offline screen never had a chance. Mirroring the bytes to
 * R2 once, on change, turns them into ordinary permanent images that cache and
 * play offline like any other media.
 */

export interface AssetMirror {
  /** Whether object storage (R2) is configured; if not, mirroring can't serve. */
  isConfigured(): boolean;
  /**
   * Download each URL and re-host it as WebP under `keyPrefix`, returning the
   * object keys IN THE SAME ORDER as `urls`.
   *
   * Throws if any single image fails: a slideshow missing slide 4 is a silent
   * lie about the deck, so the caller keeps serving the previous version rather
   * than publishing a hole.
   */
  mirrorImages(params: {
    urls: string[];
    /** Object key prefix, e.g. `gslides/<hash>/<versionHash>`. */
    keyPrefix: string;
    signal?: AbortSignal;
  }): Promise<string[]>;
  /** Public URL for a stored key (undefined when storage is unconfigured). */
  publicUrl(key: string): string | undefined;
  /** Best-effort delete of previously-mirrored objects. */
  deleteObjects(keys: string[]): Promise<void>;
}

let mirror: AssetMirror | undefined;

export function setAssetMirror(instance: AssetMirror): void {
  mirror = instance;
}

export function getAssetMirror(): AssetMirror | undefined {
  return mirror;
}
