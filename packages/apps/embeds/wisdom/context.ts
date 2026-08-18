import type { LengthTier } from './format.js'

/**
 * What a design is handed. Lives in its own file so `designs/index.ts` and the
 * individual designs can both import it without a cycle through `main.ts`.
 *
 * Deliberately tiny: a design gets a quote, an author, and a hint about how much
 * text it is dealing with. It gets no config, no theme and no data freshness —
 * those are chrome, and chrome is `main.ts`'s job. A design that needed to know
 * about how long a quote holds would be a design doing someone else's work.
 *
 * `text` and `author` are RAW — straight off a third-party API. Every design must
 * pass them through `escapeHtml` before they reach a template string.
 */
export interface WisdomContext {
  text: string
  author?: string
  /** `is-xs` … `is-lg` — set on the design's root; each design sizes its own type. */
  tier: LengthTier
}

/** A design: pure, synchronous, and responsible for its own CSS import. */
export interface WisdomTemplate {
  render(ctx: WisdomContext): string
}
