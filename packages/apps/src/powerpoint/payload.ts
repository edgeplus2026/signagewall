/**
 * Normalized PowerPoint payload — the shared contract between the backend
 * `powerpoint` connector and the embed bundle. The connector renders the deck
 * (Graph `pptx → PDF`, then poppler → WebP) and uploads each slide to R2; the
 * payload carries the ordered public slide URLs, which the embed shows as a
 * static image slideshow. No timestamps — the host deep-compares the payload,
 * and freshness travels out-of-band in `AppDataMeta`.
 */
export interface PowerPointPayload {
  name: string
  /** Public R2 URLs of the rendered slide images, in presentation order. */
  slides: string[]
  /** Content tag of the source deck; lets the host detect a version change. */
  version?: string
}
