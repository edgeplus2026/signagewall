import type { ClockContext, ClockTemplate } from '../context.js'
import { dateLabel, timeParts } from '../format.js'
import './flip.css'

/**
 * "Flip" — a split-flap board.
 *
 * The airport-departures clock. It is the one face where the CHANGE is the design:
 * the leaf falls, the new number lands, and a screen you have walked past a hundred
 * times catches your eye once a minute.
 *
 * It is also the only face that genuinely needs the built-once/patched-every-second
 * architecture. A flip is a 520ms animation; a face that re-rendered on the tick
 * would destroy and rebuild the card halfway through, every time, and the animation
 * would never once be seen to finish.
 *
 * HOW A CARD IS BUILT (four layers, and each one earns its place):
 *
 *   top      — a static half showing the NEW value, sitting behind everything
 *   bottom   — a static half showing the OLD value
 *   fold-top — a leaf over `top`, showing the OLD value, which falls away (0 → -90°)
 *   fold-bot — a leaf over `bottom`, showing the NEW value, which falls in (90 → 0°)
 *
 * The two leaves run back to back: as the first drops out of the way it uncovers the
 * new top half, and as the second drops in it covers the old bottom half. Between
 * flips, `fold-bot` simply STAYS at 0° (the animation fills forwards) covering the
 * bottom with the current value — which is why the static bottom half is allowed to
 * still be holding the old one. Nothing has to be cleaned up after the animation
 * ends, so there is no timer and no `animationend` listener to leak.
 */

/** The units a card can show, in order. */
type Unit = 'hour' | 'minute' | 'second'

function cardHtml(unit: Unit): string {
  return `
    <div class="ck-flip-card" data-card="${unit}">
      <div class="ck-flip-half ck-flip-top"><span data-top></span></div>
      <div class="ck-flip-half ck-flip-bottom"><span data-bottom></span></div>
      <div class="ck-flip-leaf ck-flip-leaf-top"><span data-leaf-top></span></div>
      <div class="ck-flip-leaf ck-flip-leaf-bottom"><span data-leaf-bottom></span></div>
    </div>`
}

export const flipTemplate: ClockTemplate = {
  render(ctx: ClockContext): string {
    const seconds = ctx.showSeconds
      ? `<span class="ck-flip-colon">:</span>${cardHtml('second')}`
      : ''

    const period = ctx.hour12
      ? '<div class="ck-flip-period" data-period></div>'
      : ''

    const date = ctx.showDate ? '<div class="ck-date" data-date></div>' : ''

    return `
      <div class="ck-flip">
        ${cardHtml('hour')}
        <span class="ck-flip-colon">:</span>
        ${cardHtml('minute')}
        ${seconds}
        ${period}
      </div>
      ${date}`
  },

  paint(root: HTMLElement, ctx: ClockContext): void {
    const { hour, minute, second, period } = timeParts(ctx)

    flip(root, 'hour', hour)
    flip(root, 'minute', minute)
    flip(root, 'second', second)

    const periodEl = root.querySelector('[data-period]')
    if (periodEl) {
      periodEl.textContent = period
    }

    if (ctx.showDate) {
      const dateEl = root.querySelector('[data-date]')
      if (dateEl) {
        dateEl.textContent = dateLabel(ctx.now)
      }
    }
  },
}

function setText(card: HTMLElement, selector: string, value: string): void {
  const el = card.querySelector(selector)
  if (el) {
    el.textContent = value
  }
}

/** Flip a card to `next`, or leave it alone if it is already showing it. */
function flip(root: HTMLElement, unit: Unit, next: string): void {
  const card = root.querySelector<HTMLElement>(`[data-card="${unit}"]`)
  if (!card) {
    return
  }

  const previous = card.dataset.value

  // Already showing it. `paint` is called again immediately after a config change,
  // so without this guard every card would re-flip onto its own value — the board
  // would flutter whenever the operator touched a setting in the CMS.
  if (previous === next) {
    return
  }

  card.dataset.value = next

  // First paint: fill every layer with the value and DON'T animate. A board that
  // flipped itself in from a blank state on mount would be a nice trick exactly
  // once, and a distraction every time the playlist came back round to it.
  if (previous === undefined) {
    setText(card, '[data-top]', next)
    setText(card, '[data-bottom]', next)
    setText(card, '[data-leaf-top]', next)
    setText(card, '[data-leaf-bottom]', next)
    return
  }

  setText(card, '[data-top]', next) // uncovered as the top leaf falls away
  setText(card, '[data-bottom]', previous) // still the old value, until covered
  setText(card, '[data-leaf-top]', previous) // the leaf that falls away
  setText(card, '[data-leaf-bottom]', next) // the leaf that falls in

  // Restart the animation. Removing the class isn't enough on its own — the browser
  // coalesces the remove and the re-add into no change at all, and the leaves never
  // move. Reading `offsetWidth` between the two forces a reflow, which commits the
  // removal and makes the re-add a genuine restart. It is a hack, it is the standard
  // one, and the alternative (swapping in a cloned node) costs a lot more.
  card.classList.remove('is-flipping')
  void card.offsetWidth
  card.classList.add('is-flipping')
}
