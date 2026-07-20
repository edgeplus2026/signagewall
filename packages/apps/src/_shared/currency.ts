import type { FieldOption } from '@edge/apps-contract'

/**
 * The currencies a price-list app can format with — the single source of truth
 * shared by manifests (which offer them in the config form) and embeds (which
 * format prices with the chosen symbol).
 *
 * `defaultPosition` is where the symbol conventionally sits for that currency;
 * the option `set`s the sibling `currencyPosition` field with it (the existing
 * select-preset mechanism), and the operator can still override it.
 */
export const CURRENCIES = [
  { value: 'EUR', label: 'Euro (€)', symbol: '€', defaultPosition: 'prefix' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$', defaultPosition: 'prefix' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£', defaultPosition: 'prefix' },
  { value: 'RSD', label: 'Serbian Dinar (дин)', symbol: 'дин', defaultPosition: 'suffix' },
  { value: 'CHF', label: 'Swiss Franc (CHF)', symbol: 'CHF', defaultPosition: 'prefix' },
  { value: 'SEK', label: 'Swedish Krona (kr)', symbol: 'kr', defaultPosition: 'suffix' },
  { value: 'NOK', label: 'Norwegian Krone (kr)', symbol: 'kr', defaultPosition: 'suffix' },
  { value: 'DKK', label: 'Danish Krone (kr)', symbol: 'kr', defaultPosition: 'suffix' },
  { value: 'PLN', label: 'Polish Złoty (zł)', symbol: 'zł', defaultPosition: 'suffix' },
  { value: 'CZK', label: 'Czech Koruna (Kč)', symbol: 'Kč', defaultPosition: 'suffix' },
  { value: 'HUF', label: 'Hungarian Forint (Ft)', symbol: 'Ft', defaultPosition: 'suffix' },
  { value: 'BAM', label: 'Bosnian Mark (KM)', symbol: 'KM', defaultPosition: 'suffix' },
  { value: 'RON', label: 'Romanian Leu (lei)', symbol: 'lei', defaultPosition: 'suffix' },
  { value: 'MKD', label: 'Macedonian Denar (ден)', symbol: 'ден', defaultPosition: 'suffix' },
  { value: 'BGN', label: 'Bulgarian Lev (лв)', symbol: 'лв', defaultPosition: 'suffix' },
  { value: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥', defaultPosition: 'prefix' },
  { value: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$', defaultPosition: 'prefix' },
  { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$', defaultPosition: 'prefix' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['value']
export type CurrencyPosition = 'prefix' | 'suffix'

export const DEFAULT_CURRENCY: CurrencyCode = 'EUR'

/** The symbol for a currency code; falls back to the code itself. */
export function currencySymbol(code: string | undefined): string {
  const found = CURRENCIES.find((currency) => currency.value === code)
  return found ? found.symbol : (code ?? '')
}

/**
 * The currency list as a `select` field's options. Each option presets the
 * sibling `currencyPosition` field to the currency's conventional side.
 */
export function currencyOptions(positionKey = 'currencyPosition'): FieldOption[] {
  return CURRENCIES.map((currency) => ({
    label: currency.label,
    value: currency.value,
    set: { [positionKey]: currency.defaultPosition },
  }))
}
