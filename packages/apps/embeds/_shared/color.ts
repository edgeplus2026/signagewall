/**
 * Colour handling shared by the embeds.
 *
 * Every themed app takes colours from operator-authored config and puts them
 * straight into CSS — a `style` attribute, a custom property, a canvas fill. So
 * each one needs the same guard, and each one used to hand-roll it. Nothing but
 * a validated hex colour is ever allowed through.
 */

/** A hex colour: `#rgb`, `#rrggbb`, or with an alpha pair. */
const HEX = /^#[0-9a-fA-F]{3,8}$/

/** `value` if it is a hex colour, else `fallback`. */
export function pickColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX.test(value) ? value : fallback
}
