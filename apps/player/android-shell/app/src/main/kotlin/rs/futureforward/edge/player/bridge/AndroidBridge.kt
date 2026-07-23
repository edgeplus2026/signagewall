package rs.futureforward.edge.player.bridge

import android.webkit.JavascriptInterface

/**
 * The `@JavascriptInterface` host the web player calls. Registered on the WebView
 * as `__edgeHost__` and re-exposed as `window.AndroidBridge` by [BridgeInjection].
 * THREE synchronous methods only — a `@JavascriptInterface` call blocks the JS
 * thread, so every handler must do sub-millisecond work (the long `run_update` path
 * returns immediately and continues on a background thread inside the updater):
 *  - `invoke(cmd, argsJson): String` — the 8-command IPC, returns a JSON envelope.
 *  - `restart()`                     — relaunch (backs `window.AndroidBridge.restart`).
 *  - `setKioskLock(mode)`            — drive lockdown, fire-and-forget (Level 2).
 */
class AndroidBridge(
    private val dispatcher: BridgeDispatcher,
    private val onRestart: () -> Unit,
    private val onSetKioskLock: (String) -> Unit,
) {
    @JavascriptInterface
    fun invoke(cmd: String, argsJson: String): String =
        try {
            BridgeEnvelope.ok(dispatcher.dispatch(cmd, argsJson))
        } catch (t: Throwable) {
            BridgeEnvelope.error(t.message ?: "command failed")
        }

    @JavascriptInterface
    fun restart() {
        onRestart()
    }

    @JavascriptInterface
    fun setKioskLock(mode: String) {
        onSetKioskLock(mode)
    }
}
