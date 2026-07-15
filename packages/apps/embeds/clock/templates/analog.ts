import type { ClockContext, ClockTemplate } from '../context.js'
import { dateLabel, handAngles } from '../format.js'
import './analog.css'

/**
 * "Analogue" — a dial with hands.
 *
 * Ignores `Time format`: a dial is a twelve-hour instrument and there is no such
 * thing as a 24-hour analogue clock face that anyone can read. `Show seconds`
 * removes the second hand. Both are documented on the fields themselves.
 *
 * The dial is drawn once, in SVG, and never touched again — `paint` only rotates
 * three hands.
 */

/**
 * The dial's centre, in the viewBox's own units.
 *
 * THE VIEWBOX STARTS AT 0 0, AND THE DIAL IS CENTRED AT (100, 100). The natural way
 * to draw a clock is a viewBox of `-100 -100 200 200` with everything centred on the
 * origin — and it is a trap, because the hands are rotated with a CSS transform.
 *
 * `transform-box: view-box` puts the reference box at the SVG viewport's ORIGIN, so
 * with a negative `min-x`/`min-y` the box lands offset from the coordinates you are
 * actually drawing in, and `transform-origin: center` resolves to (100, 100) — a
 * point 100 units down and right of the dial's real centre. The hands then swing
 * around a pivot outside the dial and fly off the screen, which is exactly what they
 * did.
 *
 * Keeping `min-x`/`min-y` at zero makes the reference box and the drawing coordinates
 * the same thing, and `center` means what it says.
 */
const C = 100

/** The tick marks: sixty of them, every fifth one an hour. */
function ticksSvg(): string {
  return Array.from({ length: 60 }, (_unused, i) => {
    const isHour = i % 5 === 0
    const angle = (i * 6 * Math.PI) / 180
    const outer = 92
    const inner = isHour ? 78 : 87
    const x1 = (C + Math.sin(angle) * inner).toFixed(2)
    const y1 = (C - Math.cos(angle) * inner).toFixed(2)
    const x2 = (C + Math.sin(angle) * outer).toFixed(2)
    const y2 = (C - Math.cos(angle) * outer).toFixed(2)
    return `<line class="ck-tick${isHour ? ' is-hour' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`
  }).join('')
}

/**
 * 12, 3, 6, 9 — and only those.
 *
 * A dial with no numerals at all is a beautiful object and a poor clock: read at a
 * glance from across a room, it takes a beat to find twelve. All twelve numerals is
 * the other failure — at signage sizes they crowd the hands and the face turns to
 * noise. The quarters are the compromise every good station clock makes.
 */
function numeralsSvg(): string {
  const numerals: Array<[string, number, number]> = [
    ['12', C, C - 64],
    ['3', C + 64, C],
    ['6', C, C + 64],
    ['9', C - 64, C],
  ]
  return numerals
    .map(
      ([label, x, y]) =>
        `<text class="ck-numeral" x="${x}" y="${y}" dominant-baseline="central" text-anchor="middle">${label}</text>`,
    )
    .join('')
}

/** A hand: a line straight up from the centre, with a short tail behind the pivot. */
function handSvg(name: string, className: string, tail: number, length: number): string {
  return (
    `<line class="ck-hand ${className}" data-hand="${name}" ` +
    `x1="${C}" y1="${C + tail}" x2="${C}" y2="${C - length}"/>`
  )
}

export const analogTemplate: ClockTemplate = {
  render(ctx: ClockContext): string {
    const second = ctx.showSeconds
      ? `${handSvg('second', 'ck-hand-second', 18, 82)}<circle class="ck-cap-second" cx="${C}" cy="${C}" r="3.5"/>`
      : ''

    const date = ctx.showDate ? '<div class="ck-date" data-date></div>' : ''

    return `
      <div class="ck-analog">
        <svg class="ck-analog-svg" viewBox="0 0 ${C * 2} ${C * 2}">
          <circle class="ck-dial" cx="${C}" cy="${C}" r="96"/>
          ${ticksSvg()}
          ${numeralsSvg()}

          ${handSvg('hour', 'ck-hand-hour', 12, 52)}
          ${handSvg('minute', 'ck-hand-minute', 16, 76)}
          ${second}
          <circle class="ck-cap" cx="${C}" cy="${C}" r="6"/>
        </svg>
      </div>
      ${date}`
  },

  paint(root: HTMLElement, ctx: ClockContext): void {
    const angles = handAngles(ctx.now)

    // The hour and minute hands drift continuously and can be transitioned freely.
    // The second hand steps, and gets the tighter, springier easing (see the CSS) —
    // which is why the smoothing threshold is generous enough to cover its 6° step
    // but not a resync jump.
    setHand(root, 'hour', angles.hour, 12)
    setHand(root, 'minute', angles.minute, 12)
    setHand(root, 'second', angles.second, 12)

    if (ctx.showDate) {
      const el = root.querySelector('[data-date]')
      if (el) {
        el.textContent = dateLabel(ctx.now)
      }
    }
  },
}

/**
 * Rotate a hand — FORWARDS, always.
 *
 * This is the whole reason the face keeps state. The naive version writes
 * `rotate(seconds * 6)`, which sends the second hand from 354° to 0° at the top of
 * every minute — and with a transition on it, the hand visibly WINDS BACKWARDS the
 * long way round the dial, once a minute, forever. The same thing happens to the
 * minute hand once an hour and the hour hand twice a day.
 *
 * So the angle is ACCUMULATED rather than absolute: each tick takes the shortest
 * forward step from wherever the hand already is (`(raw - last) mod 360`, always
 * positive) and adds it on. The number written into the transform grows without
 * bound — it is at 21,600° by the end of an hour and nobody cares, because a
 * rotation is modular and CSS is perfectly happy with the large value.
 *
 * `maxSmooth` guards the other direction: when a step is bigger than a hand could
 * plausibly have moved in one tick (the player woke from sleep, or the face was
 * hidden and has just been re-mounted), the hand JUMPS instead of sweeping. Without
 * it, coming back from a paused tab produces a slow, ridiculous crawl through
 * fifteen minutes of arc.
 */
function setHand(
  root: HTMLElement,
  name: string,
  raw: number,
  maxSmooth: number,
): void {
  const hand = root.querySelector<SVGElement>(`[data-hand="${name}"]`)
  if (!hand) {
    return
  }

  const previous = Number(hand.dataset.deg ?? raw)
  const last = Number.isFinite(previous) ? previous : raw

  // The forward-only step. `% 360` on a negative difference gives a negative
  // result in JS, hence the `+ 360` before the second modulo.
  const step = (((raw - last) % 360) + 360) % 360
  const next = last + step

  hand.style.transitionDuration = step > maxSmooth ? '0ms' : ''
  hand.style.transform = `rotate(${next.toFixed(3)}deg)`
  hand.dataset.deg = String(next)
}
