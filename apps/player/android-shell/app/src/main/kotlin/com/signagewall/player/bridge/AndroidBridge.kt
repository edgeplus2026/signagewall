package com.signagewall.player.bridge

import android.util.Log
import android.webkit.JavascriptInterface
import java.security.MessageDigest

/**
 * The `@JavascriptInterface` host the web player calls. Registered on the WebView
 * as `__signagewallHost__` and re-exposed as `window.AndroidBridge` by [BridgeInjection].
 * Synchronous methods only — a `@JavascriptInterface` call blocks the JS thread, so
 * every handler must do sub-millisecond work (the long `run_update` path returns
 * immediately and continues on a background thread inside the updater):
 *  - `invoke(nonce, cmd, argsJson): String` — the IPC, returns a JSON envelope.
 *  - `restart(nonce)`                       — relaunch.
 *  - `setKioskLock(nonce, mode)`            — drive lockdown, fire-and-forget.
 *
 * ## The nonce is not decoration
 *
 * Android injects this object into every frame of every origin, and a signage screen
 * renders other people's pages on purpose — the Web app mounts an operator-supplied
 * URL, and half a dozen apps embed third-party viewers. Without a secret, any of
 * them could unlock the kiosk, close the player, or rebind the device identity. The
 * secret is generated per process and delivered only to the player origin (see
 * [BridgeInjection]), so a foreign frame holds a handle it cannot use.
 */
class AndroidBridge(
    /** Per-process secret; only the player origin's injected wrapper carries it. */
    private val nonce: String,
    private val dispatcher: BridgeDispatcher,
    private val onRestart: () -> Unit,
    private val onSetKioskLock: (String) -> Unit,
    private val onScreenName: (String) -> Unit = {},
    private val onCloseApp: () -> Unit = {},
    private val onServiceMenuOpen: (Boolean) -> Unit = {},
) {
    /**
     * Constant-time comparison, so a caller cannot learn the secret one character
     * at a time by timing calls. Cheap paranoia — the frames that would try this
     * are the ones this guard exists for.
     */
    private fun authorized(candidate: String?): Boolean {
        if (candidate == null) return false
        val ok = MessageDigest.isEqual(
            candidate.toByteArray(Charsets.UTF_8),
            nonce.toByteArray(Charsets.UTF_8),
        )
        if (!ok) {
            // Worth a line in logcat: on a healthy device this never happens, and
            // when it does it means a page inside the WebView tried to reach the
            // native shell.
            Log.w(TAG, "rejected a bridge call from an unauthorized frame")
        }
        return ok
    }

    @JavascriptInterface
    fun invoke(nonce: String?, cmd: String, argsJson: String): String =
        if (!authorized(nonce)) {
            BridgeEnvelope.error("unauthorized")
        } else {
            try {
                BridgeEnvelope.ok(dispatcher.dispatch(cmd, argsJson))
            } catch (t: Throwable) {
                BridgeEnvelope.error(t.message ?: "command failed")
            }
        }

    @JavascriptInterface
    fun restart(nonce: String?) {
        if (authorized(nonce)) onRestart()
    }

    /**
     * The screen's human name, pushed from the web layer. The shell has no other way
     * to know it — pairing lives entirely in the player — and it is what a technician
     * standing in front of the display matches against the CMS.
     */
    @JavascriptInterface
    fun setScreenName(nonce: String?, name: String) {
        if (authorized(nonce)) onScreenName(name)
    }

    /**
     * Reports whether the web service bar is on screen, so the activity can route
     * the two keys it owns above the WebView: BACK closes the bar instead of
     * quitting, and UP only opens it while it is down.
     */
    @JavascriptInterface
    fun setServiceMenuOpen(nonce: String?, open: Boolean) {
        if (authorized(nonce)) onServiceMenuOpen(open)
    }

    /** Quits the player, from the web service menu's "Close application". */
    @JavascriptInterface
    fun closeApp(nonce: String?) {
        if (authorized(nonce)) onCloseApp()
    }

    @JavascriptInterface
    fun setKioskLock(nonce: String?, mode: String) {
        if (authorized(nonce)) onSetKioskLock(mode)
    }

    private companion object {
        const val TAG = "AndroidBridge"
    }
}
