import type { FieldOption } from '@signagewall/apps-contract'

/**
 * The faces the Clock app can render — the single source of truth shared by the
 * manifest (which offers them in the config form) and the embed (which keys its
 * template registry by them).
 *
 * Adding a face is deliberately a three-line change: add an entry here, add the
 * template file, register it in `embeds/clock/templates/index.ts`. The registry is
 * typed `Record<ClockFace, ClockTemplate>`, so a face listed here with no template
 * behind it fails the type-check instead of reaching a screen as a blank frame.
 *
 * The key is `face`, not `displayMode` (which is what the RSS and Weather apps
 * call theirs). Those apps arrange the same content differently; a clock is not
 * being re-arranged — it is being told in a different language. A word clock and an
 * analogue dial have no layout in common.
 */
export const CLOCK_FACES = [
  { value: 'digital', label: 'Digital: the time, in numbers' },
  { value: 'analog', label: 'Analogue. A clock face with hands' },
  { value: 'flip', label: 'Flip. A split-flap board' },
  { value: 'word', label: 'Words: "ten past three", spelled out' },
  { value: 'orbit', label: 'Orbit, rings that close as the hour turns' },
] as const

/** The `face` config values, narrowed to the ones we actually ship. */
export type ClockFace = (typeof CLOCK_FACES)[number]['value']

export const DEFAULT_CLOCK_FACE: ClockFace = 'digital'

/** The face list as the `select` field's options. */
export function clockFaceOptions(): FieldOption[] {
  return CLOCK_FACES.map((face) => ({ label: face.label, value: face.value }))
}
