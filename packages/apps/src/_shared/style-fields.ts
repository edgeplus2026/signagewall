import type { Field, FieldOption } from '@edge/apps-contract'

/**
 * The shared typography fields every app offers: font, size, line height and
 * letter spacing. An app spreads {@link styleFields} into its `configSchema`;
 * the matching runtime half is `embeds/_shared/text-style.ts`, which turns these
 * exact keys into CSS custom properties. Keep the keys identical across apps so
 * one helper keeps working for all of them.
 */
export const STYLE_SECTION = 'Style Settings'

/**
 * Web-safe font tokens (no web-font loading — players run offline). Stored as a
 * token, not a CSS stack, so the stack can change without rewriting saved
 * configs. NOTE: these values MUST match `FONT_STACKS` in
 * `embeds/_shared/text-style.ts`.
 */
export const FONT_OPTIONS: FieldOption[] = [
  { label: 'Default', value: 'system' },
  { label: 'Sans-serif (Arial)', value: 'sans' },
  { label: 'Serif (Georgia)', value: 'serif' },
  { label: 'Monospace', value: 'mono' },
  { label: 'Verdana', value: 'verdana' },
  { label: 'Tahoma', value: 'tahoma' },
  { label: 'Trebuchet MS', value: 'trebuchet' },
  { label: 'Times New Roman', value: 'times' },
]

/**
 * CSS font weights. Stored as a string because `select` values are strings; the
 * runtime whitelists them against the same set.
 */
export const FONT_WEIGHT_OPTIONS: FieldOption[] = [
  { label: 'Thin (100)', value: '100' },
  { label: 'Extra light (200)', value: '200' },
  { label: 'Light (300)', value: '300' },
  { label: 'Regular (400)', value: '400' },
  { label: 'Medium (500)', value: '500' },
  { label: 'Semibold (600)', value: '600' },
  { label: 'Bold (700)', value: '700' },
  { label: 'Extra bold (800)', value: '800' },
  { label: 'Black (900)', value: '900' },
]

/** Per-app starting values; every field falls back to a neutral default. */
export interface StyleFieldDefaults {
  /** A {@link FONT_OPTIONS} token. */
  fontFamily?: string
  /** A {@link FONT_WEIGHT_OPTIONS} value, e.g. `'300'`. */
  fontWeight?: string
  /** Percent of the app's own size — 100 leaves it as the app designed it. */
  fontSize?: number
  lineHeight?: number
  /** In em. */
  letterSpacing?: number
}

/**
 * The "Style Settings" section: font, weight, size, line height, letter spacing.
 *
 * `fontSize` is a PERCENT, not a pixel value: apps size text relative to the
 * screen (vw/vh) so it stays legible on any display, and a fixed px value would
 * throw that away. 100% = the app's own size; the operator scales from there.
 */
export function styleFields(defaults: StyleFieldDefaults = {}): Field[] {
  return [
    {
      key: 'fontFamily',
      type: 'select',
      label: 'Font',
      section: STYLE_SECTION,
      default: defaults.fontFamily ?? 'system',
      options: FONT_OPTIONS,
    },
    {
      key: 'fontWeight',
      type: 'select',
      label: 'Font weight',
      section: STYLE_SECTION,
      default: defaults.fontWeight ?? '400',
      options: FONT_WEIGHT_OPTIONS,
    },
    {
      key: 'fontSize',
      type: 'number',
      label: 'Font size (%)',
      section: STYLE_SECTION,
      default: defaults.fontSize ?? 100,
      validation: { min: 25, max: 400 },
    },
    {
      key: 'lineHeight',
      type: 'number',
      label: 'Line height',
      section: STYLE_SECTION,
      default: defaults.lineHeight ?? 1.2,
    },
    {
      key: 'letterSpacing',
      type: 'number',
      // The value is in em (see applyTextStyle) — the form deliberately doesn't
      // spell that out; it stays a plain "more/less spacing" dial.
      label: 'Letter spacing',
      section: STYLE_SECTION,
      default: defaults.letterSpacing ?? 0,
    },
  ]
}
