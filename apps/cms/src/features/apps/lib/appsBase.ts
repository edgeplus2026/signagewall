/**
 * Base path the app embed bundles are served from, mirroring the player's
 * `appsBase` config. Everything under it is produced by
 * `packages/apps` `build:embeds`: the bundles at `<slug>/index.html`, and the
 * template thumbnails at `_previews/<namespace>/<value>.webp`.
 *
 * Shared so the live preview and the template gallery cannot disagree about
 * where those artifacts live.
 */
export const APPS_BASE = (import.meta.env.VITE_APPS_BASE as string | undefined) ?? '/apps'

/**
 * URL of the thumbnail for one option of a `previewGallery` select — the
 * namespace comes from `Field.previewGallery`, the file name from the option's
 * value. Missing images are expected (a template can ship before its thumbnail
 * is rendered), so callers must handle the load error.
 */
export function templateThumbUrl(namespace: string, value: string): string {
  const base = APPS_BASE.replace(/\/+$/, '')
  return `${base}/_previews/${encodeURIComponent(namespace)}/${encodeURIComponent(value)}.webp`
}
