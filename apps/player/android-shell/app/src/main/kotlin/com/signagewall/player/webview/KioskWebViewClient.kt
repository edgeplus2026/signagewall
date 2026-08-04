package com.signagewall.player.webview

import android.graphics.Bitmap
import android.util.Log
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import com.signagewall.player.bridge.BridgeInjection

/**
 * Keeps the kiosk WebView resilient.
 *
 * Two things were missing and both were fatal on an unattended screen.
 *
 * A render-process death (WebView OOM, GPU or decoder crash) poisons the WebView
 * object, so it is recreated via [onRenderGone] — that part existed, but it
 * DISCARDED the [RenderProcessGoneDetail] entirely, which is why five software-codec
 * crashes in one night left no trace anywhere in the shell's own logs.
 *
 * A failed page LOAD had no handler at all. `loadUrl` was issued exactly once, and
 * nothing anywhere re-issued it except a render-process death — so a TV that boots
 * faster than the site's router after a power cut showed `ERR_NAME_NOT_RESOLVED` on
 * the wall until a human intervened. A device whose first load fails has no service
 * worker to fall back on either, so it is the newest screens that fail hardest.
 *
 * Navigation is deliberately NOT pinned to one origin (mirrors the Tauri shell) so
 * YouTube/Canva/Web iframe embeds keep working; only the IPC bridge is
 * origin-sensitive. That is also why errors are acted on for the MAIN FRAME ONLY: a
 * third-party embed failing to load is an app's problem, not the screen's.
 */
class KioskWebViewClient(
    private val documentStartSupported: Boolean,
    private val onRenderGone: (didCrash: Boolean) -> Unit,
    private val onMainFrameError: (description: String) -> Unit,
    private val onMainFrameLoaded: () -> Unit,
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

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        if (url != null && !url.startsWith(OFFLINE_URL_PREFIX)) {
            onMainFrameLoaded()
        }
    }

    override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?,
    ) {
        super.onReceivedError(view, request, error)
        if (request?.isForMainFrame == true) {
            onMainFrameError("${error?.errorCode}: ${error?.description}")
        }
    }

    override fun onReceivedHttpError(
        view: WebView?,
        request: WebResourceRequest?,
        response: WebResourceResponse?,
    ) {
        super.onReceivedHttpError(view, request, response)
        if (request?.isForMainFrame == true) {
            onMainFrameError("HTTP ${response?.statusCode}")
        }
    }

    override fun onRenderProcessGone(
        view: WebView?,
        detail: RenderProcessGoneDetail?,
    ): Boolean {
        val didCrash = detail?.didCrash() ?: true
        Log.w(
            TAG,
            if (didCrash) {
                "WebView renderer CRASHED (priority ${detail?.rendererPriorityAtExit()})"
            } else {
                "WebView renderer was reclaimed by the system, not a crash"
            },
        )
        onRenderGone(didCrash)
        return true // handled — recreate the WebView rather than let the process die
    }

    private companion object {
        const val TAG = "KioskWebView"
        const val OFFLINE_URL_PREFIX = "file:///android_asset/"
    }
}
