import type { FieldOption } from '@signagewall/apps-contract'

/**
 * The layouts the RSS app can render a feed in — the single source of truth
 * shared by the manifest (which offers them in the config form) and the embed
 * (which keys its template registry by them).
 *
 * Adding a layout is deliberately a three-line change: add an entry here, add
 * the template file, register it in `embeds/rss/templates/index.ts`. The
 * registry is typed `Record<RssDisplayMode, RssTemplate>`, so a mode listed
 * here with no template behind it fails the type-check instead of reaching a
 * screen as a blank frame.
 */
export const RSS_DISPLAY_MODES = [
  { value: 'story', label: 'One story at a time' },
  { value: 'cover', label: 'Cover. The photo fills the screen' },
  { value: 'editorial', label: 'Editorial. A magazine page' },
  { value: 'rolling', label: 'Rolling list, stories queue up and move on' },
  { value: 'mosaic', label: 'Mosaic. The whole front page at once' },
  { value: 'primetime', label: 'Primetime: a headliner, and what’s up next' },
  { value: 'broadcast', label: 'Broadcast. A news channel' },
  { value: 'kinetic', label: 'Kinetic, typography that performs' },
  { value: 'atelier', label: 'Atelier. The deluxe edition' },
  { value: 'statement', label: 'Statement: the headline, and nothing else' },
] as const

/** The `displayMode` config values, narrowed to the modes we actually ship. */
export type RssDisplayMode = (typeof RSS_DISPLAY_MODES)[number]['value']

export const DEFAULT_DISPLAY_MODE: RssDisplayMode = 'story'

/** The mode list as the `select` field's options. */
export function displayModeOptions(): FieldOption[] {
  return RSS_DISPLAY_MODES.map((mode) => ({
    label: mode.label,
    value: mode.value,
  }))
}
