import type { WisdomDesign } from '../../../src/wisdom/designs.js'
import type { WisdomTemplate } from '../context.js'
import { balancedLines, makeDesign } from './factory.js'

import './base.css'
import './aurora.css'
import './spotlight.css'
import './editorial.css'
import './neon.css'
import './glass.css'
import './stack.css'
import './duotone.css'
import './ribbon.css'
import './orbit.css'
import './paper.css'

/**
 * The ten designs.
 *
 * Each one is a backdrop plus a stylesheet — the layout, the escaping and the
 * entrance staggering come from `makeDesign`. The backdrops are plain markup
 * because everything they draw is a gradient or a vector: not one raster pixel in
 * the set, which is the offline requirement, not an aesthetic preference. The
 * player's service worker precaches `.css`/`.svg`/`.woff2` and does NOT precache
 * `.png`/`.jpg`, so a photographic backdrop would be a blank rectangle on exactly
 * the offline screens this app exists to serve.
 *
 * Anything that moves is marked `wis-anim-*` and may only touch `transform` and
 * `opacity` — see the rule at the top of `motion.css`. Static blurs and glows are
 * fine and several designs use them; it is only ANIMATING them that would put a
 * Pi-class player on the floor.
 */

/** Layered radial gradients — the "mesh" look, without a mesh-gradient library. */
const AURORA_BACKDROP = `
  <div class="wis-bg ds-bg wis-anim-drift" aria-hidden="true">
    <div class="au-blob au-blob-1"></div>
    <div class="au-blob au-blob-2"></div>
    <div class="au-blob au-blob-3"></div>
  </div>`

const SPOTLIGHT_BACKDROP = `
  <div class="wis-bg ds-bg" aria-hidden="true">
    <div class="sp-wash wis-anim-kenburns"></div>
    <div class="sp-vignette"></div>
  </div>`

const NEON_BACKDROP = `
  <div class="wis-bg ds-bg" aria-hidden="true">
    <div class="ne-grid"></div>
    <div class="ne-haze wis-anim-pulse"></div>
  </div>`

const GLASS_BACKDROP = `
  <div class="wis-bg ds-bg wis-anim-drift" aria-hidden="true">
    <div class="gl-blob gl-blob-1"></div>
    <div class="gl-blob gl-blob-2"></div>
  </div>`

const ORBIT_BACKDROP = `
  <div class="wis-bg ds-bg" aria-hidden="true">
    <div class="or-field wis-anim-orbit">
      <span class="or-ring or-ring-1"></span>
      <span class="or-ring or-ring-2"></span>
      <span class="or-ring or-ring-3"></span>
      <span class="or-dot or-dot-1"></span>
      <span class="or-dot or-dot-2"></span>
    </div>
  </div>`

const DUOTONE_BACKDROP = `
  <div class="wis-bg ds-bg" aria-hidden="true">
    <div class="du-half"></div>
  </div>`

const RIBBON_BACKDROP = `
  <div class="wis-bg ds-bg wis-anim-drift" aria-hidden="true">
    <div class="ri-wash"></div>
  </div>`

const EDITORIAL_BACKDROP = `
  <div class="wis-bg ds-bg" aria-hidden="true"><div class="ed-wash"></div></div>`

const PAPER_BACKDROP = `
  <div class="wis-bg ds-bg" aria-hidden="true"><div class="pa-wash"></div></div>`

const STACK_BACKDROP = `
  <div class="wis-bg ds-bg" aria-hidden="true"><div class="st-wash wis-anim-kenburns"></div></div>`

/** Lines a stacked design breaks a quote into, by how much text there is. */
const STACK_LINES = { 'is-xs': 2, 'is-sm': 3, 'is-md': 4, 'is-lg': 5 } as const

const TEMPLATES: Record<WisdomDesign, WisdomTemplate> = {
  aurora: makeDesign('aurora', { backdrop: AURORA_BACKDROP }),

  spotlight: makeDesign('spotlight', {
    backdrop: SPOTLIGHT_BACKDROP,
    footer: '<div class="sp-rule wis-sweep" aria-hidden="true"></div>',
  }),

  editorial: makeDesign('editorial', {
    backdrop: EDITORIAL_BACKDROP,
    footer: '<div class="ed-rule wis-sweep" aria-hidden="true"></div>',
  }),

  neon: makeDesign('neon', { backdrop: NEON_BACKDROP }),

  glass: makeDesign('glass', {
    backdrop: GLASS_BACKDROP,
    // The pane is a sibling of the type, behind it — a real `backdrop-filter`
    // would re-blur every frame the drifting gradient moves underneath it, which
    // is precisely the per-frame repaint the motion rule exists to forbid. A
    // translucent white with an inset highlight reads as glass and costs nothing.
    body: (text) => `
      <div class="gl-pane wis-in wis-in-1">
        <blockquote class="ds-quote">${text}</blockquote>
      </div>`,
  }),

  stack: makeDesign('stack', {
    backdrop: STACK_BACKDROP,
    body: (text, ctx) => {
      const lines = balancedLines(text, STACK_LINES[ctx.tier])
      // Each line is its own block so it can be staggered and so the accent bar
      // behind the marked line ends exactly where its words do — a background on
      // the whole block would paint the full rectangle, ragged edge and all.
      const inner = lines
        .map(
          (line, i) =>
            `<span class="sk-line${i % 2 === 1 ? ' sk-mark' : ''} wis-in" ` +
            `style="animation-delay:${120 + i * 110}ms">${line}</span>`,
        )
        .join('')
      return `<blockquote class="ds-quote sk-body">${inner}</blockquote>`
    },
  }),

  duotone: makeDesign('duotone', { backdrop: DUOTONE_BACKDROP }),

  ribbon: makeDesign('ribbon', {
    backdrop: RIBBON_BACKDROP,
    body: (text) => `
      <div class="ri-band wis-sweep">
        <blockquote class="ds-quote wis-in wis-in-2">${text}</blockquote>
      </div>`,
  }),

  orbit: makeDesign('orbit', { backdrop: ORBIT_BACKDROP }),

  paper: makeDesign('paper', {
    backdrop: PAPER_BACKDROP,
    footer: '<div class="pa-rule wis-sweep" aria-hidden="true"></div>',
  }),
}

export const DEFAULT_DESIGN: WisdomDesign = 'editorial'

/**
 * The template for `design`, falling back to a real one rather than trusting the
 * lookup. The caller derives it from a seeded shuffle over the same list, so this
 * should never miss — but "should never" is not a thing to render a blank screen
 * on, and `editorial` is the safest landing: no ornament, no line-breaking, and it
 * looks intentional at any length.
 */
export function templateFor(design: unknown): WisdomTemplate {
  const key = typeof design === 'string' ? design : ''
  const lookup: Record<string, WisdomTemplate | undefined> = TEMPLATES
  return lookup[key] ?? TEMPLATES[DEFAULT_DESIGN]
}
