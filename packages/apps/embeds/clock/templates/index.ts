import type { ClockFace } from '../../../src/clock/faces.js'
import type { ClockTemplate } from '../context.js'
import { analogTemplate } from './analog.js'
import { digitalTemplate } from './digital.js'
import { flipTemplate } from './flip.js'
import { orbitTemplate } from './orbit.js'
import { wordTemplate } from './word.js'

/**
 * The face registry. One entry per value in `CLOCK_FACES`
 * (`src/clock/faces.ts`) — and because {@link TEMPLATES} is typed
 * `Record<ClockFace, ClockTemplate>`, adding a face to that list without a template
 * here is a type error, not a blank screen on a wall somewhere.
 *
 * Adding a face:
 *   1. add `{ value: 'binary', label: '…' }` to CLOCK_FACES
 *   2. write `templates/binary.ts` exporting a ClockTemplate (+ its own CSS)
 *   3. add `binary: binaryTemplate` below
 *
 * A face is BUILT once and PATCHED every second — see `../context.ts`, which is
 * where the reason lives and which anyone writing a sixth face should read first.
 */

const TEMPLATES: Record<ClockFace, ClockTemplate> = {
  digital: digitalTemplate,
  analog: analogTemplate,
  flip: flipTemplate,
  word: wordTemplate,
  orbit: orbitTemplate,
}

/** The face used when the config names none, or names one we don't ship. */
export const DEFAULT_FACE: ClockFace = 'digital'

/**
 * The template for a config's `face`. Falls back to the default rather than
 * trusting the value: an instance saved against a newer manifest (or an older one
 * whose face we since dropped) must still render something.
 */
export function templateFor(name: unknown): ClockTemplate {
  const key = typeof name === 'string' ? name : ''
  const lookup: Record<string, ClockTemplate | undefined> = TEMPLATES
  return lookup[key] ?? TEMPLATES[DEFAULT_FACE]
}
