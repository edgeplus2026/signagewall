import type { ClockContext, ClockTemplate } from '../context.js'
import { dateLabel } from '../format.js'
import './word.css'

/**
 * "Words" — the time, spelled out on a grid of letters.
 *
 * The whole grid is always on screen, dim; the words that make up the current time
 * are lit. It is the one face that is an object rather than a readout — the letters
 * that aren't part of the answer are not noise, they are what makes the answer
 * appear out of nothing.
 *
 * IT IS ENGLISH, and that is a deliberate limit rather than an oversight. A word
 * clock is a physical grid: the letters are placed so that every phrase it will ever
 * need can be read left-to-right, top-to-bottom, and that layout is welded to the
 * language it was designed for. Serbian ("pet do tri") needs an entirely different
 * grid, not a translated string table — so this face stays English until somebody
 * designs that grid, and the app's other four faces are language-neutral anyway.
 *
 * It ignores `Show seconds` (there is nowhere to put one) and `Time format` (a word
 * clock is inherently twelve-hour). Both are documented on the fields.
 *
 * It rounds to the nearest five minutes, DOWN — the same as every word clock ever
 * built. "Ten past three" is true from 15:10 to 15:14, and a passer-by reading it as
 * approximate is reading it correctly.
 */

/**
 * The grid. Eleven columns, ten rows — the classic layout, and every phrase below is
 * a span of indices into it. The filler letters are not random: they are what is
 * left over once every word has been placed so that no phrase ever has to read
 * backwards or skip a line.
 */
const ROWS = [
  'ITLISASTIME',
  'ACQUARTERDC',
  'TWENTYFIVEX',
  'HALFSTENFTO',
  'PASTERUNINE',
  'ONESIXTHREE',
  'FOURFIVETWO',
  'EIGHTELEVEN',
  'SEVENTWELVE',
  'TENSEOCLOCK',
] as const

const COLUMNS = 11

/** A word on the grid: the row it lives in, and the columns it spans. */
interface Word {
  row: number
  from: number
  /** Exclusive. */
  to: number
}

const IT: Word = { row: 0, from: 0, to: 2 }
const IS: Word = { row: 0, from: 3, to: 5 }

const MINUTES: Record<number, Word[]> = {
  // Index = the five-minute bucket the clock has reached.
  0: [{ row: 9, from: 5, to: 11 }], // O'CLOCK
  1: [{ row: 2, from: 6, to: 10 }], // FIVE  … PAST
  2: [{ row: 3, from: 5, to: 8 }], // TEN
  3: [{ row: 1, from: 2, to: 9 }], // QUARTER
  4: [{ row: 2, from: 0, to: 6 }], // TWENTY
  5: [
    { row: 2, from: 0, to: 6 }, // TWENTY
    { row: 2, from: 6, to: 10 }, // FIVE
  ],
  6: [{ row: 3, from: 0, to: 4 }], // HALF
  7: [
    { row: 2, from: 0, to: 6 }, // TWENTY
    { row: 2, from: 6, to: 10 }, // FIVE  … TO
  ],
  8: [{ row: 2, from: 0, to: 6 }], // TWENTY
  9: [{ row: 1, from: 2, to: 9 }], // QUARTER
  10: [{ row: 3, from: 5, to: 8 }], // TEN
  11: [{ row: 2, from: 6, to: 10 }], // FIVE
}

const PAST: Word = { row: 4, from: 0, to: 4 }
const TO: Word = { row: 3, from: 9, to: 11 }

/** The hours, 1–12, in the order they appear on the grid. */
const HOURS: Record<number, Word> = {
  1: { row: 5, from: 0, to: 3 }, // ONE
  2: { row: 6, from: 8, to: 11 }, // TWO
  3: { row: 5, from: 6, to: 11 }, // THREE
  4: { row: 6, from: 0, to: 4 }, // FOUR
  5: { row: 6, from: 4, to: 8 }, // FIVE
  6: { row: 5, from: 3, to: 6 }, // SIX
  7: { row: 8, from: 0, to: 5 }, // SEVEN
  8: { row: 7, from: 0, to: 5 }, // EIGHT
  9: { row: 4, from: 7, to: 11 }, // NINE
  10: { row: 9, from: 0, to: 3 }, // TEN
  11: { row: 7, from: 5, to: 11 }, // ELEVEN
  12: { row: 8, from: 5, to: 11 }, // TWELVE
}

/** The words that spell the time on `now`. */
function wordsFor(now: Date): Word[] {
  const bucket = Math.floor(now.getMinutes() / 5)
  const words: Word[] = [IT, IS, ...(MINUTES[bucket] ?? [])]

  // Past the half hour the clock counts DOWN to the next one: at twenty to four it
  // is the four that is named, not the three.
  if (bucket >= 1 && bucket <= 6) {
    words.push(PAST)
  } else if (bucket >= 7) {
    words.push(TO)
  }

  const rolls = bucket >= 7
  const hour24 = now.getHours() + (rolls ? 1 : 0)
  // `% 12` gives 0 for both midnight and noon; a clock face calls that twelve.
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12

  const word = HOURS[hour12]
  if (word !== undefined) {
    words.push(word)
  }
  return words
}

/** The flat cell index of a letter, so `paint` can light it by position. */
function cellIndex(row: number, column: number): number {
  return row * COLUMNS + column
}

export const wordTemplate: ClockTemplate = {
  render(ctx: ClockContext): string {
    const cells = ROWS.flatMap((row, rowIndex) =>
      [...row].map(
        (letter, column) =>
          `<span class="ck-word-cell" data-cell="${cellIndex(rowIndex, column)}">${letter}</span>`,
      ),
    ).join('')

    const date = ctx.showDate ? '<div class="ck-date" data-date></div>' : ''

    return `
      <div class="ck-word">
        <div class="ck-word-grid">${cells}</div>
      </div>
      ${date}`
  },

  paint(root: HTMLElement, ctx: ClockContext): void {
    const lit = new Set<number>()
    for (const word of wordsFor(ctx.now)) {
      for (let column = word.from; column < word.to; column += 1) {
        lit.add(cellIndex(word.row, column))
      }
    }

    // Every cell, every second — 110 class toggles, which is nothing, and it means
    // there is no state to keep and nothing to get out of step. `toggle` with an
    // explicit second argument is idempotent, so a repeat paint of the same second
    // changes nothing and re-triggers no transition.
    const cells = root.querySelectorAll<HTMLElement>('[data-cell]')
    for (const cell of cells) {
      const index = Number(cell.dataset.cell)
      cell.classList.toggle('is-lit', lit.has(index))
    }

    if (ctx.showDate) {
      const el = root.querySelector('[data-date]')
      if (el) {
        el.textContent = dateLabel(ctx.now)
      }
    }
  },
}
