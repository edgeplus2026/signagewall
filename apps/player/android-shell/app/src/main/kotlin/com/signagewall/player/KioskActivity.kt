package com.signagewall.player

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.net.Uri
import android.os.Bundle
import android.os.StatFs
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
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
import androidx.webkit.WebViewRenderProcess
import androidx.webkit.WebViewRenderProcessClient
import com.signagewall.player.boot.WatchdogService
import com.signagewall.player.bridge.AndroidBridge
import com.signagewall.player.bridge.BridgeDispatcher
import com.signagewall.player.bridge.BridgeInjection
import com.signagewall.player.identity.DeviceIdStore
import com.signagewall.player.kiosk.EscapeHatch
import com.signagewall.player.kiosk.KioskController
import com.signagewall.player.kiosk.KioskPresence
import com.signagewall.player.runtime.PlayerLiveness
import com.signagewall.player.webview.PageRecovery
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

    /**
     * Whether Chrome DevTools may inspect the page. Written from the JS bridge
     * thread and read when assembling `device_info`, hence @Volatile. Starts false
     * on every process start — see [setWebDebugging] for why it is never persisted.
     */
    @Volatile
    private var webDebugging: Boolean = false

    /** True between a load starting and it finishing or failing — a slow network on a
     *  cold TV must not be mistaken for a hang. */
    private var pageLoading: Boolean = false

    /** Timestamps of recent renderer crashes, for the backoff. */
    private val rendererCrashes = mutableListOf<Long>()

    private val recoveryHandler by lazy { Handler(Looper.getMainLooper()) }

    private val pageRecovery by lazy {
        PageRecovery(
            restartBudget = object : PageRecovery.RestartBudget {
                override fun available(): Boolean =
                    (application as? PlayerApp)?.runtimeStore?.read()?.pageRestartUsed != true

                override fun spend() {
                    (application as? PlayerApp)?.runtimeStore?.update {
                        it.copy(pageRestartUsed = true)
                    }
                }
            },
            actions = object : PageRecovery.Actions {
            override fun reloadPage() = loadPlayer()
            override fun recreateWebView() = this@KioskActivity.recreateWebView()
            override fun restartProcess() = restartApp()
            override fun showOfflinePage() = this@KioskActivity.showOfflinePage()
            override fun isPageLoading(): Boolean = pageLoading
        },
        )
    }

    /** Drives the page-recovery ladder. Cheap: it only reads two timestamps. */
    private val recoveryTick = object : Runnable {
        override fun run() {
            pageRecovery.check()
            recoveryHandler.postDelayed(this, RECOVERY_POLL_MILLIS)
        }
    }

    /** Pushed by the web layer once paired; shown in the on-device service dialog. */
    @Volatile
    private var screenName: String? = null

    // Longer-lived than any single WebView (survive a recreate on render-gone).
    private val deviceIdStore by lazy { DeviceIdStore(File(filesDir, "device.json")) }
    /** Owned by the process (PlayerApp), not by this Activity — a device whose page
     *  never loads still needs a working update channel. */
    private val updater: Updater
        get() = (application as? PlayerApp)?.updater ?: NoopUpdater(BuildConfig.VERSION_NAME)
    private val kioskController by lazy { KioskController(this) }
    private val escapeHatch by lazy {
        EscapeHatch(
            onTriggered = { runOnUiThread { onEscapeHatch() } },
            isLocked = { kioskController.current != KioskController.Mode.OFF },
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        // A new session: whatever the last one asked for, this one is guarded.
        KioskPresence.setClosedByOperator(false)
        // Tells the supervisor a player exists, which is the half of its decision
        // that must never depend on the web page having loaded.
        KioskPresence.setActivityAlive(true)
        // Somebody opened the player. That is the same instruction as boot: whatever
        // a previous "Close application" asked for is over. Without this, a screen
        // closed from the service bar and then reopened by hand stayed permanently
        // unsupervised — desiredRunning was false and only a reboot cleared it.
        KioskPresence.setDesiredRunning(true)
        // Re-apply the lock the CMS last asked for, from disk, before the page has
        // loaded. Loading it into KioskPresence only told the SUPERVISOR what to do;
        // KioskController is what actually calls startLockTask, and it started every
        // process at OFF — so a screen configured as a hard kiosk came back from a
        // power cut fully escapable until the page loaded and pushed the mode again.
        val persisted = KioskPresence.mode()
        if (persisted != KioskController.Mode.OFF) {
            kioskController.setMode(persisted.name.lowercase())
        }
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
        recoveryHandler.postDelayed(recoveryTick, RECOVERY_POLL_MILLIS)
        askForNotificationsOnce()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun installWebView() {
        // A fresh WebView has no service bar on it, so anything the previous page
        // told us about one is now false. Leaving it set left BACK captured by a bar
        // that was not on screen, which on a locked device is unrecoverable without
        // the key hatch. Same for the screen name, which belongs to the page.
        serviceMenuOpen = false
        screenName = null
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
                freeDiskBytes = { freeDiskBytes() },
                onSetWebDebugging = { enabled -> runOnUiThread { setWebDebugging(enabled) } },
                readLog = { (application as? PlayerApp)?.shellLog?.tail() ?: emptyList() },
                readHealth = { healthJson() },
                onChannelCredentials = { apiUrl, token ->
                    (application as? PlayerApp)?.shellChannel?.setCredentials(apiUrl, token)
                },
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
            onRenderGone = { didCrash -> onRendererGone(didCrash) },
            onMainFrameError = { description -> onMainFrameError(description) },
            onMainFrameLoaded = { pageLoading = false; pageRecovery.onPageLoaded() },
        )
        view.webChromeClient = KioskWebChromeClient()

        // A renderer can HANG rather than die, and the two look identical from the
        // outside: the Activity is resumed, the window is up, the last frame is
        // still painted. onRenderProcessGone never fires for it. The page-recovery
        // ladder catches it eventually through the missing heartbeat, but Android
        // will tell us directly and sooner if we ask — and terminating a wedged
        // renderer deliberately routes into the existing gone-path, which already
        // knows how to rebuild with backoff.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_VIEW_RENDERER_CLIENT_BASIC_USAGE)) {
            WebViewCompat.setWebViewRenderProcessClient(
                view,
                object : WebViewRenderProcessClient() {
                    override fun onRenderProcessUnresponsive(
                        view: WebView,
                        renderer: WebViewRenderProcess?,
                    ) {
                        Log.w(TAG, "renderer unresponsive; terminating it")
                        renderer?.terminate()
                    }

                    override fun onRenderProcessResponsive(
                        view: WebView,
                        renderer: WebViewRenderProcess?,
                    ) {
                        Log.i(TAG, "renderer responsive again")
                    }
                },
            )
        }

        setContentView(view)
        enterImmersive()
        view.requestFocus()
        pageLoading = true
        PlayerLiveness.reset()
        pageRecovery.noteLoadStarted()
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
     * Opens or closes Chrome DevTools inspection of the player page.
     *
     * Deliberately NOT persisted. A screen left inspectable is a screen anyone who
     * reaches it can read and rewrite, and the one person who would remember to
     * close it is the technician who has already driven away. So it dies with the
     * process — every restart, update and power cut closes it — and the operator
     * who needs it is present to switch it on again.
     *
     * The WebView API is static and has no getter, so the flag is mirrored here to
     * answer `device_info`.
     */
    private fun setWebDebugging(enabled: Boolean) {
        WebView.setWebContentsDebuggingEnabled(enabled)
        webDebugging = enabled
        Log.i(TAG, "web contents debugging ${if (enabled) "enabled" else "disabled"}")
    }

    /**
     * How hard this screen has been struggling, for the heartbeat.
     *
     * Only counters and a breadcrumb — no DevicePolicyManager, no Settings lookup,
     * nothing that `device_info` does for the service menu. It is read every thirty
     * seconds on hardware that is already short of everything.
     *
     * `lastCrash` is trimmed here rather than on the way out: it is the message of
     * an arbitrary exception, and the one place that knows it should be short is
     * the one place that knows why it is being sent.
     */
    private fun healthJson(): String {
        val state = (application as? PlayerApp)?.runtimeStore?.read()
        return json.encodeToString(
            JsonObject.serializer(),
            JsonObject(
                mapOf(
                    "recoveries" to JsonPrimitive(state?.recoveries ?: 0),
                    "lastCrash" to JsonPrimitive(state?.lastCrash?.take(MAX_CRASH_REPORT_CHARS)),
                    "lastCrashAt" to JsonPrimitive(state?.lastCrashAt ?: 0L),
                ),
            ),
        )
    }

    /**
     * Free bytes where the app keeps its data — the WebView's caches included, since
     * they live under this same partition. -1 when the device will not say, which the
     * caller reads as "unknown" rather than as "full".
     *
     * `filesDir`, not the external/primary volume: a signage box often has a large SD
     * card the browser cannot use, and answering with that would invite the cache to
     * grow into space it can never reach.
     */
    private fun freeDiskBytes(): Long =
        try {
            StatFs(filesDir.absolutePath).availableBytes
        } catch (t: Throwable) {
            Log.w(TAG, "could not read free disk space", t)
            -1L
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
                // How hard the shell is currently working to keep this page alive.
                // Zero is healthy; anything else is a screen that keeps needing
                // intervention, which from the outside is indistinguishable from a
                // screen that is simply fine.
                "recoveryRung" to JsonPrimitive(pageRecovery.currentRung()),
                // Free bytes on the app's partition. Shown to the technician
                // because it is the one resource that fails silently: the cache
                // grows, updates stop landing, and the screen looks fine until
                // the day the box has nothing left. -1 means the OS refused to
                // measure, which the menu shows as unknown rather than as zero.
                "freeDiskBytes" to JsonPrimitive(freeDiskBytes()),
                // Present only on a shell that can actually do it, so the menu can
                // hide the switch entirely rather than offer one that does nothing
                // on a browser, the desktop shell, or an older APK.
                "webDebugging" to JsonPrimitive(webDebugging),
            ),
        ),
    )

    /**
     * Asks for notification permission, exactly once per install.
     *
     * The recovery ladder's second rung is a full-screen-intent notification — a
     * background-activity-launch exemption distinct from the overlay permission, and
     * the shell's only other way onto the screen. On Android 13+ the manifest
     * declaration alone buys nothing: the notification is posted, silently dropped,
     * and the rung reads as a working escalation in the log while doing nothing.
     *
     * Once, and persisted, because the alternative is a system dialog appearing over
     * a shop's content on every boot. The first launch is also when a technician is
     * most likely to be present — the same moment the overlay permission is granted.
     */
    private fun askForNotificationsOnce() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return
        }
        val store = (application as? PlayerApp)?.runtimeStore ?: return
        if (store.read().askedForNotifications) {
            return
        }
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        store.update { it.copy(askedForNotifications = true) }
        // The prompt takes the foreground, and the keep-alive would drag the player
        // back over it — the same trap the overlay grant fell into.
        KioskPresence.suppressReclaim(SYSTEM_SCREEN_GRACE_MILLIS)
        try {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        } catch (t: Throwable) {
            KioskPresence.clearSuppression()
            Log.w(TAG, "could not ask for notification permission", t)
        }
    }

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
            // The keep-alive would otherwise drag the player back over the settings
            // screen within ~4s, which is how the one flow that repairs a screen's
            // ability to heal became impossible to complete.
            KioskPresence.suppressReclaim(SYSTEM_SCREEN_GRACE_MILLIS)
            startActivity(intent)
            awaitingOverlayGrant = true
            true
        } catch (t: Throwable) {
            // Undo it. On a TV with no such settings screen the suppression would
            // otherwise stand for three minutes with nothing on screen to justify
            // it — the supervisor silently disarmed at the exact moment somebody is
            // poking at the device.
            KioskPresence.clearSuppression()
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
                // Persisted, so a supervisor revived in a fresh process honours it
                // instead of cheerfully reopening what the operator just closed.
                // Boot clears it — see BootReceiver.
                KioskPresence.setDesiredRunning(false)
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
        // Mark the wipe and let the NEXT process do it. WebStorage.deleteAllData
        // and CookieManager.removeAllCookies are asynchronous — the old code fired
        // them and then called Runtime.exit(0) microseconds later, so they
        // essentially never ran. That left localStorage intact while device.json
        // was gone, and the web bootstrap then PROMOTED the surviving local id back
        // into the native store: a screen moved from one customer to another
        // deterministically re-adopted the first customer's identity.
        (application as? PlayerApp)?.runtimeStore?.update {
            it.copy(deactivatePending = true)
        }
        deviceIdStore.clear()
        restartApp()
    }

    /**
     * Rebuilds the WebView after its renderer died.
     *
     * Guarded three ways, none of which existed before. Without the
     * finishing/destroyed check this runs against a dead Activity during teardown;
     * without the backoff a renderer that dies on load (a poison video, a broken GPU
     * driver) rebuilds instantly and dies again, forever, as fast as the hardware
     * allows; and without the escalation the shell keeps doing the one thing that has
     * already failed three times, instead of restarting the process — which is the
     * only thing that resets the GPU and codec handles.
     */
    private fun recreateWebView() {
        if (isFinishing || isDestroyed) {
            return
        }
        webView?.let { old ->
            (old.parent as? ViewGroup)?.removeView(old)
            old.destroy()
        }
        webView = null
        installWebView()
    }

    /**
     * A renderer death is either the system reclaiming memory — routine, recover at
     * once — or a genuine crash, which on this hardware usually means the software
     * video decoder took the renderer with it. Those arrive in bursts, so they get a
     * growing delay and, past a threshold, a whole new process.
     */
    private fun onRendererGone(didCrash: Boolean) {
        if (!didCrash) {
            recreateWebView()
            return
        }
        val now = SystemClock.elapsedRealtime()
        rendererCrashes.removeAll { it < now - CRASH_WINDOW_MILLIS }
        rendererCrashes.add(now)
        if (rendererCrashes.size >= CRASHES_BEFORE_RESTART) {
            Log.w(TAG, "renderer crashed ${rendererCrashes.size} times; restarting process")
            rendererCrashes.clear()
            restartApp()
            return
        }
        val delay = RENDERER_BACKOFF_MILLIS.getOrElse(rendererCrashes.size - 1) { 30_000L }
        Log.w(TAG, "renderer crash ${rendererCrashes.size}; rebuilding in ${delay}ms")
        recoveryHandler.postDelayed({ recreateWebView() }, delay)
    }

    /**
     * The main document failed to load. This had no handler at all, which is why a TV
     * that came up before its router put a Chromium error page on the wall until
     * somebody drove out to it.
     */
    private fun onMainFrameError(description: String) {
        pageLoading = false
        Log.w(TAG, "main frame failed to load: " + description)
        showOfflinePage()
    }

    /** Our own page instead of the browser's error page, with the real URL still
     *  retried underneath by [pageRecovery]. */
    private fun showOfflinePage() {
        webView?.loadUrl(OFFLINE_PAGE_URL)
    }

    private fun loadPlayer() {
        pageLoading = true
        PlayerLiveness.reset()
        pageRecovery.noteLoadStarted()
        webView?.loadUrl(BuildConfig.SIGNAGEWALL_PLAYER_URL)
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
        KioskPresence.clearSuppression()
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
        recoveryHandler.removeCallbacksAndMessages(null)
        KioskPresence.setActivityAlive(false)
        webView?.destroy()
        webView = null
        super.onDestroy()
    }

    private companion object {
        private const val TAG = "KioskActivity"

        /** How long the keep-alive stands down while an operator is in a system
         *  screen we opened. Long enough to read a list and press OK. */
        private const val SYSTEM_SCREEN_GRACE_MILLIS = 3 * 60 * 1000L
        /** How often the page-recovery ladder is consulted. */
        private const val RECOVERY_POLL_MILLIS = 15_000L

        /** Renderer crashes inside this window count towards the restart threshold. */
        private const val CRASH_WINDOW_MILLIS = 10 * 60 * 1000L
        private const val CRASHES_BEFORE_RESTART = 3
        private val RENDERER_BACKOFF_MILLIS = listOf(0L, 2_000L, 8_000L)

        private const val OFFLINE_PAGE_URL = "file:///android_asset/offline.html"

        /** Enough of a crash message to recognise it; short of shipping a stack. */
        private const val MAX_CRASH_REPORT_CHARS = 200

    }

}
