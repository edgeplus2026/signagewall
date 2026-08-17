import { Component, type ComponentChildren } from 'preact'

import { reportError } from '../sentry'

interface Props {
  children: ComponentChildren
}

interface State {
  crashed: boolean
}

/**
 * How long to wait before each reload attempt, by attempt number.
 *
 * The first is short because most crashes are one-offs and nobody should watch a
 * blank screen for a minute over a transient fault. The rest grow because the
 * failure that actually matters here is the DETERMINISTIC one — a bad build, a
 * corrupt snapshot — where reloading changes nothing. A fixed five seconds meant
 * such a screen reloaded seventeen thousand times a day: it burned bandwidth,
 * defeated the Android shell's recovery ladder (which saw a fresh heartbeat after
 * every reload and concluded the page was healthy, so it never escalated), and
 * generated a Sentry event each time.
 *
 * The last value repeats forever. Giving up is not an option — the fix may be a
 * web deploy that lands an hour from now, and the screen has to pick it up by
 * itself.
 */
const RELOAD_BACKOFF_MS = [5_000, 30_000, 120_000, 600_000]

const ATTEMPT_KEY = 'signagewall.player.crashAttempt'

/**
 * Reads how many times this page has already crash-reloaded. Kept in
 * sessionStorage: it must survive the reload (a field would be reset by the very
 * act it is counting) but not a power cycle, since a fresh boot deserves a fresh
 * fast attempt.
 */
function readAttempt(): number {
  try {
    const raw = window.sessionStorage.getItem(ATTEMPT_KEY)
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  } catch {
    return 0
  }
}

function writeAttempt(value: number): void {
  try {
    window.sessionStorage.setItem(ATTEMPT_KEY, String(value))
  } catch {
    // Storage unavailable — we degrade to the first delay every time, which is
    // the old behaviour and still better than not recovering.
  }
}

/**
 * Clears the crash counter once the player has proven it can run.
 *
 * Called from a mounted, working tree — not from `componentDidCatch` — because
 * the whole point is to distinguish "crashed once and recovered" from "crashes
 * every time". Without this the counter would climb across unrelated faults days
 * apart and eventually put a healthy screen on a ten-minute recovery delay.
 */
export function clearCrashBackoff(): void {
  try {
    window.sessionStorage.removeItem(ATTEMPT_KEY)
  } catch {
    // ignore
  }
}

/**
 * Last line of defence for an unattended screen: if the UI tree throws, report
 * it and self-heal by reloading rather than leaving a dead screen until someone
 * physically intervenes. Repeated crashes back off (see {@link RELOAD_BACKOFF_MS}).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false }

  componentDidCatch(error: unknown): void {
    const attempt = readAttempt()
    writeAttempt(attempt + 1)
    const delay =
      RELOAD_BACKOFF_MS[Math.min(attempt, RELOAD_BACKOFF_MS.length - 1)] ??
      RELOAD_BACKOFF_MS[RELOAD_BACKOFF_MS.length - 1]!
    // The attempt number rides along, so a repeating crash is legible in Sentry
    // as one escalating episode instead of N unrelated events.
    reportError(error, { boundary: 'root', attempt: attempt + 1, retryInMs: delay })
    this.setState({ crashed: true })
    window.setTimeout(() => window.location.reload(), delay)
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
