/**
 * What SignageWall costs — the only place a number lives.
 *
 * The price appears on the pricing page, the home page, several FAQ answers,
 * the solutions pages and the `Offer` structured data. Typed into the message
 * files it would end up in a dozen translations and drift the first time it
 * changed; the messages carry an ICU `{price}` placeholder instead and this
 * module fills it. Changing the number here changes it everywhere, including
 * what Google and the AI assistants read.
 *
 * One price in one currency, both languages. The English site used to quote a
 * separate $9 — a second number to keep in step, and one that made the same
 * screen cost differently depending on which language a visitor happened to
 * open. If a dollar price comes back it belongs here, next to this note, not in
 * a message file.
 */

export const PRICE_PER_SCREEN = 8

export const CURRENCY = 'EUR'

/** Days in the free trial. No card required — see the pricing FAQ. */
export const TRIAL_DAYS = 21

/**
 * The price as it is written in prose — `€8` or `8 €`. The symbol leads in
 * English and trails in Serbian, which is how each language writes money.
 */
export function formattedPrice(locale: string): string {
  return locale === 'sr' ? `${PRICE_PER_SCREEN.toString()} €` : `€${PRICE_PER_SCREEN.toString()}`
}
