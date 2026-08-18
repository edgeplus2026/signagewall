/**
 * The numeric bounds of the RSS config, shared by the manifest (which validates
 * against them) and the embed (which clamps to them).
 *
 * Kept in one place because the two halves silently disagreeing is the failure
 * mode: raise the manifest's cap alone and the embed goes on clamping to the old
 * one, so the operator's setting simply doesn't take effect — no error, nothing
 * in a log, just a number that does nothing.
 */

/** How many of the newest stories an instance may use. */
export const ITEM_COUNT = { min: 1, max: 20, default: 6 } as const

/** How long a story stays on screen, in layouts that move between them. */
