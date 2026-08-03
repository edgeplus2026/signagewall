package com.signagewall.player

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.KeyEvent
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebStorage
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
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
import com.signagewall.player.util.json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.io.File

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

    /**
     * Whether the web service bar is on screen, as last reported by the page.
     * Drives which of UP/BACK this activity claims — see dispatchKeyEvent. Written
     * from the JS bridge thread, read on the UI thread, hence @Volatile.
     */
    @Volatile
    private var serviceMenuOpen: Boolean = false

    /** Set while the operator is away in the overlay-permission settings screen. */
    private var awaitingOverlayGrant: Boolean = false

    /** Pushed by the web layer once paired; shown in the on-device service dialog. */
    @Volatile
    private var screenName: String? = null

    // Longer-lived than any single WebView (survive a recreate on render-gone).
    private val deviceIdStore by lazy { DeviceIdStore(File(filesDir, "device.json")) }
    private val updater: Updater by lazy { buildUpdater() }
    private val kioskController by lazy { KioskController(this) }
    private val escapeHatch by lazy {
        EscapeHatch(onTriggered = { runOnUiThread { onEscapeHatch() } })
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        // A new session: whatever the last one asked for, this one is guarded.
        KioskPresence.setClosedByOperator(false)
        WatchdogService.start(this)
        // A kiosk never exits via Back — the escape hatch is the only way out.
        // But only WHILE it is a kiosk: swallowing unconditionally meant that turning
        // the lock off from the CMS still left the app inescapable from a remote,
        // which reads as a hung device rather than a deliberate lockdown.
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    // The service bar gets Back first, always. A WebView never
                    // delivers KEYCODE_BACK to the page, so without this the one
                    // key an operator would reach for to dismiss the bar would
                    // instead quit the whole player.
                    if (serviceMenuOpen) {
                        callServiceBar("close")
                        return
                    }
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
                deviceInfo = { deviceInfoJson() },
                onDeactivate = { runOnUiThread { deactivatePlayer() } },
                onRequestRecovery = { requestOverlayPermission() },
            ),
            onRestart = { restartApp() },
            onSetKioskLock = { mode -> kioskController.setMode(mode) },
            onScreenName = { name -> screenName = name.ifBlank { null } },
            onCloseApp = { closeApp() },
            onServiceMenuOpen = { open -> serviceMenuOpen = open },
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
     *
     * UP is intercepted here for the same structural reason, not for convenience:
     * a signage screen usually has a cross-origin app in an iframe, and while that
     * iframe holds focus the page never sees a key at all. Opening the service bar
     * from inside the page would therefore work on a photo and fail on exactly the
     * content an operator is most likely looking at. Only the OPEN is taken — once
     * the bar is up it owns its own arrows, so navigation inside it still falls
     * through to the page.
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (escapeHatch.onKeyEvent(event)) return true
        if (
            !serviceMenuOpen &&
            event.keyCode == KeyEvent.KEYCODE_DPAD_UP &&
            event.action == KeyEvent.ACTION_DOWN
        ) {
            callServiceBar("open")
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    /**
     * Calls into the web service bar. Silently does nothing when the page hasn't
     * published its handle yet (still booting, or a build that predates the bar) —
     * the shell must never depend on the page being in any particular state.
     */
    private fun callServiceBar(method: String) {
        webView?.evaluateJavascript("window.__signagewallService?.$method?.()", null)
    }

    /**
     * The offline escape. It deliberately does NOT open a menu: the whole reason
     * this lives above the WebView is that it has to work when the page is broken
     * or the network is down — precisely when a web menu cannot render. So it does
     * the one thing that is useful in that state and unlocks the kiosk, leaving the
     * operator free to leave the app. The rich menu is the web one (arrow up).
     */
    private fun onEscapeHatch() {
        kioskController.setMode("off")
    }

    /**
     * The facts the web service menu shows. Assembled here because only the shell
     * knows them — the page cannot read the Android build or the provisioning state.
     */
    private fun deviceInfoJson(): String = json.encodeToString(
        JsonObject.serializer(),
        JsonObject(
            mapOf(
                "androidRelease" to JsonPrimitive(Build.VERSION.RELEASE),
                "androidSdk" to JsonPrimitive(Build.VERSION.SDK_INT),
                "model" to JsonPrimitive("${Build.MANUFACTURER} ${Build.MODEL}"),
                "shellVersion" to JsonPrimitive(BuildConfig.VERSION_NAME),
                "kioskMode" to JsonPrimitive(kioskController.current.name.lowercase()),
                "deviceOwner" to JsonPrimitive(kioskController.isDeviceOwner()),
                // Whether the keep-alive is actually allowed to put the player
                // back on screen. The bar surfaces this because a screen that
                // cannot recover looks identical to a healthy one until the day
                // something knocks it off.
                "canRecover" to JsonPrimitive(canRecover()),
            ),
        ),
    )

    /**
     * Whether Android will let the watchdog pull the player back to the front.
     * Device Owner is allowed unconditionally; everyone else needs the overlay
     * permission, which is the only background-activity-launch exemption a normal
     * app can hold. Without it a player knocked off the screen — by a firmware
     * codec crash, an OEM launcher, anything — stays off it, alive but invisible.
     */
    private fun canRecover(): Boolean =
        kioskController.isDeviceOwner() || Settings.canDrawOverlays(this)

    /**
     * Opens the system screen where the operator grants that permission. Returns
     * false when the device has no such screen (it is optional, and some TV builds
     * omit it) so the bar can say so rather than appear to do nothing.
     */
    private fun requestOverlayPermission(): Boolean {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:$packageName"),
        )
        return try {
            startActivity(intent)
            awaitingOverlayGrant = true
            true
        } catch (t: Throwable) {
            Log.w(TAG, "no overlay-permission settings screen on this device", t)
            false
        }
    }
    /**
     * Restarts after a trip to the overlay-permission settings screen.
     *
     * `Settings.canDrawOverlays()` reads a per-process cache, so a grant made
     * seconds ago is invisible to the running process — measured on device: the
     * app op read `allow` while the player still reported it could not recover,
     * and only a force-stop cleared it. Without this the operator grants the
     * permission, comes back, sees the same warning, and reasonably concludes it
     * did not work.
     *
     * Unconditional, because that same stale read means we cannot tell a grant
     * from a cancel. A needless ten-second restart during setup is a far smaller
     * cost than a screen that quietly keeps its old, broken answer.
     */
    private fun restartAfterOverlayGrant() {
        awaitingOverlayGrant = false
        restartApp()
    }
    /**
     * Closes the player from the web service bar. Marshalled to the UI thread
     * because it arrives on the WebView's JS thread.
     *
     * Whether the close STICKS is the kiosk lock's call, not this menu's. An
     * unlocked screen was asked to quit and stays quit, so the keep-alive is stood
     * down with it. A locked one comes back a few seconds later: self-healing is
     * the only thing the lock actually delivers, and this menu takes no PIN, so
     * leaving a locked screen permanently closable would hand that away to whoever
     * holds the remote. The switch to unlock is right there in the same bar for
     * anyone who genuinely wants the player gone.
     */
    private fun closeApp() {
        runOnUiThread {
            KioskPresence.setClosedByOperator(true)
            if (kioskController.current == KioskController.Mode.OFF) {
                WatchdogService.stop(this)
            }
            finishAndRemoveTask()
        }
    }

    /**
     * Takes this display off the screen it is bound to: drops the durable device id
     * and the WebView's own storage, then restarts. The player comes back unpaired
     * and shows a fresh registration code. The CMS side is not touched — an operator
     * still removes the screen there — because a device must never be able to delete
     * somebody's screen just by standing next to it.
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
        // Back from the overlay-permission screen: the process must restart before
        // it can even see the answer. See restartAfterOverlayGrant.
        if (awaitingOverlayGrant) {
            restartAfterOverlayGrant()
        }
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
        private const val TAG = "KioskActivity"
    }

}
