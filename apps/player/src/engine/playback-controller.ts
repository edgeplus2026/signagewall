import type { PlayerSnapshot, Renderable } from '../types'
import { reportError } from '../sentry'
import { holdsVideoDecoder } from './decoder-apps'
import { itemRequiresNetwork } from './network-apps'
import { Slot } from './slot'

/**
 * The slice of {@link Slot} the controller drives. Extracted as an interface so
 * the playback loop can be unit-tested against a deterministic fake (no real
 * `<img>`/`<video>` decode), while production wires the real pooled slot.
 */
export interface PlaybackSlot {
  readonly el: HTMLElement
  prepare(item: Renderable, volume: number): Promise<void>
  /**
   * Reveals the slot. `direction` is the loop's direction of travel and only
   * steers which edge the slide comes from; it is optional so a test fake can
   * ignore presentation entirely.
   *
   * `onFailed` is how a slot says the item stopped being viable AFTER it went on
   * screen — a decode error, or a picture that simply stopped moving. Optional for
   * the same reason: a fake that never plays anything can never fail.
   */
  activate(
    onEnded: () => void,
    direction?: 1 | -1,
    onFailed?: (reason: string) => void,
  ): void
  /** Sends the slot off the opposite edge; pass the same `direction`. */
  deactivate(direction?: 1 | -1): void
  release(): void
  setVolume(volume: number): void
  tryUnmute(): void
  /**
   * Absorbs a refreshed version of the item already loaded here (a new connector
   * payload) without reloading. Returns false when it does not apply — an image,
   * a video, or a different item — which tells the loop nothing needed doing.
   * Optional so a test fake can ignore it.
   */
  applyUpdate?(item: Renderable): boolean
  /**
   * Restarts the on-screen video in place, keeping its decode session. Returns
   * false when that isn't possible, which tells the loop to do a real
   * transition. Optional so a test fake can ignore it.
   */
  replay?(): boolean
  /**
   * The real decoded duration (ms) of the loaded video, or null when unknown or
   * the slot isn't showing a video. Lets the loop key its dwell/watchdog on the
   * actual length instead of trusting (possibly stale) snapshot metadata.
   */
  mediaDurationMs(): number | null
}

const WATCHDOG_INTERVAL_MS = 5_000
const WATCHDOG_GRACE_MS = 15_000
const MIN_DWELL_MS = 1_000
/**
 * Slide duration; must match the `.player-slot` transform transition in CSS.
 * The engine waits it out before recycling the outgoing slot, so a mismatch
 * either cuts the exit short or leaves the buffers held longer than needed.
 */
const TRANSITION_MS = 600
/**
 * Pause before stepping over an item that failed to load.
 *
 * Deliberately shorter than the slide: a failed prepare never swapped, so the
 * outgoing slot is not mid-transition and the skip's `release()` has no animation
 * to cut short. The only thing this delay buys is not hammering a broken source
 * in a tight loop, and a broken item should leave the screen quickly.
 */
const SKIP_DELAY_MS = 250
/**
 * Extra grace before the back buffer is touched while a video plays — see
 * {@link PlaybackController.schedulePreload}. Long enough for a fresh decode
 * session to settle, short enough that the next item is still warm in time.
 */
const VIDEO_SETTLE_MS = 3_000

/**
 * One completed appearance of a content item on the screen — the unit
 * proof-of-play is built from.
 *
 * Emitted when the item LEAVES, never when it arrives, because the thing being
 * reported is how long it was up and that is not known until it is over. An item
 * that fails to load never produces one: it was never on screen, so it was never
 * played, and counting it would be the report claiming something that did not
 * happen.
 */
export interface PlaybackRecord {
  /**
   * What played, stable across playlist edits. Falls back to the slot id when
   * the snapshot predates `contentId` — the report is then less stable, which is
   * better than losing the play.
   */
  contentId: string
  kind: Renderable['kind']
  /** App slug, for an app item. Absent for media. */
  slug?: string
  /** Device clock, ms. Corrected server-side against the reported skew. */
  startedAt: number
  endedAt: number
}

export interface ControllerCallbacks {
  onItem?: (item: Renderable) => void
  onError?: (error: unknown, item?: Renderable) => void
  /**
   * A play finished. Fires once per appearance — a clip that loops on a one-item
   * playlist produces one of these per pass, not one for the whole night.
   */
  onPlay?: (record: PlaybackRecord) => void
}

export interface ControllerOptions {
  /**
   * Follow (mirror) mode: the controller never advances on its own — no dwell
   * timer, no video-`ended` advance, no skip-on-error advance, no watchdog
   * force-advance. It only changes item when {@link PlaybackController.showItem}
   * is called. Used by the CMS preview so it tracks the real device 1:1 instead
   * of running its own drifting clock.
   */
  follow?: boolean
  /**
   * Predicate for "this item needs live internet and must be skipped while
   * offline" (network-only apps like YouTube/Web/Canva). Injectable so the loop
   * can be unit-tested with a deterministic fake; production defaults to the
   * manifest-derived {@link itemRequiresNetwork}.
   */
  requiresNetwork?: (item: Renderable) => boolean
}

/**
 * Drives the playback loop over two pooled {@link Slot}s (A/B double buffer).
 *
 * Correctness model (what keeps a 24/7 screen alive and glitch-free):
 *  - **Single-flight**: only one transition touches the slots at a time, so the
 *    shared back buffer is never clobbered mid-prepare.
 *  - **Epoch**: every transition request bumps `epoch`. An in-flight transition
 *    aborts its swap if a newer request arrived while it was awaiting, and its
 *    `finally` relaunches toward the latest target — so a `content:update` (or a
 *    stray advance) that lands during a slow load never corrupts state.
 *  - **Readiness**: a swap only happens after the back slot's `prepare()` (or the
 *    matching preload) has *resolved* — we never reveal an undecoded image or an
 *    unbuffered video, so the front stays up and there is no black flash.
 *  - **Skip on failure**: a failed item is skipped, never blocking the loop.
 *  - **Watchdog**: force-advances if the scheduler ever stalls.
 */
export class PlaybackController {
  private readonly slots: [PlaybackSlot, PlaybackSlot]
  private activeIndex = 0
  private items: Renderable[] = []
  private cursor = 0
  private revision: string | null = null
  private volume = 1

  private epoch = 0
  private targetIndex = 0
  private transitioning = false
  private preload: { index: number; promise: Promise<void> } | null = null
  /**
   * The prepare currently in flight on the back slot, whether it came from a
   * preload or was started just-in-time. Kept so a transition that returns to an
   * item already loading REUSES that load instead of restarting it: `prepare()`
   * begins with `release()`, which drops the `<video>` src and throws away every
   * buffered byte. Measured on a real screen — the same 34MB clip issued three
   * `loadstart`s while the operator stepped around it, each one starting the
   * download from zero, which is why an already-slow clip became an endless one.
   */
  private inFlight: { index: number; promise: Promise<void> } | null = null
  /**
   * Set while a transition is parked on {@link awaitPrep}; calling it makes that
   * wait give up so a newer request can proceed. See {@link requestTransition}.
   */
  private supersede: (() => void) | null = null
  /**
   * Loads whose failure has already been surfaced. A prepare can be abandoned by
   * a newer request and then reused by it, so without this the same rejection
   * would be reported from both places.
   */
  private readonly reported = new WeakSet<Promise<void>>()

  private advanceTimer: number | undefined
  private watchdogTimer: number | undefined
  private preloadTimer: number | undefined
  private lastAdvanceAt = 0
  private currentDurationMs = 0
  private destroyed = false
  /** Guards against the watchdog re-reporting the same stall episode each tick. */
  private stallReported = false

  /**
   * The appearance currently on screen, if any. Held rather than derived because
   * closing it needs the moment it STARTED, and by the time an item leaves the
   * cursor has usually already moved on.
   */
  private openPlay: { item: Renderable; startedAt: number } | null = null

  /** Direction of travel (1 = forward, -1 = back); steers skip-on-failure. */
  private direction: 1 | -1 = 1

  /**
   * The index navigation steps FROM — the last item we ATTEMPTED, which is not
   * the same thing as {@link cursor}, the last item that actually reached the
   * screen.
   *
   * They diverge exactly when an item fails to load, and keying `next()` off the
   * cursor there is what let one broken clip trap the loop: the cursor stayed on
   * the last good item, so every press re-computed the same failing neighbour and
   * re-targeted it, forever. Stepping from what we last tried means a bad item is
   * walked over on the first press, the way an operator expects.
   */
  private navIndex = 0

  /** Mirror mode — never auto-advances; driven only by {@link showItem}. */
  private readonly follow: boolean

  /** Live internet availability; network-only apps are skipped while false. */
  private online = true

  /** "Item needs internet" predicate (injectable for tests). */
  private readonly requiresNetwork: (item: Renderable) => boolean

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: ControllerCallbacks = {},
    createSlot: () => PlaybackSlot = () => new Slot(),
    options: ControllerOptions = {},
  ) {
    this.follow = options.follow ?? false
    this.requiresNetwork = options.requiresNetwork ?? itemRequiresNetwork
    this.slots = [createSlot(), createSlot()]
    this.root.append(this.slots[0].el, this.slots[1].el)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibility)
      // Recover sound that the browser's autoplay policy may have forced to
      // muted in a non-kiosk browser — on a video, or on a media app that had to
      // start silent. The first user gesture grants audio permission; replay it
      // onto the slots. On a kiosk (autoplay-with-sound allowed) nothing ever
      // fell back, so the slots have nothing to recover and this is harmless.
      document.addEventListener('pointerdown', this.handleUserGesture)
      document.addEventListener('keydown', this.handleUserGesture)
    }
  }

  private readonly handleUserGesture = (): void => {
    // Only attempt the unmute when the browser actually reports an active user
    // activation; otherwise the unmute would just be rejected (and the picture
    // would briefly re-enter playback for nothing). Where the API is absent we
    // optimistically try — the handler fires inside a real gesture anyway.
    const activation = navigator.userActivation as
      | { isActive: boolean }
      | undefined
    if (activation && !activation.isActive) {
      return
    }
    this.slots[0].tryUnmute()
    this.slots[1].tryUnmute()
  }

  /**
   * Sets playback volume (0–1) on both slots so a live change is immediate.
   * Audio is governed by volume (muted iff 0); a slot the autoplay policy forced
   * to start muted remembers that it owes sound, and the gesture listeners in the
   * constructor replay it through {@link PlaybackSlot.tryUnmute}. On a kiosk
   * (autoplay-with-sound allowed) nothing ever falls back, so that path never runs.
   */
  setVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume))
    if (this.volume === clamped) {
      return
    }
    this.volume = clamped
    this.slots[0].setVolume(clamped)
    this.slots[1].setVolume(clamped)
  }

  /**
   * The part of an item that decides whether the ROTATION changed, as opposed to
   * the data an item happens to be carrying right now.
   *
   * Kind, url and dwell are what the loop schedules on; an app's `config` is what
   * it renders. `data` is deliberately absent — see {@link sameSequence}.
   */
  private static fingerprint(item: Renderable): string {
    const media = item.kind === 'app' ? JSON.stringify(item.config) : item.url
    return `${item.id} ${item.kind} ${media} ${String(item.durationMs)}`
  }

  /**
   * Whether `next` is the same rotation as what is loaded — same items, same
   * order, differing only in the connector payload an app carries.
   *
   * This exists because the snapshot revision moves for reasons that have nothing
   * to do with the rotation. The backend folds every app's `fetchedAt` into it, so
   * a crypto ticker refreshing its prices, an RSS feed gaining a headline, or a
   * calendar syncing produces a brand-new revision for an identical playlist —
   * and treating that as new content restarted the loop at item one. On a
   * twenty-item playlist with a five-minute app in it, the back half of the
   * playlist was never reached at all.
   */
  /**
   * Whether the connector payload on this item changed between two snapshots of
   * the same rotation. Only apps carry one; anything else answers false.
   */
  private static dataMoved(
    previous: Renderable | undefined,
    next: Renderable,
  ): boolean {
    if (next.kind !== 'app') {
      return false
    }
    if (previous?.kind !== 'app') {
      return true
    }
    return (
      JSON.stringify(previous.data ?? null) !==
        JSON.stringify(next.data ?? null) ||
      JSON.stringify(previous.dataMeta ?? null) !==
        JSON.stringify(next.dataMeta ?? null)
    )
  }

  private sameSequence(next: Renderable[]): boolean {
    if (next.length !== this.items.length || next.length === 0) {
      return false
    }
    return next.every(
      (item, index) =>
        PlaybackController.fingerprint(item) ===
        PlaybackController.fingerprint(this.items[index]!),
    )
  }

  /**
   * Loads a snapshot. Ignored if the revision is unchanged (dedupe).
   *
   * A revision change whose rotation is identical (only app payloads moved) swaps
   * the items in place and KEEPS the current position — the loop carries on from
   * where it was, and the fresher payload is picked up the next time each app is
   * prepared. Only a genuinely different rotation re-bases to the head.
   */
  load(snapshot: PlayerSnapshot): void {
    if (snapshot.revision === this.revision && this.items.length > 0) {
      return
    }
    if (this.items.length > 0 && this.sameSequence(snapshot.items)) {
      this.revision = snapshot.revision
      const previous = this.items[this.cursor]
      this.items = snapshot.items
      // The item on screen has to SEE the refresh, or a single-app screen — a
      // menu board, a weather display, the most common signage setup there is —
      // would keep the position and never update, which trades one bug for a
      // worse one. An app absorbs it over the handshake; an image or video has
      // nothing to absorb and answers false, which is fine: its bytes are
      // identical (the url is part of the sequence fingerprint).
      //
      // Only when THIS item's payload actually moved, though. One snapshot
      // carries every app on the screen, so a weather refresh re-pushes the
      // calendar's config too — and a bundle that re-renders on config (most of
      // them do) would restart its scroll for a change that was not its own.
      const current = this.items[this.cursor]
      if (current && PlaybackController.dataMoved(previous, current)) {
        this.slots[this.activeIndex].applyUpdate?.(current)
      }
      // A warmed back buffer holds the PREVIOUS payload for its item. Dropping
      // the bookkeeping (not the load) means the next swap re-prepares it with
      // the new data instead of revealing a stale screenful.
      this.preload = null
      this.inFlight = null
      return
    }
    // The rotation genuinely changed. Before re-basing, check whether the item
    // on screen right now survived the edit — adding a poster to a playlist, or
    // removing one further down it, leaves everything else exactly where it was.
    //
    // Re-basing regardless is what an operator sees as "the screen jumps back to
    // the beginning every time I touch the playlist", and on a long rotation it
    // means the items near the end never get shown at all: each edit sends the
    // loop back to the head before it ever reaches them.
    // Matched on the whole fingerprint, not the id: a slot whose media was
    // replaced in the CMS keeps its id, and resuming on it would leave the old
    // bytes on the wall. Identical fingerprint means the thing on screen is
    // genuinely still the same thing, so there is nothing to reload.
    const showing = this.items[this.cursor]
    const showingPrint = showing
      ? PlaybackController.fingerprint(showing)
      : null
    const resumeAt =
      showingPrint !== null && !this.follow
        ? snapshot.items.findIndex(
            (item) => PlaybackController.fingerprint(item) === showingPrint,
          )
        : -1

    this.revision = snapshot.revision
    this.items = snapshot.items
    this.preload = null
    this.inFlight = null
    this.clearPreloadTimer()

    if (resumeAt !== -1) {
      // Carry on from where the screen already is. No transition: the item is
      // already up, its dwell timer is still running, and its play record stays
      // open — interrupting all three to show the same frame again would be the
      // very jump this avoids. The next advance walks into the new list.
      this.cursor = resumeAt
      this.navIndex = resumeAt
      this.direction = 1
      this.schedulePreload()
      return
    }

    this.cursor = 0
    this.navIndex = 0
    this.direction = 1

    // Follow mode mirrors the device 1:1 and starts at the head; otherwise begin
    // at the first *playable* item, so an offline boot skips a leading network
    // app instead of stalling on it. -1 ⇒ nothing playable (all network apps,
    // offline) — don't transition; the shell shows the branded splash (see
    // store `view`) until connectivity returns.
    const first =
      this.items.length === 0 ? -1 : this.follow ? 0 : this.firstPlayable()
    if (first !== -1) {
      this.requestTransition(first)
      // In follow mode the device owns advancement; we never auto-advance, so
      // there is no stall to watch for. (We still preload the head above via the
      // initial transition; SW-cache warming for offline safety is owned by the
      // sync-layer prefetch, independent of this engine's lifecycle.)
      if (!this.follow) {
        this.startWatchdog()
      }
    }
  }

  /**
   * Reacts to internet availability changing at runtime. Network-only apps are
   * skipped while offline and rejoin the rotation when back online — instantly,
   * with no reload. If the item currently on screen is a network app and we just
   * went offline, jump straight to the next playable item; if nothing is
   * playable, the shell switches to the branded splash and unmounts us. A no-op
   * in follow mode (the device drives advancement, we only mirror it).
   */
  setOnline(online: boolean): void {
    if (this.destroyed || this.online === online) {
      return
    }
    this.online = online
    if (this.follow || this.items.length === 0) {
      return
    }
    const current = this.items[this.cursor]
    if (current && this.playable(current)) {
      // The on-screen item survives; just re-warm the back buffer, since the
      // neighbour in our direction of travel may now be a different item (a
      // network app just dropped out of, or came back into, the rotation).
      this.schedulePreload()
      return
    }
    // The on-screen item just became unplayable (offline landed on a network
    // app) — advance to the next playable item now. If none is playable we leave
    // the last frame; `view` flips to the splash and unmounts us right after.
    const target = this.nextPlayable(this.cursor, this.direction)
    if (target !== -1 && target !== this.cursor) {
      this.requestTransition(target)
    }
  }

  /** True if `item` can play given the current connectivity. */
  private playable(item: Renderable): boolean {
    return this.online || !this.requiresNetwork(item)
  }

  /** First playable index scanning from 0, or -1 if every item needs network. */
  private firstPlayable(): number {
    for (let i = 0; i < this.items.length; i += 1) {
      const item = this.items[i]
      if (item && this.playable(item)) {
        return i
      }
    }
    return -1
  }

  /**
   * Next playable index from `from` travelling in `dir` (wrapping), or -1 if no
   * item is playable. With a single playable item it returns that item's index
   * (including `from` itself), so a lone survivor loops on itself.
   */
  private nextPlayable(from: number, dir: 1 | -1): number {
    const len = this.items.length
    for (let step = 1; step <= len; step += 1) {
      const idx = this.wrap(from + dir * step)
      const item = this.items[idx]
      if (item && this.playable(item)) {
        return idx
      }
    }
    return -1
  }

  /**
   * Follow mode: mirror the device by jumping to the item it reports as now
   * playing. A no-op outside follow mode, or when the id isn't in the current
   * snapshot (a transient cross-revision race — the matching `content:update`
   * lands moments later and re-bases us).
   */
  showItem(itemId: string): void {
    if (!this.follow || this.items.length === 0) {
      return
    }
    const index = this.items.findIndex((item) => item.id === itemId)
    if (index === -1 || index === this.cursor) {
      return
    }
    this.direction = index >= this.cursor ? 1 : -1
    this.requestTransition(index)
  }

  destroy(): void {
    // Close the open appearance BEFORE anything else: standby, an emergency
    // takeover and leaving the page all unmount the stage, and without this the
    // last item of every session would simply never be reported.
    this.endPlay()
    this.destroyed = true
    this.epoch += 1
    // Release a transition parked on a load, so teardown never waits out a
    // 12-second media timeout before the slots are freed.
    this.supersede?.()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility)
      document.removeEventListener('pointerdown', this.handleUserGesture)
      document.removeEventListener('keydown', this.handleUserGesture)
    }
    this.clearAdvanceTimer()
    this.clearPreloadTimer()
    if (this.watchdogTimer !== undefined) {
      window.clearInterval(this.watchdogTimer)
      this.watchdogTimer = undefined
    }
    this.preload = null
    this.inFlight = null
    for (const slot of this.slots) {
      slot.release()
      slot.el.remove()
    }
  }

  /** Manually advance to the next item (e.g. a remote/keyboard control). */
  next(): void {
    this.advance()
  }

  /** Manually step back to the previous item, wrapping at the start. */
  previous(): void {
    if (this.items.length === 0) {
      return
    }
    this.direction = -1
    const target = this.nextPlayable(this.navIndex, -1)
    if (target !== -1) {
      this.requestTransition(target)
    }
  }

  /** Records a new target and kicks (or re-kicks) the single-flight runner. */
  private requestTransition(index: number): void {
    if (this.destroyed) {
      return
    }
    // Cancel any pending warm-up so a preload timer can't fire mid-transition
    // and call prepare() on the slot this transition is already using (which
    // would clobber its in-flight decode and stall the loop). It re-arms after
    // the next successful swap.
    this.clearPreloadTimer()
    this.epoch += 1
    this.targetIndex = index
    // Recorded on REQUEST, not when the load starts: a burst of presses is
    // synchronous, so keying the next step off anything the loop only learns
    // later means every press in the burst computes from the same stale place
    // and five taps move you one item.
    this.navIndex = index
    // Stop any transition that is parked on a slow media load. Bumping the epoch
    // alone used to be the whole story here, which meant a request arriving during
    // a load was recorded but not ACTED on until that load finished — up to
    // LOAD_TIMEOUT_MS later. On a cold cache that is a screen which ignores its
    // operator for nine seconds and then jumps somewhere unrelated, because only
    // the last of the presses it swallowed survived as `targetIndex`.
    this.supersede?.()
    if (!this.transitioning) {
      this.run()
    }
  }

  /**
   * Awaits a slot's prepare, but stops waiting the moment {@link supersede} is
   * called. Resolves true when the content is ready, false when a newer request
   * took over — in which case the caller must not touch the slots, since
   * {@link runTransition}'s `finally` is about to re-run toward the new target.
   *
   * The abandoned load is deliberately left running rather than released: if the
   * new target is the same item (step away and straight back) {@link showAt}
   * reuses it via {@link inFlight}, and otherwise the next `prepare()` releases
   * that slot anyway.
   */
  private awaitPrep(prep: Promise<void>): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.supersede = () => {
        resolve(false)
      }
      // A rejection arriving after we already resolved `false` is inert, but the
      // handler must still be attached or it surfaces as an unhandled rejection.
      prep.then(() => {
        resolve(true)
      }, reject)
    }).finally(() => {
      this.supersede = null
    })
  }

  /**
   * Surfaces a prepare failure exactly once, whichever path notices it.
   *
   * Deduped on the promise rather than the item, because the same load can be
   * abandoned by a press and then picked back up by the request that abandoned
   * it — reporting per call site would double-count that.
   */
  private report(prep: Promise<void>, error: unknown, item: Renderable): void {
    if (this.destroyed || this.reported.has(prep)) {
      return
    }
    this.reported.add(prep)
    this.callbacks.onError?.(error, item)
  }

  /**
   * Keeps watching a load we walked away from, purely so its failure is still
   * reported.
   *
   * This is the hole that made the original bug so hard to see. A press aborts
   * the WAIT, not the load, so a clip that goes on to fail does so with nobody
   * listening — and the harder an operator jabbed at the controls, the more
   * failures got swallowed, until a screen that was visibly broken produced a
   * completely empty console.
   */
  private watchAbandoned(prep: Promise<void>, item: Renderable): void {
    prep.catch((error: unknown) => {
      this.report(prep, error, item)
    })
  }

  private run(): void {
    const epoch = this.epoch
    const index = this.targetIndex
    void this.runTransition(index, epoch)
  }

  private async runTransition(index: number, epoch: number): Promise<void> {
    this.transitioning = true
    try {
      await this.showAt(index, epoch)
    } finally {
      this.transitioning = false
      // A newer request arrived while we ran — honor the latest target.
      if (!this.destroyed && epoch !== this.epoch) {
        this.run()
      }
    }
  }

  /**
   * The on-screen item stopped being viable mid-playback — the decoder raised an
   * error, or the picture simply stopped moving.
   *
   * Until now nothing watched an item after it was put on screen, so this ended as
   * a frozen frame that only the stall watchdog would eventually clear — and that
   * watchdog's patience is proportional to the clip's own length, so a ten-minute
   * video bought ten minutes of a still image. Moving on immediately is what a
   * screen in a shop window needs; the item is reported so the CMS can say which
   * one, rather than the operator guessing.
   */
  private onPlaybackFailed(index: number, reason: string): void {
    if (this.destroyed || index !== this.cursor) {
      return
    }
    const item = this.items[index]
    reportError(new Error(`playback failed: ${reason}`), {
      itemId: item?.id,
      url: item?.kind === 'video' ? item.url : undefined,
    })
    // Follow mode is driven by another device; skipping here would desynchronise
    // the wall. A frozen follower is the lesser evil than a wall out of step.
    if (!this.follow) {
      this.advance()
    }
  }

  /**
   * Steps forward to the next playable item.
   *
   * `naturalEnd` marks the one caller that a video reaching its own end — as
   * opposed to the watchdog forcing a move, or a failure being skipped. It is the
   * only case where repeating the SAME item may reuse the decode session rather
   * than tearing it down and building it again; every other path needs the
   * reload, because the reason it got here is that the current state is suspect.
   */
  private advance(naturalEnd = false): void {
    if (this.items.length === 0) {
      return
    }
    this.direction = 1
    const target = this.nextPlayable(this.navIndex, 1)
    if (target === -1) {
      return
    }
    // A one-item (or lone-survivor) playlist loops onto itself. Replaying in
    // place keeps the decoder open; see Slot.replay for why that matters.
    if (
      naturalEnd &&
      target === this.cursor &&
      !this.transitioning &&
      this.slots[this.activeIndex].replay?.()
    ) {
      // A second pass of the same clip is a second play: the loop counted it,
      // and so must the report. Closing and reopening is what makes a one-item
      // screen report "played 240 times" rather than "played once, for a day".
      this.beginPlay(this.items[this.cursor]!)
      this.lastAdvanceAt = Date.now()
      this.stallReported = false
      return
    }
    this.requestTransition(target)
  }

  /**
   * Opens a new appearance, closing whatever was on screen first.
   *
   * Called at the moment the item is actually REVEALED — not when its load
   * starts — so the measured time is time a viewer could see it.
   */
  private beginPlay(item: Renderable): void {
    this.endPlay()
    this.openPlay = { item, startedAt: Date.now() }
  }

  /**
   * Closes the open appearance and reports it.
   *
   * A zero-or-negative span is dropped: the device clock can step backwards under
   * NTP, and a play of "-3 seconds" is not a measurement, it is a clock event.
   * Losing one appearance is the right trade against poisoning a report that gets
   * shown to somebody's customer.
   */
  private endPlay(): void {
    const open = this.openPlay
    this.openPlay = null
    if (!open) {
      return
    }
    const endedAt = Date.now()
    if (endedAt <= open.startedAt) {
      return
    }
    const { item } = open
    this.callbacks.onPlay?.({
      contentId: item.contentId ?? item.id,
      kind: item.kind,
      ...(item.kind === 'app' ? { slug: item.slug } : {}),
      startedAt: open.startedAt,
      endedAt,
    })
  }

  private wrap(index: number): number {
    const len = this.items.length
    return ((index % len) + len) % len
  }

  private async showAt(index: number, epoch: number): Promise<void> {
    this.clearAdvanceTimer()

    const item = this.items[index]
    if (!item) {
      return
    }

    const back = this.slots[this.activeIndex ^ 1]

    // Await the matching preload if present, else the load already in flight for
    // this very item (never restart one — see {@link inFlight}), else prepare
    // just-in-time. Either way we only proceed once the content is ready.
    let prep: Promise<void>
    if (this.preload && this.preload.index === index) {
      prep = this.preload.promise
    } else if (this.inFlight && this.inFlight.index === index) {
      prep = this.inFlight.promise
    } else {
      prep = back.prepare(item, this.volume)
    }
    this.preload = null
    this.inFlight = { index, promise: prep }

    try {
      if (!(await this.awaitPrep(prep))) {
        // A newer request arrived while we waited. Leave `inFlight` alone so it
        // can be reused, and let runTransition's `finally` drive the new target —
        // but keep listening, or this load's failure would go unreported.
        this.watchAbandoned(prep, item)
        return
      }
    } catch (error) {
      this.inFlight = null
      if (this.destroyed) {
        return
      }
      this.report(prep, error, item)
      if (epoch !== this.epoch) {
        return
      }
      // Follow mode doesn't skip on its own — it waits for the device to move on.
      if (!this.follow) {
        this.scheduleSkip(index)
      }
      return
    }

    // Superseded by a newer load/advance while we were loading — drop this swap.
    if (this.destroyed || epoch !== this.epoch) {
      return
    }
    this.inFlight = null

    const front = this.slots[this.activeIndex]
    back.activate(
      () => {
        // In follow mode the device drives advancement; a video ending here must
        // not move us — we wait for the device's next now-playing report.
        if (!this.follow) {
          this.advance(true)
        }
      },
      this.direction,
      (reason) => this.onPlaybackFailed(index, reason),
    )
    // Slide the swap: the (decoded) back slot moves in while the front moves off
    // the opposite edge. Both are handed the SAME direction so they read as one
    // gesture — and a manual step back reverses it. We only change classes here
    // so the front leaves over CSS without tearing its media down yet; its
    // buffers are reclaimed lazily by `release()` when the slot is next prepared,
    // so we never hide content that a preload just filled.
    front.deactivate(this.direction)
    this.activeIndex ^= 1
    this.cursor = index
    this.lastAdvanceAt = Date.now()
    this.stallReported = false
    // For video, trust the element's real decoded duration over the (possibly
    // stale) snapshot metadata, so neither the dwell nor the watchdog cuts a
    // long or rebuffering clip short. Falls back to metadata when unknown.
    const activeSlot = this.slots[this.activeIndex]
    this.currentDurationMs =
      item.kind === 'video'
        ? (activeSlot.mediaDurationMs() ?? item.durationMs)
        : item.durationMs
    // The item is on screen from here: the swap is done and the slot is active.
    this.beginPlay(item)
    this.callbacks.onItem?.(item)
    // Video advances on its natural `ended` event (wired in activate); we never
    // arm a wallclock cap, which would truncate a rebuffering or wrong-metadata
    // clip. Images/apps have no `ended`, so they dwell on a timer. The watchdog
    // (keyed on the real duration above) is the backstop if a video's `ended` is
    // ever lost. Follow mode never schedules its own advance either.
    if (!this.follow && item.kind !== 'video') {
      this.scheduleAdvance(item)
    }

    // Warm the back buffer with the following item so the next swap is instant —
    // but only after the outgoing slot has finished fading out, since preparing
    // it (which calls release()) would otherwise cut its cross-fade short.
    this.schedulePreload()
  }

  private schedulePreload(): void {
    if (this.preloadTimer !== undefined) {
      window.clearTimeout(this.preloadTimer)
    }
    // Warming the back buffer tears the previous item down first, and on modest
    // hardware that teardown reaches across into the video that just started:
    // an LG webOS TV answered it with MEDIA_ERR_DECODE 200ms later, killing a
    // clip that had been playing happily. It survives once the new decode
    // session has had a moment to settle, so a video gets that moment before we
    // touch the other slot. Everything else warms as soon as the transition ends.
    // Keyed on "does the on-screen item hold a decoder", not on its kind: an
    // active YouTube or stream embed needs exactly the same settling room as an
    // .mp4, and asking about `kind` skipped it for them.
    const settling = holdsVideoDecoder(this.items[this.cursor]) ? VIDEO_SETTLE_MS : 0
    this.preloadTimer = window.setTimeout(() => {
      this.preloadTimer = undefined
      this.preloadNext()
    }, TRANSITION_MS + settling)
  }

  private preloadNext(): void {
    // Never warm the back buffer while a transition is using it — the swap owns
    // the slots until it completes, then re-schedules the preload itself.
    if (this.destroyed || this.transitioning || this.items.length < 2) {
      return
    }
    // Warm the neighbour in the current direction of travel, so back-stepping
    // benefits from the preload instead of always falling back to a JIT prepare.
    // Skip any network-only apps that are currently hidden (offline), so we warm
    // the item we'll actually show next rather than one that gets skipped.
    const next = this.nextPlayable(this.cursor, this.direction)
    const item = next === -1 ? undefined : this.items[next]
    if (!item || next === this.cursor || this.preload?.index === next) {
      return
    }

    // Never bring a second video to readiness while something already holds a
    // decoder. Modest hardware — an LG webOS TV, measured; the Android TV
    // measured here advertises exactly two hardware AVC instances; cheap sticks
    // and older signage players are worse — hands the session to the newcomer:
    // the playing element is paused where it stands and cannot be resumed
    // (re-playing it, or even releasing the second element first, leaves it reset
    // rather than running), or the decode falls back to a software codec that
    // crashes outright. Nothing in the engine can recover from either, so the only
    // fix is not to cause it. The item is prepared just-in-time instead, which
    // costs under a second of the outgoing frame holding — `showAt` awaits prepare
    // either way, so there is still no black flash.
    //
    // The ON-SCREEN side asks `holdsVideoDecoder`, so an active YouTube or stream
    // counts. The INCOMING side deliberately still asks `kind`: a preloaded app is
    // mounted silent and inert until `activate` and opens no decoder, so warming
    // one behind a video is free and must not be suppressed.
    if (holdsVideoDecoder(this.items[this.cursor]) && item.kind === 'video') {
      return
    }

    const back = this.slots[this.activeIndex ^ 1]
    const promise = back.prepare(item, this.volume)
    this.preload = { index: next, promise }
    promise.catch((error: unknown) => {
      // Only report if this preload is still pending. If showAt already consumed
      // it (preload nulled), showAt's own catch handles the failure — avoid a
      // duplicate onError for the same rejection.
      if (this.preload?.index === next) {
        this.preload = null
        this.report(promise, error, item)
      }
    })
  }

  /** Arms the dwell timer for a non-video item (images/apps have no `ended`). */
  private scheduleAdvance(item: Renderable): void {
    this.clearAdvanceTimer()
    this.advanceTimer = window.setTimeout(() => {
      this.advance()
    }, Math.max(MIN_DWELL_MS, item.durationMs))
  }

  private scheduleSkip(index: number): void {
    this.clearAdvanceTimer()
    // Skip in the current direction of travel to the next *playable* item, so a
    // failed item under manual `previous()` keeps stepping back instead of
    // bouncing forward, and offline network apps aren't retried.
    const target =
      this.items.length <= 1 ? index : this.nextPlayable(index, this.direction)
    if (target === -1) {
      return
    }
    this.advanceTimer = window.setTimeout(() => {
      this.requestTransition(target)
    }, SKIP_DELAY_MS)
  }

  private isHidden(): boolean {
    return (
      typeof document !== 'undefined' && document.visibilityState === 'hidden'
    )
  }

  /**
   * When the page returns from a hidden (throttled) state, the gap while hidden
   * is not a real stall: rebase the watchdog baseline and clear the report flag
   * so the loop gets a fresh grace window to resume.
   */
  private readonly handleVisibility = (): void => {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') {
      return
    }
    this.lastAdvanceAt = Date.now()
    this.stallReported = false
  }

  private startWatchdog(): void {
    if (this.watchdogTimer !== undefined) {
      return
    }
    this.watchdogTimer = window.setInterval(() => {
      if (this.destroyed || this.items.length === 0 || this.lastAdvanceAt === 0) {
        return
      }
      // While the page is hidden the browser throttles our timers and pauses
      // media, so the loop legitimately doesn't advance — that gap is not a
      // stall. visibilitychange rebases the baseline when we come back.
      if (this.isHidden()) {
        return
      }
      const stalledFor = Date.now() - this.lastAdvanceAt
      if (stalledFor > this.currentDurationMs + WATCHDOG_GRACE_MS) {
        // Report the stall once per episode, not every tick — a persistent
        // stall (e.g. offline with the next items not yet cached) would
        // otherwise spam a fresh, ever-growing error every interval. The flag
        // resets on the next successful swap.
        if (!this.stallReported) {
          this.stallReported = true
          const current = this.items[this.cursor]
          this.callbacks.onError?.(
            new Error(
              `playback stalled for ${String(stalledFor)}ms ` +
                `(item=${current?.id ?? '?'}:${current?.kind ?? '?'} ` +
                `cursor=${String(this.cursor)} ` +
                `transitioning=${String(this.transitioning)})`,
            ),
          )
        }
        this.advance()
      }
    }, WATCHDOG_INTERVAL_MS)
  }

  private clearAdvanceTimer(): void {
    if (this.advanceTimer !== undefined) {
      window.clearTimeout(this.advanceTimer)
      this.advanceTimer = undefined
    }
  }

  private clearPreloadTimer(): void {
    if (this.preloadTimer !== undefined) {
      window.clearTimeout(this.preloadTimer)
      this.preloadTimer = undefined
    }
  }
}
