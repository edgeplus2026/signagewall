/**
 * How long each step of a rotating app stays up.
 *
 * Shared by every embed that advances through something on a timer — pages of a
 * table, slides of a deck, posts in a feed, stories, quotes.
 *
 * There used to be a "seconds per page/slide/post" setting on each of these apps,
 * and it was the wrong question to put to an operator. It could not be answered
 * correctly without knowing how long the item runs for on the screen, which is
 * configured somewhere else entirely — on the playlist, by someone who may not be
 * the same person. Set it higher than the slot and the interval never fired at
 * all: the app left the screen still showing its first step and everything after
 * it was silently never drawn.
 *
 * So it is not asked any more. The slot's dwell is divided by the number of
 * steps, which is the answer the operator was trying to reach: a 30 second item
 * with three pages turns them every ten seconds, on its own, always.
 */

/**
 * Below this a step is gone before it can be read, so it is where dividing stops.
 *
 * It means an app with more steps than the slot can hold at a readable pace shows
 * as many as fit rather than strobing through all of them — a feed of twenty-four
 * posts in a thirty second slot would otherwise get 1.25 s each, which is not
 * showing them so much as flashing them. The lever for seeing the rest is a
 * LONGER SLOT, or fewer items where the app offers that choice.
 */
export const MIN_STEP_MS = 3_000

/**
 * What one step gets when the host imposes no dwell at all.
 *
 * Only the CMS app-editor preview: it runs until the operator closes it, so there
 * is nothing to divide. A screen preview runs the real player and gets a real
 * dwell like anything else. Chosen to look like a working rotation rather than to
 * match any particular screen, because it cannot match one.
 */
export const PREVIEW_STEP_MS = 8_000

/**
 * The interval for one step of a rotation, from the slot's dwell.
 *
 * `durationMs` absent means an unbounded host (see {@link PREVIEW_STEP_MS}).
 */
export function stepMs(steps: number, durationMs: number | undefined): number {
  if (!durationMs || !Number.isFinite(durationMs)) {
    return PREVIEW_STEP_MS
  }
  if (steps <= 1) {
    // Nothing to divide between; the single step holds the slot either way, and
    // a caller that still arms a timer must not get a zero interval out of us.
    return Math.max(MIN_STEP_MS, durationMs)
  }
  return Math.max(MIN_STEP_MS, Math.floor(durationMs / steps))
}
