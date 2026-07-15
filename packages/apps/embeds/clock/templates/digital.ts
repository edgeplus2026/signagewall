import type { ClockContext, ClockTemplate } from '../context.js'
import { dateLabel, timeParts } from '../format.js'
import './digital.css'

/**
 * "Digital" — the time, in numbers, as large as the screen will take.
 *
 * The plain one, and the default. It is the clock people actually want on a wall:
 * legible from the far end of a corridor, no ornament, nothing to decode.
 *
 * `paint` writes into spans it knows exist, because `render` built them — it never
 * touches `innerHTML` on the face itself, so the entrance animation and the colon's
 * pulse survive every tick. Writing `textContent` on a span whose text hasn't
 * changed is free, so there is no need to diff before writing.
 */
export const digitalTemplate: ClockTemplate = {
  render(ctx: ClockContext): string {
    const seconds = ctx.showSeconds
      ? '<span class="ck-sep ck-digital-sep-sm">:</span><span class="ck-digital-seconds" data-seconds></span>'
      : ''

    const period = ctx.hour12
      ? '<span class="ck-digital-period" data-period></span>'
      : ''

    const date = ctx.showDate ? '<div class="ck-date" data-date></div>' : ''

    return `
      <div class="ck-digital ck-digits">
        <span data-hour></span>
        <span class="ck-sep">:</span>
        <span data-minute></span>
        ${seconds}
        ${period}
      </div>
      ${date}`
  },

  paint(root: HTMLElement, ctx: ClockContext): void {
    const { hour, minute, second, period } = timeParts(ctx)

    write(root, '[data-hour]', hour)
    write(root, '[data-minute]', minute)
    write(root, '[data-seconds]', second)
    write(root, '[data-period]', period)

    if (ctx.showDate) {
      write(root, '[data-date]', dateLabel(ctx.now))
    }
  },
}

/** Set an element's text, if the face is currently showing that element at all. */
function write(root: HTMLElement, selector: string, value: string): void {
  const el = root.querySelector(selector)
  if (el) {
    el.textContent = value
  }
}
