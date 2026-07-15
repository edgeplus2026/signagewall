import type { ClockContext, ClockTemplate } from '../context.js'
import { dateLabel, timeParts } from '../format.js'
import './orbit.css'

/**
 * "Orbit" — three rings that close as the hour turns.
 *
 * The hour is the outer ring, the minute the middle, the second the inner. Each one
 * fills as its unit runs out and snaps back to empty when it rolls over, so the face
 * is a picture of how much of the hour — and of the day — is left. The time itself
 * sits in the middle, small, for the people who want the number rather than the
 * shape.
 *
 * It is the one face that shows you the SHAPE of the time rather than its value, and
 * on a desk or in a studio, where the same clock is in the corner of your eye for
 * eight hours, that turns out to be the one you keep looking at.
 */

/**
 * The centre, in the viewBox's own units — and the viewBox starts at `0 0`.
 *
 * The rings are rotated a quarter turn by CSS (so they start at twelve rather than at
 * three), and `transform-box: view-box` places its reference box at the SVG viewport's
 * ORIGIN. With the obvious `-100 -100 200 200` viewBox, `transform-origin: center`
 * therefore resolves to (100, 100) — a full radius down and to the right of where the
 * rings actually are — and the quarter turn swung the whole face off the bottom of the
 * screen. Starting the viewBox at zero makes the reference box and the drawing
 * coordinates the same thing. (The analogue face has the same note, and the same scar.)
 */
const C = 100

/** The three rings, outermost first. */
const RINGS = [
  { unit: 'hour', radius: 88 },
  { unit: 'minute', radius: 70 },
  { unit: 'second', radius: 52 },
] as const

/**
 * A ring's circumference, which is what `stroke-dasharray` is measured in. Every
 * ring is drawn as a full circle and then CLIPPED by its dash — a dash of `p × C`
 * followed by a gap of `C` shows exactly the fraction `p` of it, and nothing else
 * has to be computed.
 */
function circumference(radius: number): number {
  return 2 * Math.PI * radius
}

export const orbitTemplate: ClockTemplate = {
  render(ctx: ClockContext): string {
    const rings = RINGS.filter(
      // The seconds ring is the only one that moves visibly, so an operator who
      // turned seconds off would be left watching a clock that appears frozen. It
      // goes, and the two remaining rings simply have the face to themselves.
      (ring) => ring.unit !== 'second' || ctx.showSeconds,
    )
      .map((ring) => {
        const c = circumference(ring.radius).toFixed(2)
        return `
          <circle class="ck-orbit-track" cx="${C}" cy="${C}" r="${ring.radius}"/>
          <circle class="ck-orbit-fill ck-orbit-${ring.unit}" data-ring="${ring.unit}"
                  cx="${C}" cy="${C}" r="${ring.radius}"
                  stroke-dasharray="0 ${c}" data-circumference="${c}"/>`
      })
      .join('')

    const seconds = ctx.showSeconds
      ? '<span class="ck-orbit-seconds" data-seconds></span>'
      : ''

    const period = ctx.hour12
      ? '<span class="ck-orbit-period" data-period></span>'
      : ''

    const date = ctx.showDate ? '<div class="ck-date" data-date></div>' : ''

    return `
      <div class="ck-orbit">
        <svg class="ck-orbit-svg" viewBox="0 0 ${C * 2} ${C * 2}">
          <g class="ck-orbit-rings">${rings}</g>
        </svg>

        <div class="ck-orbit-readout ck-digits">
          <div class="ck-orbit-time">
            <span data-hour></span><span class="ck-sep">:</span><span data-minute></span>
          </div>
          <div class="ck-orbit-sub">
            ${seconds}
            ${period}
          </div>
        </div>
      </div>
      ${date}`
  },

  paint(root: HTMLElement, ctx: ClockContext): void {
    const { now } = ctx
    const seconds = now.getSeconds()
    const minutes = now.getMinutes()

    // Each ring is the fraction of its own unit that has elapsed. The fractional
    // part matters: a minute ring that only moved on the minute would sit dead still
    // for sixty seconds at a time, which on a face whose whole idea is motion looks
    // like the clock has stopped.
    setRing(root, 'second', seconds / 60)
    setRing(root, 'minute', (minutes + seconds / 60) / 60)
    setRing(root, 'hour', ((now.getHours() % 12) + minutes / 60) / 12)

    const parts = timeParts(ctx)
    write(root, '[data-hour]', parts.hour)
    write(root, '[data-minute]', parts.minute)
    write(root, '[data-seconds]', parts.second)
    write(root, '[data-period]', parts.period)

    if (ctx.showDate) {
      write(root, '[data-date]', dateLabel(now))
    }
  },
}

function write(root: HTMLElement, selector: string, value: string): void {
  const el = root.querySelector(selector)
  if (el) {
    el.textContent = value
  }
}

/** Fill a ring to `progress` (0–1) of the way round. */
function setRing(root: HTMLElement, unit: string, progress: number): void {
  const ring = root.querySelector<SVGCircleElement>(`[data-ring="${unit}"]`)
  if (!ring) {
    return
  }

  const total = Number(ring.dataset.circumference)
  if (!Number.isFinite(total)) {
    return
  }

  const filled = total * Math.min(1, Math.max(0, progress))

  // The wrap. At 59 → 0 the fill collapses from a whole ring to nothing, and with a
  // transition on it that collapse would animate — the ring would visibly UNWIND
  // backwards once a minute. So the transition is suppressed for exactly the tick
  // that goes backwards, and the ring snaps to empty the way it should.
  const previous = Number(ring.dataset.filled ?? 0)
  ring.style.transitionDuration = filled < previous ? '0ms' : ''

  ring.style.strokeDasharray = `${filled.toFixed(2)} ${total.toFixed(2)}`
  ring.dataset.filled = String(filled)
}
