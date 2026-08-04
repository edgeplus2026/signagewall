/**
 * Liveness beat for the native keep-alive supervisor (`signagewall-watchdog`).
 *
 * The supervisor restarts the player if it crashes OR hangs. A crash it detects
 * from the process vanishing; a HANG (WebView frozen, gray/white screen, process
 * still alive) it can only detect if the beat originates HERE, in the page's own
 * event loop. A frozen WebView stops calling `report_liveness`, the native file
 * goes stale, and the supervisor kills + respawns.
 *
 * This is deliberately driven from the web layer, not a native timer: a native
 * timer would keep beating straight through a WebView freeze and mask the exact
 * failure we want to catch. No-op in a plain browser (there is no shell to
 * supervise it).
 */
import { playingItemId, snapshot } from '../store'
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
  // The id of what is on screen rides along with the beat. "JS is running" only
  // catches a frozen renderer; a player that is alive, painting and connected but
  // stuck on one frame forever is the more common — and more embarrassing —
  // failure on an unattended screen, and only a changing id reveals it.
  const beat = (): void => {
    // `multiItem` is what stops the shell mistaking a healthy screen for a frozen
    // one. A single-item playlist shows the same renderable forever BY DESIGN, so a
    // constant id proves nothing there — and the shell's stuck-content ladder was
    // reloading such screens on a timer, for ever, because it could not tell the
    // difference. Only the page knows how many items it has.
    void nativeInvoke('report_liveness', {
      itemId: playingItemId.value,
      multiItem: (snapshot.value?.items.length ?? 0) > 1,
    })
  }
  beat()
  const timer = setInterval(beat, LIVENESS_INTERVAL_MS)
  return () => clearInterval(timer)
}
