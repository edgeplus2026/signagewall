/**
 * Normalized Canva payload — shared contract between the backend `canva`
 * connector and the embed bundle. The connector picks the best export format
 * the design supports (mp4 for presentations/animations, else jpg/png) and
 * resolves short-lived export URLs (valid 24h; the player never sees the access
 * token). The bundle renders a looping video or a per-page image slideshow.
 */
export interface CanvaPayload {
  /**
   * The Canva design id this export is for. The embed compares it against the
   * currently-selected design in config: when the operator picks a new design,
   * this still holds the OLD id until the (slow) re-export finishes, so the embed
   * shows the loading state instead of the stale previous design.
   */
  designId: string
  /** The design's title (or the operator's chosen label). */
  name: string
  /**
   * How to render `slides`:
   * - `video`     → a single mp4 URL (Canva presentations/animations).
   * - `slideshow` → one image URL per page, shown in order and looped.
   */
  kind: 'video' | 'slideshow'
  /** Export URLs (valid ~24h): one mp4, or one image per page (in page order). */
  slides: string[]
  fetchedAt: string
}
