import type { AppManifest } from '@signagewall/apps-contract'

import { DEFAULT_CATEGORIES, categoryOptions } from './categories.js'
import { QUOTE_COUNT, SECONDS_PER_QUOTE } from './limits.js'

const WISDOM_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 5C6.46 5 4 7.46 4 10.5c0 2.7 1.94 4.95 4.5 5.41V17c0 1.1-.9 2-2 2v2c2.21 0 4-1.79 4-4v-6.5C10.5 8.57 9.43 7.5 8.1 7.5c-.2 0-.4.02-.6.07C8.1 6.63 8.74 6 9.5 6V5zm9 0C15.46 5 13 7.46 13 10.5c0 2.7 1.94 4.95 4.5 5.41V17c0 1.1-.9 2-2 2v2c2.21 0 4-1.79 4-4v-6.5c0-1.93-1.07-3-2.4-3-.2 0-.4.02-.6.07.6-.94 1.24-1.57 2-1.57V5z"/></svg>'

/**
 * Daily Wisdom — a `server` app. The backend owns a vendored corpus of ~4,900
 * categorised quotes; the connector selects from it per category-set under one
 * cache key and fans the result out, so a thousand screens on the same categories
 * cost one selection a day. Nothing is fetched from a third party at any point:
 * every free quote API with usable categories either forbids commercial use, hides
 * them behind a paid key, or has simply vanished (`api.quotable.io` is dead), and
 * a screen on a customer's wall is not a place to discover that.
 *
 * CATEGORIES are the app. A gym picks Motivation and Sports; a waiting room picks
 * Health & wellness and Life. That is the difference between this and a quote app.
 *
 * There is deliberately no design picker:
 * the app's entire premise is that each quote arrives in a different look, and
 * an operator who could pin one design would get a wall of identical slides and
 * lose the thing they installed the app for. The designs live in `designs.ts` and
 * the embed assigns them with a seeded shuffle — random, but stable, so a quote
 * never changes its clothes while it is on the screen.
 *
 * Likewise no typography fields: a quote on a wall is a layout problem the app
 * should solve, not five dials to hand the operator. Long quotes and short ones
 * are handled by length tiers inside each design.
 *
 * `refreshSeconds` is a day — the cadence IS the freshness policy here, and it is
 * what makes the app's name true. It is also the one number to change if we ever
 * want the quotes to turn over faster.
 */
export const wisdomManifest: AppManifest = {
  slug: 'wisdom',
  name: 'Daily Wisdom',
  tagline: 'A new quote on the wall every day',
  description:
    'Shows a handful of inspiring quotes, each one in a different design: refreshed on its own, every day.',
  runtimeKind: 'embed',
  dataSource: 'server',
  version: 1,
  refreshSeconds: 86_400,
  icon: WISDOM_ICON,
  // Violet: the catalog is scanned by colour, so an app's tile must not read as
  // another's. Weather is sky blue and RSS is orange; the amber inside some of
  // this app's designs is a design choice, not its identity.
  color: '#8B5CF6',
  // NOTE: no `requiresNetwork`. The payload rides in the player's cached
  // snapshot and the bundle ships its own fallback quotes, so this app is
  // perfectly happy on a screen that has been offline for a week — gating it out
  // when the network drops would be exactly wrong.
  configSchema: [
    {
      key: 'categories',
      type: 'multiselect',
      label: 'Topics',
      // The one field that decides whether this app fits the room it hangs in, so
      // the help says what it is FOR, not what it does.
      help: 'What the quotes should be about. Pick a few: a gym might choose Motivation and Sports, a waiting room Health & wellness and Life.',
      default: DEFAULT_CATEGORIES,
      options: categoryOptions(),
      // At least one. The connector would quietly fall back to the defaults on an
      // empty selection rather than show a blank wall, but an operator who cleared
      // every topic and then got Motivation quotes anyway would rightly think the
      // app was broken. Make the form say no instead.
      validation: { min: 1 },
    },
    {
      key: 'quoteCount',
      type: 'number',
      label: 'How many quotes',
      help: 'How many quotes the screen cycles through before starting over.',
      default: QUOTE_COUNT.default,
      validation: { min: QUOTE_COUNT.min, max: QUOTE_COUNT.max },
    },
    {
      key: 'secondsPerQuote',
      type: 'number',
      label: 'Seconds per quote',
      help: 'How long each quote stays on the screen.',
      default: SECONDS_PER_QUOTE.default,
      validation: { min: SECONDS_PER_QUOTE.min, max: SECONDS_PER_QUOTE.max },
    },
  ],
}
