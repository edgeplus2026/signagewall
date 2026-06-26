import { effect } from '@preact/signals'

import { restartPlayer } from '../restart'
import { dailyReload } from '../store'
import type { DailyReloadSetting } from '../types'

/**
 * Longest single timer we ever arm. We never sleep straight through to the
 * target in one `setTimeout` — partly because very long timers drift (the page
 * can be throttled/suspended), partly so we re-evaluate against the wall clock
 * periodically. Far from the target we tick at this coarse cadence; as the
 * target approaches the chunk shrinks to exactly the remaining time, so the
 * final tick lands on the minute without polling every second all day.
 */
const MAX_CHUNK_MS = 30 * 60 * 1000

/** How close to the target counts as "now" — fire the reload at the next tick. */
const FIRE_WINDOW_MS = 1000

/** Injectable clock/timer seam so the scheduler is deterministic in tests. */
export interface DailyReloadDeps {
  now: () => number
  setTimer: (fn: () => void, ms: number) => number
  clearTimer: (id: number) => void
  onReload: () => void
}

const defaultDeps: DailyReloadDeps = {
  now: () => Date.now(),
  setTimer: (fn, ms) => window.setTimeout(fn, ms),
  clearTimer: (id) => {
    window.clearTimeout(id)
  },
  onReload: () => {
    restartPlayer()
  },
}

/**
 * Computes the next absolute time (epoch ms) the daily reload should fire, in
 * the device's **local** timezone. Always returns a strictly future instant: if
 * today's `HH:mm` has already passed, it targets tomorrow. Anchoring on an
 * absolute target (rather than accumulating intervals) makes the schedule robust
 * to clock skew and device sleep — every re-evaluation recomputes from `from`.
 *
 * DST safety: on a spring-forward day the configured `HH:mm` may fall in the
 * skipped hour, and `setHours` then normalizes to a different wall-clock time
 * (e.g. 02:30 → 03:30). We accept that one-day, ≤1h drift rather than chase
 * exact wall-clock alignment; the important guarantee is that the result is
 * always strictly in the future, so the loop can never get stuck on a past or
 * just-fired instant (which would otherwise double-fire on a fall-back day).
 */
export function nextReloadAt(time: string, from: number): number {
  const [hours, minutes] = time.split(':').map((part) => Number(part))
  const target = new Date(from)
  target.setHours(hours, minutes, 0, 0)
  // Loop rather than add a single day: if a DST gap made setHours land on or
  // before `from` even after +1 day (pathological), keep advancing until the
  // target is strictly in the future.
  while (target.getTime() <= from) {
    target.setDate(target.getDate() + 1)
  }
  return target.getTime()
}

/**
 * Self-pacing scheduler for the automatic daily reload. It never polls on a
 * fixed short interval: it sleeps in chunks capped at {@link MAX_CHUNK_MS} and
 * shrinking to the exact remaining time as the target nears, so a screen idles
 * cheaply for most of the day and only ticks finely in the final minutes.
 *
 * Offline-safe: the setting is read from persistent storage by the caller, so
 * the loop keeps running with no network. Re-applying a setting (enable/disable
 * or new time) simply rebases the loop against the new absolute target.
 */
export class DailyReloadScheduler {
  private setting: DailyReloadSetting | null = null
  private timer: number | undefined
  private targetAt = 0
  private readonly deps: DailyReloadDeps

  constructor(deps: Partial<DailyReloadDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps }
  }

  /** Applies a setting and (re)bases the loop. Idempotent for the same value. */
  apply(setting: DailyReloadSetting): void {
    this.setting = setting
    this.stopTimer()

    if (!setting.enabled) {
      this.targetAt = 0
      return
    }

    this.targetAt = nextReloadAt(setting.time, this.deps.now())
    this.scheduleNextChunk()
  }

  /** Stops the scheduler entirely (e.g. on teardown). */
  stop(): void {
    this.setting = null
    this.targetAt = 0
    this.stopTimer()
  }

  private scheduleNextChunk(): void {
    const remaining = this.targetAt - this.deps.now()

    if (remaining <= FIRE_WINDOW_MS) {
      this.fire()
      return
    }

    const delay = Math.min(remaining, MAX_CHUNK_MS)
    this.timer = this.deps.setTimer(() => {
      this.timer = undefined
      this.onTick()
    }, delay)
  }

  private onTick(): void {
    if (!this.setting?.enabled) {
      return
    }
    // Re-evaluate against the wall clock every tick: if we overshot (device was
    // asleep) or are within the fire window, reload now; otherwise sleep on.
    this.scheduleNextChunk()
  }

  private fire(): void {
    // Re-arm for the NEXT day before reloading. On the web `onReload()` reloads
    // the page and this scheduler is discarded — harmless. But on a native host
    // the restart goes through an async/native bridge (e.g. Tauri relaunch) and
    // the JS context keeps running until the process is actually torn down; if
    // that bridge is slow, no-ops, or falls back to a reload the WebView
    // ignores, re-basing here is what keeps the daily reload firing on
    // subsequent days instead of dying on a past target.
    if (this.setting?.enabled) {
      this.targetAt = nextReloadAt(this.setting.time, this.deps.now())
      this.scheduleNextChunk()
    }
    this.deps.onReload()
  }

  private stopTimer(): void {
    if (this.timer !== undefined) {
      this.deps.clearTimer(this.timer)
      this.timer = undefined
    }
  }
}

/**
 * Wires a {@link DailyReloadScheduler} to the `dailyReload` store signal so any
 * change (CMS push, persisted boot value) rebases the loop. Reads the signal's
 * seeded-from-storage value immediately, so it works before the socket connects
 * and while fully offline. Returns a disposer.
 */
export function startDailyReload(): () => void {
  const scheduler = new DailyReloadScheduler()
  const stop = effect(() => {
    scheduler.apply(dailyReload.value)
  })
  return () => {
    stop()
    scheduler.stop()
  }
}
