/**
 * Normalized Google Slides payload — the contract between the backend `gslides`
 * connector and the embed bundle.
 *
 * `slides` are PERMANENT public image URLs. The connector exports each page via
 * the Slides API and mirrors the bytes to R2, rather than handing the player
 * Google's own `contentUrl`s — those expire in ~30 minutes, which would mean a
 * screen could only ever show a deck it had just been pushed, and never play one
 * offline. Because the URLs are stable, `version` (the Drive revision of the
 * deck) is a real content signature: the host uses it to skip the fan-out when
 * nothing changed.
 */
export interface GslidesPayload {
  /** Presentation title, as named in Drive. */
  title: string
  /** Mirrored public image URLs of the slides, in order. */
  slides: string[]
  /** Drive revision of the source deck; lets the host detect a version change. */
  version?: string
}
