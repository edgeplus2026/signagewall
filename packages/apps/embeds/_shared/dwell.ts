/**
 * Fitting a rotating app's steps into the time it is actually on screen.
 *
 * Shared by every embed that advances through something on a timer — pages of a
 * table, slides of a deck, stories in a feed, quotes. They all had the same bug,
 * and it is invisible from inside the app: the operator sets "20 seconds per
 * page", the slot runs for 15, and the interval never fires even once. The app
 * leaves the screen still showing the first step, the rest is never drawn, and
 * nothing reports a skipped page — on the wall it just looks like an app that
 * only ever shows the top of the list.
 */

/**
 * Below this a step is gone before it can be read, so it is where sharing the
 * dwell stops. Matches the minimum the manifests already allow operators to set.
 */
export const MIN_STEP_MS = 3_000

/**
 * How long one step may stay up, given how long the app has in total.
 *
 * The operator's interval is a CEILING, not a promise the slot can keep: when
 * the steps would not all get a turn within `durationMs` they share it instead,
 * down to {@link MIN_STEP_MS} — past which a faster carousel would only be
 * unreadable rather than complete. When even that floor cannot fit them all, the
 * app shows as many as it can and the caller is expected to RESUME on its next
 * appearance rather than restart, so the tail is reached across a few rotations.
 *
 * `durationMs` is absent on a host that imposes no dwell (the CMS live preview),
 * and then the operator's value is returned untouched — there is nothing to fit.
 */
export function stepMs(
  configuredMs: number,
  steps: number,
  durationMs: number | undefined,
): number {
  if (steps <= 1 || !durationMs || !Number.isFinite(durationMs)) {
    return configuredMs
  }
  const share = Math.floor(durationMs / steps)
  return Math.max(MIN_STEP_MS, Math.min(configuredMs, share))
}

/**
 * Where to resume a rotation whose step count may have changed since last time.
 *
 * Guards the resume path: a deck that lost slides, or a table whose rows now fit
 * in fewer pages, must not come back pointing past its own end.
 */
export function resumeIndex(cursor: number, steps: number): number {
  if (steps <= 0) return 0
  const index = cursor % steps
  return index < 0 ? 0 : index
}
