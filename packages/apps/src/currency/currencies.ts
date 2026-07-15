import type { FieldOption } from '@edge/apps-contract'

/**
 * The currencies Frankfurter (ECB reference rates) supports that we surface in
 * the picker. The value is the ISO code the API expects; the label pairs the
 * code with its name so the form reads clearly. Nordic currencies lead the
 * common set — this is a Danish product first.
 *
 * NOTE: keep every `value` a code Frankfurter actually quotes, or a rate comes
 * back missing. The connector drops any code the upstream omits, so a stray
 * entry degrades to "not shown" rather than an error.
 */
export const CURRENCY_OPTIONS: FieldOption[] = [
  { label: 'EUR — Euro', value: 'EUR' },
  { label: 'DKK — Danish krone', value: 'DKK' },
  { label: 'SEK — Swedish krona', value: 'SEK' },
  { label: 'NOK — Norwegian krone', value: 'NOK' },
  { label: 'USD — US dollar', value: 'USD' },
  { label: 'GBP — British pound', value: 'GBP' },
  { label: 'CHF — Swiss franc', value: 'CHF' },
  { label: 'JPY — Japanese yen', value: 'JPY' },
  { label: 'CNY — Chinese yuan', value: 'CNY' },
  { label: 'PLN — Polish złoty', value: 'PLN' },
  { label: 'CAD — Canadian dollar', value: 'CAD' },
  { label: 'AUD — Australian dollar', value: 'AUD' },
  { label: 'CZK — Czech koruna', value: 'CZK' },
  { label: 'ISK — Icelandic króna', value: 'ISK' },
]
