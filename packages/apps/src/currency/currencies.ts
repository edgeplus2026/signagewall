import type { FieldOption } from '@edge/apps-contract'

/**
 * The currencies we surface in the picker. The value is the ISO code the
 * upstream (currency-api) quotes; the label pairs the code with its name so the
 * form reads clearly — and so typing a country or currency name finds it in the
 * searchable pickers. Nordic currencies lead the common set — this is a Danish
 * product first — followed by the Balkans, then the rest alphabetically.
 *
 * NOTE: keep every `value` a code the upstream actually quotes, or a rate comes
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
  { label: 'RSD — Serbian dinar', value: 'RSD' },
  { label: 'BAM — Bosnian convertible mark', value: 'BAM' },
  { label: 'MKD — Macedonian denar', value: 'MKD' },
  { label: 'ALL — Albanian lek', value: 'ALL' },
  { label: 'AED — UAE dirham', value: 'AED' },
  { label: 'AUD — Australian dollar', value: 'AUD' },
  { label: 'BGN — Bulgarian lev', value: 'BGN' },
  { label: 'BRL — Brazilian real', value: 'BRL' },
  { label: 'CAD — Canadian dollar', value: 'CAD' },
  { label: 'CNY — Chinese yuan', value: 'CNY' },
  { label: 'CZK — Czech koruna', value: 'CZK' },
  { label: 'EGP — Egyptian pound', value: 'EGP' },
  { label: 'GEL — Georgian lari', value: 'GEL' },
  { label: 'HKD — Hong Kong dollar', value: 'HKD' },
  { label: 'HUF — Hungarian forint', value: 'HUF' },
  { label: 'IDR — Indonesian rupiah', value: 'IDR' },
  { label: 'ILS — Israeli shekel', value: 'ILS' },
  { label: 'INR — Indian rupee', value: 'INR' },
  { label: 'ISK — Icelandic króna', value: 'ISK' },
  { label: 'JPY — Japanese yen', value: 'JPY' },
  { label: 'KRW — South Korean won', value: 'KRW' },
  { label: 'MXN — Mexican peso', value: 'MXN' },
  { label: 'MYR — Malaysian ringgit', value: 'MYR' },
  { label: 'NZD — New Zealand dollar', value: 'NZD' },
  { label: 'PHP — Philippine peso', value: 'PHP' },
  { label: 'PLN — Polish złoty', value: 'PLN' },
  { label: 'QAR — Qatari riyal', value: 'QAR' },
  { label: 'RON — Romanian leu', value: 'RON' },
  { label: 'SAR — Saudi riyal', value: 'SAR' },
  { label: 'SGD — Singapore dollar', value: 'SGD' },
  { label: 'THB — Thai baht', value: 'THB' },
  { label: 'TRY — Turkish lira', value: 'TRY' },
  { label: 'UAH — Ukrainian hryvnia', value: 'UAH' },
  { label: 'VND — Vietnamese dong', value: 'VND' },
  { label: 'ZAR — South African rand', value: 'ZAR' },
]
