package com.edgerize.player.bridge

/**
 * The document-start JS that defines `window.AndroidBridge` from the raw
 * `@JavascriptInterface` host (`__edgeHost__`) — the Android analogue of Tauri's
 * `withGlobalTauri`. Installed before any page script runs (via
 * `WebViewCompat.addDocumentStartJavaScript`, or an `onPageStarted` fallback on old
 * TV-box WebViews). Defensive: if the host object is somehow absent it leaves
 * `window.AndroidBridge` undefined and the web layer cleanly no-ops.
 */
object BridgeInjection {
    const val HOST_NAME = "__edgeHost__"

    val SCRIPT: String = """
        (function () {
          var host = window.$HOST_NAME;
          if (!host) { return; }
          window.AndroidBridge = {
            invoke: function (cmd, argsJson) { return host.invoke(cmd, argsJson); },
            restart: function () { host.restart(); },
            setKioskLock: function (mode) { host.setKioskLock(mode); }
          };
        })();
    """.trimIndent()
}
