import type { RssDisplayMode } from '../../../src/rss/display-modes.js'
import type { RssItem } from '../../../src/rss/payload.js'
import { atelierTemplate } from './atelier.js'
import { broadcastTemplate } from './broadcast.js'
import { coverTemplate } from './cover.js'
import { editorialTemplate } from './editorial.js'
import { kineticTemplate } from './kinetic.js'
import { mosaicTemplate } from './mosaic.js'
import { primetimeTemplate } from './primetime.js'
import { rollingTemplate } from './rolling.js'
import { statementTemplate } from './statement.js'
import { storyTemplate } from './story.js'

/**
 * The layout registry. One entry per value in `RSS_DISPLAY_MODES`
 * (`src/rss/display-modes.ts`) — and because {@link TEMPLATES} is typed
 * `Record<RssDisplayMode, RssTemplate>`, adding a mode to that list without a
 * template here is a type error, not a blank screen on a wall somewhere.
 *
 * Adding a layout:
 *   1. add `{ value: 'hero', label: '…' }` to RSS_DISPLAY_MODES
 *   2. write `templates/hero.ts` exporting an RssTemplate (+ its own `hero.css`)
 *   3. add `hero: heroTemplate` below
 *
 * Templates are pure and synchronous: they take a context and return HTML.
 * Anything async (the QR codes) is resolved by `main.ts` before a template runs,
 * so rotating between stories never renders a half-built frame.
 *
 * Two markup conventions `main.ts` relies on, so a template never needs an
 * inline event handler (which a stricter iframe CSP would refuse to run):
 *   - the template's outermost element carries `data-template-root`
 *   - a story picture carries `data-fallback` and sits inside a frame marked
 *     `data-media`. When the picture fails to load, `main.ts` adds `is-broken` to
 *     the FRAME — not to the layout. A template is expected to hold the frame's
 *     size and show a placeholder, never to reshape around a missing picture: a
 *     page that changes shape as stories rotate reads as a glitch on a wall. This
 *     is the OFFLINE path as much as the dead-link one — the payload is cached in
 *     the player's snapshot, but the pictures live on someone else's CDN.
 */

/**
 * What a template is handed.
 *
 * Note what ISN'T here: colours. `main.ts` puts the theme's background and text on
 * the app root and the accent into `--rs-accent`, and a template picks them up
 * through `currentColor` and `var(--rs-accent)` — which is how all ten of them do
 * it, and why they all work on both themes without a second code path. An earlier
 * version passed a resolved `RssTheme` object in here as well; not one template
 * ever read it, and it would only have tempted the next one into hard-coding a
 * colour it could have inherited.
 */
export interface RssTemplateContext {
  /** The newest stories, already clamped to the instance's `itemCount`. */
  items: RssItem[]
  /** The story being shown. Layouts that show everything at once ignore it. */
  index: number
  /** The publication's name; may be empty. */
  feedTitle: string
  /**
   * The pre-generated QR code for a story's link, or `null` when the operator
   * turned QR codes off, the story has no link, or it wouldn't encode.
   */
  qr: (link: string | undefined) => string | null
}

export interface RssTemplate {
  /**
   * Whether this layout moves from one story to the next on a timer. A layout
   * that shows every story at once sets `false` and `main.ts` runs no timer for
   * it (the `Seconds per story` setting then simply doesn't apply).
   */
  rotates: boolean
  render(ctx: RssTemplateContext): string
}

const TEMPLATES: Record<RssDisplayMode, RssTemplate> = {
  story: storyTemplate,
  cover: coverTemplate,
  editorial: editorialTemplate,
  rolling: rollingTemplate,
  mosaic: mosaicTemplate,
  primetime: primetimeTemplate,
  broadcast: broadcastTemplate,
  kinetic: kineticTemplate,
  atelier: atelierTemplate,
  statement: statementTemplate,
}

/** The layout used when the config names none, or names one we don't ship. */
export const DEFAULT_MODE: RssDisplayMode = 'story'

/**
 * The template for a config's `displayMode`. Falls back to the default rather
 * than trusting the value: an instance saved against a newer manifest (or an
 * older one whose layout we since dropped) must still render something.
 */
export function templateFor(mode: unknown): RssTemplate {
  const key = typeof mode === 'string' ? mode : ''
  const lookup: Record<string, RssTemplate | undefined> = TEMPLATES
  return lookup[key] ?? TEMPLATES[DEFAULT_MODE]
}
