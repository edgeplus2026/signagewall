/**
 * What SignageWall costs — the only place a number lives.
 *
 * The price appears on the pricing page, the home page, several FAQ answers,
 * the solutions pages and the `Offer` structured data. Typed into the message
 * files it would end up in a dozen translations and drift the first time it
 * changed; the messages carry an ICU `{price}` placeholder instead and this
 * module fills it. Changing the number here changes it everywhere, including
 * what Google and the AI assistants read.
 */

export const PRICE_PER_SCREEN_EUR = 8

/**
 * The US price is set, not converted. €8 is roughly $8.70 today, but a SaaS
 * price that moves with the exchange rate is a support ticket waiting to
 * happen — and $9 is the round number the market is priced at (Yodeck $8,
 * OptiSigns $9–10).
 *
 * TODO: confirm with the business before launch.
 */
export const PRICE_PER_SCREEN_USD = 9

/** Days in the free trial. No card required — see the pricing FAQ. */
export const TRIAL_DAYS = 21

export type Currency = 'EUR' | 'USD'

/** EUR for the Serbian site and European visitors, USD for the primary market. */
export const CURRENCY_BY_LOCALE: Record<string, Currency> = { en: 'USD', sr: 'EUR' }

const SYMBOL: Record<Currency, string> = { EUR: '€', USD: '$' }
const AMOUNT: Record<Currency, number> = {
  EUR: PRICE_PER_SCREEN_EUR,
  USD: PRICE_PER_SCREEN_USD,
}

export function currencyForLocale(locale: string): Currency {
  return CURRENCY_BY_LOCALE[locale] ?? 'USD'
}

export function pricePerScreen(locale: string): number {
  return AMOUNT[currencyForLocale(locale)]
}

/**
 * The price as it is written in prose — `$9` or `8 €`. The symbol leads in
 * English and trails in Serbian, which is how each language writes money.
 */
export function formattedPrice(locale: string): string {
  const currency = currencyForLocale(locale)
  const amount = AMOUNT[currency]
  return locale === 'sr'
    ? `${amount.toString()} ${SYMBOL[currency]}`
    : `${SYMBOL[currency]}${amount.toString()}`
}
