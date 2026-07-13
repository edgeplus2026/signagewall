/**
 * Runtime half of the shared "Style Settings" fields (`src/_shared/style-fields.ts`).
 * {@link applyTextStyle} writes the config into CSS custom properties on the app
 * root, so each stylesheet keeps its own responsive base size and merely scales
 * it:
 *
 *   .caption {
 *     font-family: var(--app-font, inherit);
 *     font-weight: var(--app-font-weight, 300);
 *     font-size: calc(min(2.8vw, 8.4vh) * var(--app-font-scale, 1));
 *     line-height: var(--app-line-height, 1.2);
 *     letter-spacing: var(--app-letter-spacing, 0);
 *   }
 *
 * Every value is whitelisted or clamped: the config is operator-authored, but it
 * still lands in CSS, so nothing arbitrary is interpolated.
 *
 * NOTE: the keys of FONT_STACKS are the wire format and MUST match `FONT_OPTIONS`
 * in `src/_shared/style-fields.ts`. They are kept inline (not imported) so the
 * embed bundles stay tiny and dependency-free, like `host-bridge.ts`.
 */

const FONT_STACKS: Record<string, string> = {
  system: 'inherit',
  sans: 'Arial, Helvetica, sans-serif',
  serif: 'Georgia, serif',
  mono: '"Courier New", monospace',
  verdana: 'Verdana, Geneva, sans-serif',
  tahoma: 'Tahoma, sans-serif',
  trebuchet: '"Trebuchet MS", sans-serif',
  times: '"Times New Roman", Times, serif',
}

/** Selectable CSS font weights. MUST match `FONT_WEIGHT_OPTIONS` in the manifest half. */
const FONT_WEIGHTS = new Set([
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
])

/** The neutral value of each field — also what a missing/non-numeric one gets. */
const DEFAULTS = {
  fontSize: 100,
  lineHeight: 1.2,
  letterSpacing: 0,
} as const

/**
 * Line height and letter spacing take whatever number the operator typed — they
 * are unbounded by design (a designer may want 0 or 5). Only non-numbers fall
 * back, so nothing but a number ever reaches CSS.
 */
function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/**
 * Apply the Style Settings config to `el` (normally the app root, so the whole
 * subtree can read the properties). Safe to call on every render.
 */
export function applyTextStyle(
  el: HTMLElement,
  config: Record<string, unknown>,
): void {
  const token = typeof config.fontFamily === 'string' ? config.fontFamily : ''
  const weight = String(config.fontWeight ?? '')
  // Font size is the one bounded value: 0 would blank the text and a huge scale
  // would push it off-screen, with no way to tell from the CMS preview.
  const scale = Math.min(400, Math.max(25, num(config.fontSize, DEFAULTS.fontSize))) / 100

  el.style.setProperty('--app-font', FONT_STACKS[token] ?? FONT_STACKS.system!)
  // Unset (rather than a fallback value) for an unknown weight, so the app's own
  // CSS default — the `var(--app-font-weight, 300)` fallback — stays in charge.
  if (FONT_WEIGHTS.has(weight)) {
    el.style.setProperty('--app-font-weight', weight)
  } else {
    el.style.removeProperty('--app-font-weight')
  }
  el.style.setProperty('--app-font-scale', String(scale))
  el.style.setProperty(
    '--app-line-height',
    String(num(config.lineHeight, DEFAULTS.lineHeight)),
  )
  el.style.setProperty(
    '--app-letter-spacing',
    `${num(config.letterSpacing, DEFAULTS.letterSpacing)}em`,
  )
}
