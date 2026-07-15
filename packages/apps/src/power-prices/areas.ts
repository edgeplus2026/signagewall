import type { FieldOption } from '@edge/apps-contract'

/**
 * The price areas the Elspotprices dataset carries that we surface. Values are
 * the exact `PriceArea` strings the API filters on. DK1/DK2 lead — this is a
 * Danish product — with the neighbouring Nord Pool areas after.
 */
export const AREA_OPTIONS: FieldOption[] = [
  { label: 'DK1 — Denmark West', value: 'DK1' },
  { label: 'DK2 — Denmark East', value: 'DK2' },
  { label: 'SE3 — Sweden (Stockholm)', value: 'SE3' },
  { label: 'SE4 — Sweden (Malmö)', value: 'SE4' },
  { label: 'NO2 — Norway (Kristiansand)', value: 'NO2' },
]
