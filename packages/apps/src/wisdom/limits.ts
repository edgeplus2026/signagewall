/**
 * The numeric bounds for the Daily Wisdom app — the single source of truth
 * shared by the manifest (which validates the operator's input against them)
 * and the embed (which clamps a saved config against them before using it).
 *
 * The embed must clamp rather than trust: a config saved before a bound moved is
 * still out there in a player's snapshot, and a screen is not the place to find
 * out that `secondsPerQuote` is 0.
 */
export const QUOTE_COUNT = { min: 1, max: 20, default: 5 } as const
export const SECONDS_PER_QUOTE = { min: 5, max: 120, default: 20 } as const

/**
 * How many quotes the connector keeps per fetch. Far more than any instance
 * shows (the cap is 20), because the payload is shared by every screen in the
 * fleet and costs one upstream call either way — and because ZenQuotes hands
 * back 50 whether we want them or not.
 */
export const UPSTREAM_QUOTES = 50

/**
 * Quotes longer than this are dropped, not truncated.
 *
 * A quote is an argument that ends; cutting one mid-clause with an ellipsis
 * doesn't read as "there's more", it reads as a bug. And at wall distance a
 * 300-character aphorism is unreadable anyway — dropping it costs us nothing,
 * since upstream gives us fifty and a screen shows five.
 */
export const MAX_QUOTE_LENGTH = 280
