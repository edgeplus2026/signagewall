/**
 * Proof-of-play on the wire: what a screen has shown, as totals.
 *
 * Shared by the player (which counts) and the backend (which adds up), so the
 * two can never disagree about what a "play" is.
 *
 * The shape is a SUM, not a log. A screen on a 96-second rotation shows something
 * every twenty seconds or so, and a fleet of five thousand would produce twenty
 * million rows a day — for a question ("how many times did this run, and for how
 * long") that a few hundred numbers answer exactly as well.
 */

/** One content item's totals for one local calendar day on one screen. */
export interface PlaybackTallyPayload {
  /**
   * The media item or app instance — what played, not where it sat in a
   * playlist. A player too old to know the difference sends the slot id instead,
   * which still reports, just less stably across playlist edits.
   */
  contentId: string
  /** Local calendar day on the DEVICE, 'YYYY-MM-DD'. See the note on `at`. */
  day: string
  kind: 'image' | 'video' | 'app'
  /** App slug, so a report can name the item without a second lookup. */
  slug?: string
  plays: number
  airtimeMs: number
  /**
   * Plays per local hour, 0–23. Carried from the first release even though
   * nothing displays it yet: it costs a few dozen bytes, and a screen cannot be
   * asked afterwards what it did last Tuesday at noon.
   */
  hours: number[]
  /**
   * Measured airtime per local hour, 0–23, in milliseconds.
   *
   * The counterpart to `hours`, and the one the coverage report is actually
   * built on: plays alone cannot say how much of an hour had content. It is also
   * the only way to see a screen that is stuck — one play filling a whole hour
   * looks identical to one play in an otherwise empty hour if you only count
   * plays, and a stuck screen is the failure that looks healthiest from outside.
   *
   * Attributed to the hour a play STARTED, like `hours`, so the two always agree.
   * A play spanning midnight lands wholly in the hour it began.
   */
  airtimeHours: number[]
  firstAt: number
  lastAt: number
}

/** One acknowledged delivery of a device's tallies. */
export interface PlaybackBatch {
  /**
   * Batch number, monotonic per device and persisted across reloads.
   *
   * This is what makes an at-least-once channel safe. A lost acknowledgement
   * looks exactly like a lost batch, so the device re-sends — and without a
   * sequence the server would count the same playback twice. Double-counting is
   * worse than losing data here: missing plays look like a quiet screen, invented
   * ones look like fraud.
   */
  seq: number
  /**
   * Which counter the `seq` above belongs to.
   *
   * A screen keeps its identity in the native shell but its counter in web
   * storage, and those are not the same lifetime: a browser evicting storage on a
   * cheap box — or an operator clearing site data — restarts the numbering at 1
   * while the device stays the same. Without this, every batch after such a wipe
   * looks older than what the server has already accepted, and that screen's
   * playback silently stops being recorded, forever, with nothing to show for it.
   *
   * Minted once per counter and persisted beside it, so a fresh counter is
   * visibly a fresh counter rather than an impossible clock.
   */
  origin: string
  /**
   * The device's own clock at the moment it sent this batch — refreshed on every
   * retry, so what the server measures is current rather than however old the
   * batch is.
   *
   * Sent so the server can measure how far off that clock is. A cheap signage box
   * with no battery comes back from a power cut believing it is 1970, and `day`
   * above is stamped in the device's local time — so the server corrects for the
   * measured skew and flags anything it cannot reconcile, rather than filing a
   * week of playback under the wrong date.
   */
  at: number
  tallies: PlaybackTallyPayload[]
}

/** The server's answer. Anything else, and the device keeps the batch. */
export interface PlaybackAck {
  /** True only when the batch was durably recorded (or recognised as a repeat). */
  ok: boolean
}
