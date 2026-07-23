package rs.futureforward.edge.player

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.KeyEvent
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebSettings
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
import rs.futureforward.edge.player.boot.WatchdogService
import rs.futureforward.edge.player.bridge.AndroidBridge
import rs.futureforward.edge.player.bridge.BridgeDispatcher
import rs.futureforward.edge.player.bridge.BridgeInjection
import rs.futureforward.edge.player.identity.DeviceIdStore
import rs.futureforward.edge.player.kiosk.EscapeHatch
import rs.futureforward.edge.player.kiosk.KioskController
import rs.futureforward.edge.player.update.NoopUpdater
import rs.futureforward.edge.player.update.OtaUpdater
import rs.futureforward.edge.player.update.Updater
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

    // Longer-lived than any single WebView (survive a recreate on render-gone).
    private val deviceIdStore by lazy { DeviceIdStore(File(filesDir, "device.json")) }
    private val updater: Updater by lazy { buildUpdater() }
    private val kioskController by lazy { KioskController(this) }
    private val escapeHatch by lazy {
        EscapeHatch(onTriggered = { runOnUiThread { showPinDialog() } })
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WatchdogService.start(this)
        // A kiosk never exits via Back — the escape hatch (PIN) is the only way out.
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    // swallow
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
            ),
            onRestart = { restartApp() },
            onSetKioskLock = { mode -> kioskController.setMode(mode) },
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
        view.loadUrl(BuildConfig.EDGE_PLAYER_URL)
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

    private fun showPinDialog() {
        val input = EditText(this).apply {
            inputType =
                InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
        }
        AlertDialog.Builder(this)
            .setTitle("Admin PIN")
            .setView(input)
            .setPositiveButton("Unlock") { _, _ ->
                if (isPinCorrect(input.text.toString())) {
                    kioskController.setMode("off")
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun isPinCorrect(pin: String): Boolean =
        sha256Hex(pin).equals(BuildConfig.KIOSK_PIN_SHA256, ignoreCase = true)

    /** OTA updater when a manifest URL is baked in AND the process health gate exists;
     *  a no-op updater in dev. Shares the App's HealthWatchdog (single alive/healthy owner). */
    private fun buildUpdater(): Updater {
        val manifestUrl = BuildConfig.UPDATE_MANIFEST_URL
        val health = (application as? EdgePlayerApp)?.postUpdateHealth
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
