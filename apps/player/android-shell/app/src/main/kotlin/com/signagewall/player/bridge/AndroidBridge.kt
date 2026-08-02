package com.signagewall.player.bridge

import android.webkit.JavascriptInterface

/**
 * The `@JavascriptInterface` host the web player calls. Registered on the WebView
 * as `__signagewallHost__` and re-exposed as `window.AndroidBridge` by [BridgeInjection].
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
    private val onScreenName: (String) -> Unit = {},
    private val onCloseApp: () -> Unit = {},
    private val onServiceMenuOpen: (Boolean) -> Unit = {},
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

    /**
     * The screen's human name, pushed from the web layer. The shell has no other way
     * to know it — pairing lives entirely in the player — and it is what a technician
     * standing in front of the display matches against the CMS.
     */
    @JavascriptInterface
    fun setScreenName(name: String) {
        onScreenName(name)
    }

    /**
     * Reports whether the web service bar is on screen, so the activity can route
     * the two keys it owns above the WebView: BACK closes the bar instead of
     * quitting, and UP only opens it while it is down.
     */
    @JavascriptInterface
    fun setServiceMenuOpen(open: Boolean) {
        onServiceMenuOpen(open)
    }

    /** Quits the player, from the web service menu's "Close application". */
    @JavascriptInterface
    fun closeApp() {
        onCloseApp()
    }

    @JavascriptInterface
    fun setKioskLock(mode: String) {
        onSetKioskLock(mode)
    }
}
