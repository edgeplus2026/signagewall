import type { FieldOption } from '@edge/apps-contract'

/**
 * Countries offered in the picker. Values are the ISO-3166 alpha-2 codes
 * Nager.Date expects. Nordics lead (Danish product first), then the rest of the
 * common set. Any code Nager supports can be added.
 */
export const COUNTRY_OPTIONS: FieldOption[] = [
  { label: 'Denmark', value: 'DK' },
  { label: 'Sweden', value: 'SE' },
  { label: 'Norway', value: 'NO' },
  { label: 'Finland', value: 'FI' },
  { label: 'Iceland', value: 'IS' },
  { label: 'Germany', value: 'DE' },
  { label: 'Netherlands', value: 'NL' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Ireland', value: 'IE' },
  { label: 'France', value: 'FR' },
  { label: 'Spain', value: 'ES' },
  { label: 'Italy', value: 'IT' },
  { label: 'Poland', value: 'PL' },
  { label: 'Austria', value: 'AT' },
  { label: 'Belgium', value: 'BE' },
  { label: 'Switzerland', value: 'CH' },
  { label: 'United States', value: 'US' },
]
