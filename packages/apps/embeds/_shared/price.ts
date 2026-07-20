import { currencySymbol } from '../../src/_shared/currency.js'

/**
 * Format a price with the instance currency. Numbers get up to two decimals
 * (trailing ".00" dropped) and the currency symbol on the configured side; a
 * string price (legacy manual rows) is shown verbatim — it already carries
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
  const amount = Number.isInteger(price)
    ? String(price)
    : price.toFixed(2).replace(/\.?0+$/, '')
  const symbol = currencySymbol(currency)
  if (!symbol) return amount
  return position === 'suffix' ? `${amount} ${symbol}` : `${symbol}${amount}`
}
