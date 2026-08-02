package com.signagewall.player

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.view.KeyEvent
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebStorage
import android.webkit.WebView
import android.widget.EditText
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.signagewall.player.boot.WatchdogService
import com.signagewall.player.bridge.AndroidBridge
import com.signagewall.player.bridge.BridgeDispatcher
import com.signagewall.player.bridge.BridgeInjection
import com.signagewall.player.identity.DeviceIdStore
import com.signagewall.player.kiosk.EscapeHatch
import com.signagewall.player.kiosk.KioskController
import com.signagewall.player.kiosk.KioskPresence
import com.signagewall.player.update.NoopUpdater
import com.signagewall.player.update.OtaUpdater
import com.signagewall.player.update.Updater
import com.signagewall.player.webview.KioskWebChromeClient
import com.signagewall.player.webview.KioskWebViewClient
import java.io.File
import java.security.MessageDigest

/**
 * The fullscreen kiosk WebView that wraps the remote player. Mirrors the Tauri
 * shell's kiosk window (lib.rs): fullscreen/immersive, keep-screen-on, autoplay,
 * single instance (`launchMode=singleTask`), no navigation pin. Level 2 adds the
 * kiosk lockdown ([KioskController], driven by `setKioskLock`), the native
 * [EscapeHatch] → PIN unlock, D-pad focus for the web UI, and the keep-alive
 * [WatchdogService]. (Level 3 adds the real self-updater.)
 */
class KioskActivity : AppCompatActivity() {

    private var webView: WebView? = null

    /** Pushed by the web layer once paired; shown in the on-device service dialog. */
    @Volatile
    private var screenName: String? = null

    // Longer-lived than any single WebView (survive a recreate on render-gone).
    private val deviceIdStore by lazy { DeviceIdStore(File(filesDir, "device.json")) }
    private val updater: Updater by lazy { buildUpdater() }
    private val kioskController by lazy { KioskController(this) }
    private val escapeHatch by lazy {
        EscapeHatch(onTriggered = { runOnUiThread { showServiceDialog() } })
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WatchdogService.start(this)
        // A kiosk never exits via Back — the escape hatch (PIN) is the only way out.
        // But only WHILE it is a kiosk: swallowing unconditionally meant that turning
        // the lock off from the CMS still left the app inescapable from a remote,
        // which reads as a hung device rather than a deliberate lockdown.
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (kioskController.current == KioskController.Mode.OFF) {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                    // Locked: swallow.
                }
            },
        )
        installWebView()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun installWebView() {
        val view = WebView(this)
        webView = view

        view.isFocusableInTouchMode = true // D-pad + focus must reach the web UI
        view.setBackgroundColor(Color.BLACK)
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false // kiosk: autoplay with sound
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        val bridge = AndroidBridge(
            dispatcher = BridgeDispatcher(
                shellVersion = BuildConfig.VERSION_NAME,
                deviceIdStore = deviceIdStore,
                updater = updater,
                deviceOwner = { kioskController.isDeviceOwner() },
            ),
            onRestart = { restartApp() },
            onSetKioskLock = { mode -> kioskController.setMode(mode) },
            onScreenName = { name -> screenName = name.ifBlank { null } },
        )
        view.addJavascriptInterface(bridge, BridgeInjection.HOST_NAME)

        val documentStartSupported =
            WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)
        if (documentStartSupported) {
            WebViewCompat.addDocumentStartJavaScript(
                view,
                BridgeInjection.SCRIPT,
                setOf("*"),
            )
        }
        view.webViewClient = KioskWebViewClient(
            documentStartSupported = documentStartSupported,
            onRenderGone = { recreateWebView() },
        )
        view.webChromeClient = KioskWebChromeClient()

        setContentView(view)
        enterImmersive()
        view.requestFocus()
        view.loadUrl(BuildConfig.SIGNAGEWALL_PLAYER_URL)
    }

    /**
     * The escape combo is checked ABOVE the WebView so it works even when the remote
     * page is broken/offline; everything else (D-pad nav, etc.) falls through to the
     * focused WebView.
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (escapeHatch.onKeyEvent(event)) return true
        return super.dispatchKeyEvent(event)
    }

    /**
     * What the escape hatch actually opens: the facts an on-site technician needs,
     * and only then the two actions worth protecting. Reading the version or the
     * device id used to require passing the PIN gate first, which is backwards —
     * looking is harmless, changing is not.
     */
    private fun showServiceDialog() {
        val owner = if (kioskController.isDeviceOwner()) "yes" else "no"
        val deviceId = when (val r = deviceIdStore.read()) {
            is DeviceIdStore.ReadResult.Present -> r.id
            DeviceIdStore.ReadResult.Absent -> "(not paired)"
            DeviceIdStore.ReadResult.Unreadable -> "(unreadable)"
        }
        val info = buildString {
            appendLine("Screen:      ${screenName ?: "(unknown)"}")
            appendLine("Device id:   $deviceId")
            appendLine()
            appendLine("Player:      ${BuildConfig.VERSION_NAME}")
            appendLine("Android:     ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})")
            appendLine("Model:       ${Build.MANUFACTURER} ${Build.MODEL}")
            appendLine()
            appendLine("Kiosk:       ${kioskController.current.name.lowercase()}")
            append("Device owner: $owner")
            if (kioskController.current == KioskController.Mode.HARD && owner == "no") {
                append("  — hard lock NOT enforced")
            }
        }
        AlertDialog.Builder(this)
            .setTitle("SignageWall Player")
            .setMessage(info)
            .setPositiveButton("Unlock kiosk") { _, _ ->
                askPin("Unlock kiosk") { kioskController.setMode("off") }
            }
            .setNeutralButton("Deactivate") { _, _ ->
                askPin("Deactivate player") { deactivatePlayer() }
            }
            .setNegativeButton("Close", null)
            .show()
    }

    /** PIN gate in front of anything an operator would not want a passer-by doing. */
    private fun askPin(title: String, onCorrect: () -> Unit) {
        val input = EditText(this).apply {
            inputType =
                InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
        }
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage("Admin PIN")
            .setView(input)
            .setPositiveButton("Confirm") { _, _ ->
                if (isPinCorrect(input.text.toString())) onCorrect()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    /**
     * Take this display off the screen it is bound to: drop the durable device id
     * and the WebView's own storage, then restart. The player comes back unpaired
     * and shows a fresh registration code. The CMS side is not touched — an
     * operator still removes the screen there — because a device must never be able
     * to delete somebody's screen just by standing next to it.
     */
    private fun deactivatePlayer() {
        kioskController.setMode("off")
        deviceIdStore.clear()
        webView?.let { view ->
            view.clearCache(true)
            WebStorage.getInstance().deleteAllData()
            CookieManager.getInstance().removeAllCookies(null)
        }
        restartApp()
    }

    private fun isPinCorrect(pin: String): Boolean =
        sha256Hex(pin).equals(BuildConfig.KIOSK_PIN_SHA256, ignoreCase = true)

    /** OTA updater when a manifest URL is baked in AND the process health gate exists;
     *  a no-op updater in dev. Shares the App's HealthWatchdog (single alive/healthy owner). */
    private fun buildUpdater(): Updater {
        val manifestUrl = BuildConfig.UPDATE_MANIFEST_URL
        val health = (application as? PlayerApp)?.postUpdateHealth
        return if (manifestUrl.isBlank() || health == null) {
            NoopUpdater(BuildConfig.VERSION_NAME)
        } else {
            OtaUpdater(
                context = applicationContext,
                currentVersionName = BuildConfig.VERSION_NAME,
                currentVersionCode = BuildConfig.VERSION_CODE,
                manifestUrl = manifestUrl,
                health = health,
            )
        }
    }

    private fun recreateWebView() {
        webView?.let { old ->
            (old.parent as? ViewGroup)?.removeView(old)
            old.destroy()
        }
        webView = null
        installWebView()
    }

    private fun restartApp() {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        intent?.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(intent)
        Runtime.getRuntime().exit(0)
    }

    private fun enterImmersive() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowCompat.getInsetsController(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    /**
     * Presence for the keep-alive watchdog. Resume/pause rather than window focus:
     * a dialog (the PIN gate) takes focus without the player leaving the screen, and
     * treating that as "gone" would have the watchdog fight the operator.
     */
    override fun onResume() {
        super.onResume()
        KioskPresence.setResumed(true)
    }

    override fun onPause() {
        KioskPresence.setResumed(false)
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enterImmersive()
    }

    override fun onDestroy() {
        webView?.destroy()
        webView = null
        super.onDestroy()
    }

    private companion object {
        fun sha256Hex(value: String): String =
            MessageDigest.getInstance("SHA-256")
                .digest(value.toByteArray(Charsets.UTF_8))
                .joinToString("") { "%02x".format(it.toInt() and 0xFF) }
    }
}
