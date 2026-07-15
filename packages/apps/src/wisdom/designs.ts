/**
 * The designs a quote can be dressed in — the single source of truth shared by
 * the embed's template registry and the seeded shuffle that assigns one to each
 * quote.
 *
 * Unlike the RSS app's `display-modes.ts`, this list is deliberately NOT a
 * config field. The whole point of Daily Wisdom is that five quotes in a row
 * don't look like five slides of the same template, and that only holds if the
 * app chooses — an operator who picks "Sticky note" once gets a wall of sticky
 * notes and the app stops being the thing it was built to be.
 *
 * It still lives in its own file, and is still typed `as const`, for the same
 * reason RSS's list does: the embed registry is typed `Record<WisdomDesign,
 * WisdomTemplate>`, so a design named here with no template behind it is a
 * type error rather than a blank wall. (And if we ever do want to let an
 * operator lock one design, this list is already the `select`'s options.)
 *
 * Adding a design is a three-line change: add it here, add the template file,
 * register it in `embeds/wisdom/designs/index.ts`.
 */
export const WISDOM_DESIGNS = [
  'aurora',
  'spotlight',
  'editorial',
  'neon',
  'glass',
  'stack',
  'duotone',
  'ribbon',
  'orbit',
  'paper',
] as const

export type WisdomDesign = (typeof WISDOM_DESIGNS)[number]
