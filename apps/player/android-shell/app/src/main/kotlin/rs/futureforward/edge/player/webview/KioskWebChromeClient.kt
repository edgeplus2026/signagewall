package rs.futureforward.edge.player.webview

import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient

/** Pipes web console output to logcat so the remote player can be debugged on-box. */
class KioskWebChromeClient : WebChromeClient() {
    override fun onConsoleMessage(message: ConsoleMessage?): Boolean {
        if (message != null) {
            Log.d(
                "EdgePlayerWeb",
                "${message.message()} @${message.sourceId()}:${message.lineNumber()}",
            )
        }
        return true
    }
}
