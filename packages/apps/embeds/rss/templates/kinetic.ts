import { mediaFrameHtml, progressHtml, qrPanelHtml } from '../chrome.js'
import { escapeHtml, timeAgo } from '../format.js'
import type { RssTemplate, RssTemplateContext } from './index.js'
import './kinetic.css'

/**
 * "Kinetic" — the one that performs.
 *
 * Three things happen at once and none of them are subtle: a solid slab of accent
 * wipes in from the left, the picture opens behind it like a shutter, and the
 * headline lands one LETTER at a time, each one flipping up out of the page on a
 * 3D hinge. It is the loudest layout here and it is meant to be.
 *
 * The letters are the reason it exists. Splitting a headline into characters is
 * the sort of thing that looks gratuitous written down and then stops a room when
 * it's on a wall — a word arriving is information, a word ASSEMBLING is a thing
 * happening.
 *
 * Every character is escaped: this is a stranger's headline, and it is going
 * through `innerHTML` one span at a time.
 */

/**
 * The stagger is capped so the tail of a long headline isn't still flipping in as
 * the story leaves.
 */
const MAX_STAGGER = 90

/**
 * And the SPAN COUNT is capped, which matters far more.
 *
 * Nothing upstream bounds a title's length. The connector caps the item list at 30
 * and truncates summaries at 300 characters, but a title is passed through whole —
 * and feeds do ship monsters (a malformed CDATA block, an article body pasted into
 * `<title>`). One span per character with one compositor animation each, rebuilt on
 * every rotation tick, is a freeze rather than a slow frame on the kind of Android
 * stick these things actually run on. Only three lines are ever visible anyway.
 */
const MAX_CHARS = 200

/** Words stay whole so the line still wraps like a line; letters flip inside them. */
function kineticLetters(title: string): string {
  let n = 0
  const words: string[] = []

  for (const word of title.split(/\s+/)) {
    if (word === '' || n >= MAX_CHARS) {
      continue
    }
    const letters = [...word]
      .map((letter) => {
        // Past the stagger cap the letters still render — they just arrive
        // together, rather than each waiting for a turn that never comes.
        const delay = Math.min(n, MAX_STAGGER)
        n += 1
        return `<span class="kn-c" style="--i:${delay}">${escapeHtml(letter)}</span>`
      })
      .join('')
    words.push(`<span class="kn-w">${letters}</span>`)
  }

  return words.join(' ')
}

export const kineticTemplate: RssTemplate = {
  rotates: true,

  render(ctx: RssTemplateContext): string {
    const item = ctx.items[ctx.index]
    if (item === undefined) {
      return ''
    }

    const qr = qrPanelHtml(ctx.qr(item.link))
    const date = timeAgo(item.publishedAt)
    const summary = item.summary ?? ''

    return `
      <div class="kn${qr ? ' has-qr' : ''}" data-template-root>
        ${mediaFrameHtml(item, 'kn-media')}
        <div class="kn-slab"></div>
        ${progressHtml(ctx.items.length, ctx.index)}
        <div class="kn-content">
          ${ctx.feedTitle ? `<div class="kn-source">${escapeHtml(ctx.feedTitle)}</div>` : ''}
          <h1 class="kn-headline">${kineticLetters(item.title)}</h1>
          ${summary ? `<p class="kn-summary">${escapeHtml(summary)}</p>` : ''}
          ${date ? `<div class="kn-date">${escapeHtml(date)}</div>` : ''}
        </div>
        ${qr}
      </div>`
  },
}
