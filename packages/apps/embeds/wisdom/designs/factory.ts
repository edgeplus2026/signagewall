import type { WisdomDesign } from '../../../src/wisdom/designs.js'
import type { WisdomContext, WisdomTemplate } from '../context.js'
import { escapeHtml } from '../format.js'

/**
 * Every design is the same three things — a backdrop, a quote, an author — so
 * they are built from one factory rather than written out ten times.
 *
 * What a design actually supplies is its BACKDROP (the gradient, the ornament,
 * whatever moves) and a stylesheet. The layout, the escaping, the entrance
 * staggering and the length tier are handled here, once. Ten hand-rolled
 * templates would be ten places for the same escaping bug to hide.
 *
 * The `body` hook is the escape valve for the designs that genuinely need
 * different markup — `stack` breaks the quote into per-line spans, `duotone`
 * splits the frame. They still get the skeleton and the escaping for free.
 */

export interface DesignSpec {
  /** Static markup for the moving/painted layer behind the type. */
  backdrop?: string
  /** Replaces the default quote markup. Receives ALREADY-ESCAPED text. */
  body?: (escapedText: string, ctx: WisdomContext) => string
  /** Extra markup after the author (a rule, a badge, a caption). */
  footer?: string
}

export function makeDesign(key: WisdomDesign, spec: DesignSpec): WisdomTemplate {
  return {
    render(ctx: WisdomContext): string {
      // The single point where third-party text stops being trusted. Every design
      // gets its text from here, so none of them can forget.
      const text = escapeHtml(ctx.text)

      const quote =
        spec.body?.(text, ctx) ??
        `<blockquote class="ds-quote wis-in wis-in-1">${text}</blockquote>`

      const author =
        ctx.author === undefined
          ? ''
          : `<div class="ds-author wis-in wis-in-2">${escapeHtml(ctx.author)}</div>`

      return `
        <div class="ds ds-${key} ${ctx.tier}">
          ${spec.backdrop ?? ''}
          <div class="ds-content">
            ${quote}
            ${author}
            ${spec.footer ?? ''}
          </div>
        </div>`
    },
  }
}

/**
 * Break a quote into balanced lines, never mid-word — for the designs that set
 * type line by line rather than letting the browser wrap it.
 *
 * Greedy fill against a budget recomputed from what's left, rather than a fixed
 * width. That is what stops the last line coming out as one orphaned word beside a
 * full one, which is the failure that makes stacked type look accidental. A real
 * minimum-raggedness pass (Knuth–Plass) would be lovely on a page and is pointless
 * on a wall with four lines.
 */
export function balancedLines(text: string, count: number): string[] {
  const words = text.split(/\s+/).filter((word) => word !== '')
  if (words.length === 0) {
    return []
  }

  const lines: string[] = []
  let remaining = [...words]

  for (let line = count; line > 0; line -= 1) {
    if (remaining.length === 0) {
      break
    }
    // Always leave at least one word for each line still to come.
    const maxWords = remaining.length - (line - 1)
    const budget = Math.ceil(remaining.join(' ').length / line)

    let taken = 0
    let width = 0
    while (taken < maxWords) {
      const word = remaining[taken] as string
      const next = width === 0 ? word.length : width + 1 + word.length
      // A line is never empty, however long a single word runs.
      if (taken > 0 && next > budget) {
        break
      }
      width = next
      taken += 1
    }

    lines.push(remaining.slice(0, taken).join(' '))
    remaining = remaining.slice(taken)
  }

  // A very long trailing word rides on the last line rather than vanishing.
  if (remaining.length > 0 && lines.length > 0) {
    lines[lines.length - 1] += ` ${remaining.join(' ')}`
  }

  return lines
}
