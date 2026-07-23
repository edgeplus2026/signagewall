package rs.futureforward.edge.player.webview

import android.graphics.Bitmap
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebView
import android.webkit.WebViewClient
import rs.futureforward.edge.player.bridge.BridgeInjection

/**
 * Keeps the kiosk WebView resilient. On a render-process death (WebView OOM / GPU
 * or decoder crash) the old WebView object is poisoned — any further use throws —
 * so we recreate it via [onRenderGone] and reload; without this the screen goes
 * permanently black on the first heavy-video OOM. Navigation is deliberately NOT
 * pinned to one origin (mirrors the Tauri shell) so YouTube/Canva/Web iframe embeds
 * keep working; only the IPC bridge is origin-sensitive.
 */
class KioskWebViewClient(
    private val documentStartSupported: Boolean,
    private val onRenderGone: () -> Unit,
) : WebViewClient() {

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
        // Fallback for WebViews without DOCUMENT_START_SCRIPT: inject as early as we
        // can. It races main.tsx's pre-render reportAlive(); a missed early signal is
        // the safe direction (the watchdog treats it as "offline", never a bad build).
        if (!documentStartSupported) {
            view?.evaluateJavascript(BridgeInjection.SCRIPT, null)
        }
    }

    override fun onRenderProcessGone(
        view: WebView?,
        detail: RenderProcessGoneDetail?,
    ): Boolean {
        onRenderGone()
        return true // handled — recreate the WebView rather than let the process die
    }
}
