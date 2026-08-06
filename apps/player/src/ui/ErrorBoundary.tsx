import { Component, type ComponentChildren } from 'preact'

import { reportError } from '../sentry'

interface Props {
  children: ComponentChildren
}

interface State {
  crashed: boolean
}

const CRASH_STREAK_KEY = 'sw-crash-streak'
const BASE_RELOAD_DELAY_MS = 5_000
const MAX_RELOAD_DELAY_MS = 10 * 60_000
/** A crash this long after the previous one counts as a fresh incident. */
const CRASH_STREAK_RESET_MS = 15 * 60_000

/**
 * Persist the crash streak and derive the reload delay from it. On native
 * shells the Rust/Kotlin watchdogs roll back a bad build, but a plain
 * browser/webOS player serves the broken bundle cache-first forever — without
 * backoff a deterministic crash means reloading every 5 seconds until a fixed
 * deploy ships. Crashes spaced further apart than the reset window restart the
 * streak, so a one-off crash after healthy playback still recovers quickly.
 */
function nextReloadDelay(): number {
  let streak = 1
  try {
    const raw = localStorage.getItem(CRASH_STREAK_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { count?: number; at?: number }
      if (
        typeof parsed.at === 'number' &&
        Date.now() - parsed.at < CRASH_STREAK_RESET_MS
      ) {
        streak = (typeof parsed.count === 'number' ? parsed.count : 0) + 1
      }
    }
    localStorage.setItem(
      CRASH_STREAK_KEY,
      JSON.stringify({ count: streak, at: Date.now() }),
    )
  } catch {
    // Storage unavailable — fall back to the base delay.
  }
  return Math.min(BASE_RELOAD_DELAY_MS * 2 ** (streak - 1), MAX_RELOAD_DELAY_MS)
}

/**
 * Last line of defence for an unattended screen: if the UI tree throws, report
 * it and self-heal by reloading after a short delay rather than leaving a dead
 * screen until someone physically intervenes. Repeated crashes back off
 * exponentially (5s → 10min cap) so a broken bundle doesn't reload-loop.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false }

  componentDidCatch(error: unknown): void {
    reportError(error, { boundary: 'root' })
    this.setState({ crashed: true })
    window.setTimeout(() => window.location.reload(), nextReloadDelay())
  }

  render() {
    if (this.state.crashed) {
      return (
        <div class="player-fallback">
          <div class="player-fallback__brand">SignageWall</div>
          <div class="player-fallback__hint">Recovering…</div>
        </div>
      )
    }
    return this.props.children
  }
}
