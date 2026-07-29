import type { FieldOption } from '@signagewall/apps-contract'

/**
 * The layouts the Weather app can render a forecast in — the single source of
 * truth shared by the manifest (which offers them in the config form) and the
 * embed (which keys its template registry by them).
 *
 * Adding a layout is deliberately a three-line change: add an entry here, add the
 * template file, register it in `embeds/weather/templates/index.ts`. The registry
 * is typed `Record<WeatherDisplayMode, WeatherTemplate>`, so a mode listed here
 * with no template behind it fails the type-check instead of reaching a screen as
 * a blank frame.
 *
 * The labels are written for the person choosing, not for us: they say what the
 * screen will LOOK like, because that operator is picking from a dropdown with no
 * preview and "Bento" means nothing to them.
 */
export const WEATHER_DISPLAY_MODES = [
  { value: 'glance', label: 'At a glance — the temperature and the week' },
  { value: 'panel', label: 'Panel — every reading, laid out' },
  { value: 'hourly', label: 'Hour by hour — how today unfolds' },
  { value: 'week', label: 'The week — seven days, warmest to coldest' },
  { value: 'solar', label: 'Daylight — sunrise, now, sunset' },
  { value: 'minimal', label: 'Minimal — the temperature, and nothing else' },
  { value: 'agency', label: 'Agency — a weather desk on the news' },
  { value: 'tiles', label: 'Tiles — a board of cards' },
] as const

/** The `displayMode` config values, narrowed to the modes we actually ship. */
export type WeatherDisplayMode = (typeof WEATHER_DISPLAY_MODES)[number]['value']

export const DEFAULT_WEATHER_MODE: WeatherDisplayMode = 'glance'

/** The mode list as the `select` field's options. */
export function weatherDisplayModeOptions(): FieldOption[] {
  return WEATHER_DISPLAY_MODES.map((mode) => ({
    label: mode.label,
    value: mode.value,
  }))
}
