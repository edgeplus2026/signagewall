import type { FieldOption } from '@signagewall/apps-contract'

/**
 * The electricity price areas we surface. `value` is the exact energy-charts.info
 * bidding-zone (`bzn`) code the connector queries; `tz` is the area's IANA
 * timezone, used server-side to resolve the local day and which hour is "now".
 *
 * Serbia leads (home market), then popular European markets. energy-charts is
 * keyless and covers every zone here. Only zones that actually have an ENTSO-E
 * bidding zone exist upstream — so e.g. Bosnia / Albania / North Macedonia have
 * no feed and are intentionally absent. The USA has no keyless per-region spot
 * source and is handled separately (behind an API key) if enabled.
 */
export interface PowerArea {
  /** energy-charts `bzn` code; also the stored config value. */
  value: string
  /** Display name. */
  label: string
  /** IANA timezone for local-day boundaries and hour labels. */
  tz: string
}

export const POWER_AREAS: PowerArea[] = [
  { value: 'RS', label: 'Serbia', tz: 'Europe/Belgrade' },
  { value: 'DE-LU', label: 'Germany', tz: 'Europe/Berlin' },
  { value: 'FR', label: 'France', tz: 'Europe/Paris' },
  { value: 'AT', label: 'Austria', tz: 'Europe/Vienna' },
  { value: 'CH', label: 'Switzerland', tz: 'Europe/Zurich' },
  { value: 'IT-North', label: 'Italy (North)', tz: 'Europe/Rome' },
  { value: 'ES', label: 'Spain', tz: 'Europe/Madrid' },
  { value: 'PT', label: 'Portugal', tz: 'Europe/Lisbon' },
  { value: 'NL', label: 'Netherlands', tz: 'Europe/Amsterdam' },
  { value: 'BE', label: 'Belgium', tz: 'Europe/Brussels' },
  { value: 'PL', label: 'Poland', tz: 'Europe/Warsaw' },
  { value: 'CZ', label: 'Czechia', tz: 'Europe/Prague' },
  { value: 'SK', label: 'Slovakia', tz: 'Europe/Bratislava' },
  { value: 'HU', label: 'Hungary', tz: 'Europe/Budapest' },
  { value: 'RO', label: 'Romania', tz: 'Europe/Bucharest' },
  { value: 'HR', label: 'Croatia', tz: 'Europe/Zagreb' },
  { value: 'SI', label: 'Slovenia', tz: 'Europe/Ljubljana' },
  { value: 'BG', label: 'Bulgaria', tz: 'Europe/Sofia' },
  { value: 'GR', label: 'Greece', tz: 'Europe/Athens' },
  { value: 'DK1', label: 'Denmark (West)', tz: 'Europe/Copenhagen' },
  { value: 'DK2', label: 'Denmark (East)', tz: 'Europe/Copenhagen' },
  { value: 'SE3', label: 'Sweden (Stockholm)', tz: 'Europe/Stockholm' },
  { value: 'NO1', label: 'Norway (Oslo)', tz: 'Europe/Oslo' },
  { value: 'FI', label: 'Finland', tz: 'Europe/Helsinki' },
]

/** The default area — the home market. */
export const DEFAULT_AREA = 'RS'

/** Look up an area by its stored value; falls back to the default. */
export function powerAreaByValue(value: string | undefined): PowerArea {
  const found = POWER_AREAS.find((area) => area.value === value)
  return found ?? POWER_AREAS.find((area) => area.value === DEFAULT_AREA) ?? POWER_AREAS[0]!
}

/** Manifest select options. */
export const AREA_OPTIONS: FieldOption[] = POWER_AREAS.map((area) => ({
  label: area.label,
  value: area.value,
}))
