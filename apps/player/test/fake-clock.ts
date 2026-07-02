/**
 * A controllable clock + timer queue shared by the wall-clock scheduler specs
 * (daily-reload, availability) so their timer semantics are validated against
 * one implementation instead of drifting copies.
 */
export class FakeClock {
  private current: number
  private nextId = 1
  private timers = new Map<number, { fireAt: number; fn: () => void }>()

  constructor(startMs = 0) {
    this.current = startMs
  }

  now = (): number => this.current

  setTimer = (fn: () => void, ms: number): number => {
    const id = this.nextId++
    this.timers.set(id, { fireAt: this.current + ms, fn })
    return id
  }

  clearTimer = (id: number): void => {
    this.timers.delete(id)
  }

  /** Advances time, firing every due timer at its scheduled instant, in order. */
  advance(ms: number): void {
    const until = this.current + ms
    // Loop because a fired timer may schedule the next chunk.
    for (;;) {
      const due = [...this.timers.entries()]
        .filter(([, t]) => t.fireAt <= until)
        .sort((a, b) => a[1].fireAt - b[1].fireAt)
      if (due.length === 0) {
        break
      }
      const [id, timer] = due[0]
      this.timers.delete(id)
      this.current = timer.fireAt
      timer.fn()
    }
    this.current = until
  }

  /**
   * Simulates device sleep: time leaps forward WITHOUT timers firing on
   * schedule; on wake, every overdue timer fires late at the wake instant.
   */
  jump(ms: number): void {
    this.current += ms
    for (;;) {
      const due = [...this.timers.entries()]
        .filter(([, t]) => t.fireAt <= this.current)
        .sort((a, b) => a[1].fireAt - b[1].fireAt)
      if (due.length === 0) {
        break
      }
      const [id, timer] = due[0]
      this.timers.delete(id)
      timer.fn()
    }
  }

  get pending(): number {
    return this.timers.size
  }
}
