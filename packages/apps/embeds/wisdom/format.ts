import type { WisdomQuote } from '../../src/wisdom/payload.js'
import type { WisdomDesign } from '../../src/wisdom/designs.js'
import { WISDOM_DESIGNS } from '../../src/wisdom/designs.js'

/**
 * The bundle's untrusted-data boundary and its randomness, in one place.
 *
 * Every quote on the screen came out of somebody else's API, so this is where
 * that text stops being trusted: it is escaped before it reaches `innerHTML`.
 */

/** Escape text for interpolation into HTML. */
export function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

/**
 * Length tiers.
 *
 * Quotes run from four words to sixty, and one type size cannot serve both — a
 * size that makes "Be one." monumental turns a sixty-word Seneca into a wall of
 * grey. The alternative to tiers is a JS auto-fit loop that measures and
 * re-measures the DOM, which is a reflow storm on a Raspberry Pi and would run on
 * every rotation tick. So: one class, set once from the text length, and each
 * design's CSS decides what that means for its own layout — which is right,
 * because "long" means something different in a sticky note than on a black field.
 */
export type LengthTier = 'is-xs' | 'is-sm' | 'is-md' | 'is-lg'

export function lengthTier(text: string): LengthTier {
  if (text.length <= 60) {
    return 'is-xs'
  }
  if (text.length <= 120) {
    return 'is-sm'
  }
  if (text.length <= 200) {
    return 'is-md'
  }
  return 'is-lg'
}

/** A small, fast, well-distributed 32-bit string hash (FNV-1a). */
function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    // FNV prime, via shifts — `Math.imul` keeps it in 32-bit space.
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32 — a tiny seeded PRNG. Same seed, same sequence, everywhere. */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The design each quote wears, as a permutation of the full design list.
 *
 * The app's whole premise is that consecutive quotes look nothing alike, and that
 * needs randomness that is nonetheless STABLE. `Math.random()` would be a bug:
 * this bundle re-renders on every config message — and the CMS sends one on every
 * keystroke in the settings form — as well as on every `app-active` toggle. A
 * fresh roll per render means the design flips out from under a quote while it is
 * on the wall, mid-sentence, in front of a room.
 *
 * So the roll is seeded from the PAYLOAD: the same batch of quotes always yields
 * the same permutation, on every screen and across every re-render, and tomorrow's
 * batch reshuffles it on its own. Indexing a permutation (rather than picking
 * independently per quote) is also what guarantees no two consecutive quotes land
 * on the same design — the thing that would most obviously look broken.
 */
export function designOrder(quotes: WisdomQuote[]): WisdomDesign[] {
  const seed = hashString(quotes[0]?.text ?? 'wisdom')
  const random = mulberry32(seed)
  const order = [...WISDOM_DESIGNS]

  // Fisher–Yates.
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const held = order[index] as WisdomDesign
    order[index] = order[swap] as WisdomDesign
    order[swap] = held
  }

  return order
}
