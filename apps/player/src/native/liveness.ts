/**
 * Liveness beat for the native keep-alive supervisor (`signagewall-watchdog`).
 *
 * The supervisor restarts the player if it crashes OR hangs. A crash it detects
 * from the process vanishing; a HANG (WebView frozen, gray/white screen, process
 * still alive) it can only detect if the beat originates HERE, in the page's own
 * event loop. A frozen WebView stops calling `report_liveness`, the native file
 * goes stale, and the supervisor kills + respawns.
 *
 * This is deliberately driven from the web layer, not a Rust timer: a Rust timer
 * would keep beating straight through a WebView freeze and mask the exact failure
 * we want to catch. No-op in a plain browser (there is no shell to supervise it).
 */
import { hasNativeBridge, nativeInvoke } from './host'

/**
 * How often we beat. The supervisor's stale threshold is several beats, so a
 * single dropped beat or a GC pause never trips a false hang.
 */
const LIVENESS_INTERVAL_MS = 5000

/**
 * Starts the liveness beat and returns a disposer. Beats once immediately so the
 * file exists before the first interval elapses, then every {@link
 * LIVENESS_INTERVAL_MS}. No-op (disposer that does nothing) in a plain browser.
 */
export function startLiveness(): () => void {
  if (!hasNativeBridge()) {
    return () => undefined
  }
  void nativeInvoke('report_liveness')
  const timer = setInterval(() => {
    void nativeInvoke('report_liveness')
  }, LIVENESS_INTERVAL_MS)
  return () => clearInterval(timer)
}
