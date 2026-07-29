import {
  isAvailabilityOn,
  nextAvailabilityBoundary,
} from '@signagewall/player-contract'
import { effect } from '@preact/signals'

import { availabilityOn, snapshot } from '../store'
import type { AvailabilityRule } from '../types'

/**
 * Longest single timer we ever arm — same reasoning as daily-reload: very long
 * timers drift (throttled/suspended pages), and re-evaluating against the wall
 * clock every chunk keeps the schedule correct across device sleep and DST.
 */
const MAX_CHUNK_MS = 30 * 60 * 1000

/**
 * Floor for a timer delay. A tick can land marginally before the boundary
 * (timer rounding); clamping to ≥1s means we re-check at most once per second,
 * and only within the final second before a flip — never a hot loop.
 */
const MIN_TICK_MS = 1000

/** Injectable clock/timer seam so the scheduler is deterministic in tests. */
export interface AvailabilityDeps {
  now: () => number
  setTimer: (fn: () => void, ms: number) => number
  clearTimer: (id: number) => void
  /** Publishes the current on/off state (defaults to the store signal). */
  setOn: (on: boolean) => void
}

const defaultDeps: AvailabilityDeps = {
  now: () => Date.now(),
  setTimer: (fn, ms) => window.setTimeout(fn, ms),
  clearTimer: (id) => {
    window.clearTimeout(id)
  },
  setOn: (on) => {
    availabilityOn.value = on
  },
}

/**
 * Drives the standby state from the screen's availability rule, fully locally
 * (offline-safe, indefinitely — the rule is a standing config, not a forecast).
 * A twin of {@link DailyReloadScheduler}'s chunked wall-clock pattern, with one
 * deliberate difference: every tick is an idempotent *recomputation* of both
 * the state and the next boundary, never a blind toggle — so a device that
 * slept across several boundaries (on→off→on) wakes into the correct final
 * state by construction.
 */
export class AvailabilityScheduler {
  private rule: AvailabilityRule | undefined
  private timer: number | undefined
  private readonly deps: AvailabilityDeps

  constructor(deps: Partial<AvailabilityDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps }
  }

  /** Applies a rule and (re)bases the loop. Idempotent for the same value. */
  apply(rule: AvailabilityRule | undefined): void {
    this.rule = rule
    this.stopTimer()
    this.evaluate()
  }

  /**
   * Stops the scheduler and resets to on, so teardown (HMR, unmount) can never
   * strand the device on a black screen.
   */
  stop(): void {
    this.rule = undefined
    this.stopTimer()
    this.deps.setOn(true)
  }

  private evaluate(): void {
    const nowMs = this.deps.now()
    const at = new Date(nowMs)

    this.deps.setOn(isAvailabilityOn(this.rule, at))

    const boundary = nextAvailabilityBoundary(this.rule, at)
    if (!boundary) {
      // Steady state forever: always-on, weekly with no enabled days, or a
      // special range already past its end. Nothing to arm; a rule change
      // re-enters through apply().
      return
    }

    const delay = Math.min(
      Math.max(boundary.getTime() - nowMs, MIN_TICK_MS),
      MAX_CHUNK_MS,
    )
    this.timer = this.deps.setTimer(() => {
      this.timer = undefined
      this.evaluate()
    }, delay)
  }

  private stopTimer(): void {
    if (this.timer !== undefined) {
      this.deps.clearTimer(this.timer)
      this.timer = undefined
    }
  }
}

/**
 * Wires an {@link AvailabilityScheduler} to the snapshot's availability rule so
 * any change (CMS push via content:update, persisted boot rehydration) rebases
 * the loop. Works fully offline — the rule rides inside the IndexedDB-persisted
 * snapshot. Returns a disposer.
 */
export function startAvailability(): () => void {
  const scheduler = new AvailabilityScheduler()
  const stop = effect(() => {
    scheduler.apply(snapshot.value?.availability)
  })
  return () => {
    stop()
    scheduler.stop()
  }
}
