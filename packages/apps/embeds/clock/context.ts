/**
 * What a clock face is handed, and what it must do with it.
 *
 * THE TWO-METHOD SHAPE IS THE WHOLE DESIGN, and it is why this app doesn't look
 * like the other two. RSS and Weather re-render: their data changes every few
 * minutes, so throwing the DOM away and rebuilding it costs nothing. A clock
 * changes every SECOND. Rebuilding the DOM once a second would restart every
 * animation on the screen sixty times a minute — the split-flap would never
 * complete a flip, the second hand would never sweep, and the whole face would sit
 * there twitching.
 *
 * So a face is built ONCE ({@link ClockTemplate.render}) and then PATCHED
 * ({@link ClockTemplate.paint}) on every tick. `render` is called only when the
 * config changes; `paint` is called once a second and must touch nothing but the
 * values that moved.
 */
export interface ClockContext {
  now: Date
  /** A 12-hour clock, with an AM/PM marker. Otherwise 24-hour. */
  hour12: boolean
  showSeconds: boolean
  showDate: boolean
}

export interface ClockTemplate {
  /**
   * Build the face. Called on the first paint and on every config change — never
   * on a tick. Must produce every element `paint` will later look for, so `paint`
   * can assume its own markup exists and never has to build anything.
   */
  render(ctx: ClockContext): string

  /**
   * Move the clock. Called once a second, on the second.
   *
   * Must be cheap and must be IDEMPOTENT: it can be called twice for the same
   * second (a config change repaints immediately, and the tick may land right
   * behind it), so a face that animates on change has to compare against the value
   * it last wrote rather than assume every call is a new second.
   *
   * `root` is the element `render`'s markup was mounted into.
   */
  paint(root: HTMLElement, ctx: ClockContext): void
}
