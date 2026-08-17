import { currencySymbol } from '../../src/_shared/currency.js'

/**
 * Format a price with the instance currency. A whole number stays whole ("12 €"
 * — a menu that writes "12.00" for everything reads like a spreadsheet); a
 * fractional one keeps BOTH decimals ("3.20 €"), because dropping the second is
 * how money starts looking like a typo.
 *
 * A string price (legacy manual rows) is shown verbatim — it already carries
 * whatever the operator typed, currency and all.
 */
export function formatPrice(
  price: number | string | undefined,
  currency: string | undefined,
  position: string | undefined,
): string {
  if (price === undefined || price === '') return ''
  if (typeof price === 'string') {
    const parsed = Number(price)
    if (!Number.isFinite(parsed)) return price
    price = parsed
  }
  if (!Number.isFinite(price)) return ''
  // No trailing-zero strip: whole numbers already took the branch above, so it
  // could only ever turn a correct "3.20" into "3.2".
  const amount = Number.isInteger(price) ? String(price) : price.toFixed(2)
  const symbol = currencySymbol(currency)
  if (!symbol) return amount
  return position === 'suffix' ? `${amount} ${symbol}` : `${symbol}${amount}`
}
