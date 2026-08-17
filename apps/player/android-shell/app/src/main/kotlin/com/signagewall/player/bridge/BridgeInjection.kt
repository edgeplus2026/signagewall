package com.signagewall.player.bridge

import java.net.URI

/**
 * The document-start JS that defines `window.AndroidBridge` from the raw
 * `@JavascriptInterface` host (`__signagewallHost__`) — the Android analogue of Tauri's
 * `withGlobalTauri`. Installed before any page script runs (via
 * `WebViewCompat.addDocumentStartJavaScript`, or an `onPageStarted` fallback on old
 * TV-box WebViews). Defensive: if the host object is somehow absent it leaves
 * `window.AndroidBridge` undefined and the web layer cleanly no-ops.
 *
 * ## Why the nonce
 *
 * `addJavascriptInterface` injects its object into EVERY frame the WebView renders,
 * at every origin — there is no origin parameter, which is precisely why AndroidX
 * added `addWebMessageListener` with `allowedOriginRules` as its replacement. A
 * signage screen renders third-party pages by design: the Web app mounts a URL the
 * operator typed, and YouTube, Canva, Power BI, Google Slides and the stream player
 * all embed somebody else's document. Every one of those frames could reach
 * `__signagewallHost__` and call it — unlock the kiosk, quit the app, read the shell
 * log, or rebind this screen's durable identity to another device's id.
 *
 * So the raw host now demands a secret that only the player's own document can hold:
 * this script carries it, and this script is injected into the player origin ONLY.
 * A cross-origin frame still sees `__signagewallHost__`, and every call it makes is
 * refused. It cannot read the secret from the parent either — that is the one thing
 * the same-origin policy has always been reliable about.
 *
 * First-party app bundles are same-origin with the player and so are trusted by
 * construction; they get the script (and could reach `parent.AndroidBridge` anyway).
 * The boundary this draws is exactly the one that matters: our code versus the
 * internet.
 */
object BridgeInjection {
    const val HOST_NAME = "__signagewallHost__"

    /**
     * The wrapper, with [nonce] baked in. Every call forwards it as the first
     * argument; the Kotlin side refuses anything else.
     *
     * The nonce is dropped from `window` after the wrapper closes over it, so a
     * later same-origin script cannot simply read it off a global — it would have
     * to go through `AndroidBridge`, which is the supported surface anyway.
     */
    fun script(nonce: String): String = """
        (function () {
          var host = window.$HOST_NAME;
          if (!host) { return; }
          var k = ${quote(nonce)};
          window.AndroidBridge = {
            invoke: function (cmd, argsJson) { return host.invoke(k, cmd, argsJson); },
            restart: function () { host.restart(k); },
            setKioskLock: function (mode) { host.setKioskLock(k, mode); },
            setScreenName: function (name) { host.setScreenName(k, name); },
            closeApp: function () { host.closeApp(k); },
            setServiceMenuOpen: function (open) { host.setServiceMenuOpen(k, !!open); }
          };
        })();
    """.trimIndent()

    /**
     * The origin rule for [playerUrl], in the `scheme://host:port` form
     * `addDocumentStartJavaScript` expects, or null when the URL cannot be parsed.
     *
     * Null must be treated as "inject nowhere": falling back to `*` would hand the
     * nonce to every frame and undo the whole point. A shell that cannot parse its
     * own configured URL has a build problem, not a runtime one.
     */
    fun originRule(playerUrl: String): String? =
        try {
            val uri = URI(playerUrl)
            val scheme = uri.scheme ?: return null
            val host = uri.host ?: return null
            if (uri.port > 0) "$scheme://$host:${uri.port}" else "$scheme://$host"
        } catch (_: Throwable) {
            null
        }

    /** Whether [url] belongs to the player origin — the guard for the legacy
     *  `onPageStarted` injection path, which has no origin parameter of its own. */
    fun isPlayerOrigin(url: String?, playerUrl: String): Boolean {
        if (url == null) return false
        val expected = originRule(playerUrl) ?: return false
        return originRule(url) == expected
    }

    /** JSON-quotes the nonce so it can never break out of the string literal. */
    private fun quote(value: String): String =
        buildString {
            append('"')
            for (char in value) {
                when {
                    char == '"' || char == '\\' -> append('\\').append(char)
                    char.code < 0x20 || char.code > 0x7e ->
                        append("\\u").append("%04x".format(char.code))
                    else -> append(char)
                }
            }
            append('"')
        }
}
