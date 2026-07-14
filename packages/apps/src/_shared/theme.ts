/**
 * The product's accent — one colour, across every app that has one.
 *
 * An accent is the one thing on a screen that is allowed to be loud: the second
 * hand, the ticking colon, today's date on the calendar, the story's progress bar.
 * It is a PRODUCT colour, not an app colour, so it does not belong to whichever
 * app happened to define it first — a playlist that cuts from the clock to the news
 * feed should not change accent mid-loop.
 *
 * NOT to be confused with a manifest's `color`, which is the app's identity in the
 * CMS catalog (Weather is sky blue, YouTube is red). Those stay different on
 * purpose: a catalog of nine identical orange tiles is a catalog you can't scan.
 *
 * Two things this constant does NOT reach, and both are deliberate:
 *   - Weather takes its accent from the SKY, because the whole app is the argument
 *     that the screen's palette should be the weather.
 *   - Any accent the operator has typed in themselves. This is the default they
 *     start from, never a value that overwrites theirs.
 *
 * The CSS fallbacks (`var(--ck-accent, #f97316)`) are copies of this by hand —
 * stylesheets can't import. They only matter if the custom property is somehow
 * unset, but keep them in step anyway: a stale one is a trap that only fires on the
 * day the property goes missing.
 */
export const DEFAULT_ACCENT = '#F97316'
