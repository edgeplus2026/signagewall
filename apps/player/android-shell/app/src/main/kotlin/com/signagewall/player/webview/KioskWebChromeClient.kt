package com.signagewall.player.webview

import android.os.SystemClock
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient

/**
 * Pipes web console output to logcat so the remote player can be debugged on-box.
 *
 * Warnings and errors only, and rate-limited. It used to log EVERY message at debug
 * level, in release, from the page and from every cross-origin embed — a chatty
 * third-party widget could evict the shell's own warnings from the ring buffer, which
 * is the buffer you read when something has gone wrong. Diagnostics that destroy
 * diagnostics.
 */
class KioskWebChromeClient : WebChromeClient() {

    private var windowStartedAt = 0L
    private var inWindow = 0
    private var suppressed = 0

    override fun onConsoleMessage(message: ConsoleMessage?): Boolean {
        val level = message?.messageLevel() ?: return true
        if (level != ConsoleMessage.MessageLevel.ERROR &&
            level != ConsoleMessage.MessageLevel.WARNING
        ) {
            return true
        }

        val now = SystemClock.elapsedRealtime()
        if (now - windowStartedAt > WINDOW_MILLIS) {
            if (suppressed > 0) {
                Log.w(TAG, "suppressed $suppressed further console messages")
            }
            windowStartedAt = now
            inWindow = 0
            suppressed = 0
        }
        if (inWindow >= MAX_PER_WINDOW) {
            suppressed += 1
            return true
        }
        inWindow += 1

        val text = "${message.message()} @${message.sourceId()}:${message.lineNumber()}"
        if (level == ConsoleMessage.MessageLevel.ERROR) {
            Log.e(TAG, text)
        } else {
            Log.w(TAG, text)
        }
        return true
    }

    private companion object {
        const val TAG = "PlayerWeb"
        const val WINDOW_MILLIS = 10_000L
        const val MAX_PER_WINDOW = 20
    }
}
