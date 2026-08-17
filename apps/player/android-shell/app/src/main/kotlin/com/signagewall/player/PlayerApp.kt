package com.signagewall.player

import android.app.AlarmManager
import android.app.Application
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.StatFs
import android.os.SystemClock
import android.util.Log
import com.signagewall.player.boot.HeartbeatReceiver
import com.signagewall.player.kiosk.KioskPresence
import com.signagewall.player.runtime.PlayerLiveness
import com.signagewall.player.runtime.RuntimeStateStore
import com.signagewall.player.runtime.ShellChannel
import com.signagewall.player.runtime.ShellLog
import com.signagewall.player.update.HealthWatchdog
import com.signagewall.player.update.NoopUpdater
import com.signagewall.player.update.OtaUpdater
import com.signagewall.player.update.Updater
import com.signagewall.player.update.UpdaterStateStore
import java.io.File

/**
 * Process entry point, and the first place that knows what this display is supposed
 * to be doing.
 *
 * Order matters here. Durable runtime state is loaded into [KioskPresence] before
 * anything else, because the supervisor may be the ONLY thing in this process — a
 * sticky service restart, a boot, and a package replace all create a process with no
 * Activity, and the old design left the supervisor's arming condition at its default
 * "do nothing" until a loaded web page said otherwise. A process that comes up
 * without an Activity is exactly the case that needs to start one.
 *
 * On OTA builds it also creates the process-wide [HealthWatchdog] and arms it BEFORE
 * the WebView loads, so a freshly-installed version that never even loads the page is
 * still caught.
 */
class PlayerApp : Application() {

    var postUpdateHealth: HealthWatchdog? = null
        private set

    /**
     * The self-updater, owned by the PROCESS rather than by the Activity.
     *
     * It used to be `KioskActivity by lazy`, so the OtaUpdater object was not even
     * CONSTRUCTED until the remote page made its first bridge call — on a device whose
     * page could not load, the one mechanism capable of repairing it never came into
     * existence. Everything that drove it (the nightly reload, the 6h maintenance
     * tick, standby) also lived in the page. Now the supervisor drives it and the web
     * only ever hints that this is a convenient moment.
     */
    var updater: Updater = NoopUpdater("")
        private set

    lateinit var runtimeStore: RuntimeStateStore
        private set

    /**
     * The rolling event log. Created before anything else that might want to write
     * to it, and held on the Application so a restarted Activity keeps appending to
     * the same file instead of starting a fresh story each time.
     */
    lateinit var shellLog: ShellLog
        private set

    /**
     * The shell's own line to the backend. Created here, on the Application, for
     * the same reason the updater is: it must exist in a process that has no
     * Activity at all, which is exactly the process that needs it most.
     */
    lateinit var shellChannel: ShellChannel
        private set

    /**
     * Whether [shellLog] has been created yet. `lateinit` throws when read early,
     * and the one caller who must never throw is a crash handler — so readers ask
     * this instead of risking a second failure while reporting the first.
     */
    var logReady: Boolean = false
        private set

    override fun onCreate() {
        super.onCreate()

        shellLog = ShellLog(File(filesDir, "shell.log"))
        logReady = true
        runtimeStore = RuntimeStateStore(File(filesDir, "runtime.json"))
        val state = runtimeStore.read()
        // First line after every process start. Without it a log is a list of
        // events with no way to tell "the screen recovered" from "the screen was
        // restarted and then recovered" — and the difference is the whole diagnosis.
        shellLog.record("boot", "process started, desiredState=${state.desiredState}")
        KioskPresence.attach(runtimeStore, state)

        // A deactivate asked the previous process to erase this device's identity.
        // The WebView's own storage can only be wiped safely before any WebView
        // exists, so the wipe happens on the way IN rather than on the way out — see
        // KioskActivity.deactivatePlayer for why the old in-place version could not
        // have worked.
        if (state.deactivatePending) {
            wipeWebViewStorage()
            runtimeStore.update { it.copy(deactivatePending = false) }
        }

        shellChannel = ShellChannel(
            credentialsFile = File(filesDir, "channel.json"),
            shellVersion = BuildConfig.VERSION_NAME,
            readState = { runtimeStore.read() },
            readFreeDisk = { freeDiskBytes() },
            readLog = { shellLog.tail() },
            // What the page cannot report about itself. PlayerLiveness is beaten by
            // the page's own event loop, so a stale beat means the page is gone or
            // frozen — the exact condition this channel exists to surface.
            isPageAlive = { PlayerLiveness.sinceBeat() < PAGE_ALIVE_WINDOW_MILLIS },
            onCommand = { command -> runShellCommand(command) },
            log = shellLog,
        )

        installCrashHandler()

        if (BuildConfig.UPDATE_MANIFEST_URL.isNotBlank()) {
            val health = HealthWatchdog(
                stateStore = UpdaterStateStore(File(filesDir, "updates/state.json")),
                currentVersionName = BuildConfig.VERSION_NAME,
                currentVersionCode = BuildConfig.VERSION_CODE,
                runtimeStore = runtimeStore,
                onRollback = {
                    // The state already flags `unhealthy` for the CMS. A silent DO
                    // downgrade-reinstall of the last-good APK is verify-pending.
                },
            )
            health.armIfPostUpdate()
            postUpdateHealth = health
            updater = OtaUpdater(
                context = this,
                currentVersionName = BuildConfig.VERSION_NAME,
                currentVersionCode = BuildConfig.VERSION_CODE,
                manifestUrl = BuildConfig.UPDATE_MANIFEST_URL,
                health = health,
            )
        } else {
            updater = NoopUpdater(BuildConfig.VERSION_NAME)
        }
    }

    /**
     * Free bytes where the app keeps its data, for the shell's own report. The
     * Activity has its own copy for `device_info`; this one exists because the
     * process that most needs to report is the one with no Activity in it.
     */
    private fun freeDiskBytes(): Long =
        try {
            StatFs(filesDir.absolutePath).availableBytes
        } catch (t: Throwable) {
            Log.w(TAG, "could not read free disk space", t)
            -1L
        }

    /**
     * Runs a command that arrived on the shell's channel.
     *
     * The list is short and every entry is safe on a screen whose real state
     * nobody knows — this path is only ever reached because something already
     * went wrong. Unknown commands are ignored rather than rejected: a newer
     * backend must be able to add one without breaking every older device.
     */
    private fun runShellCommand(command: String) {
        shellLog.record("channel", "running $command")
        when (command) {
            "restart" -> restartFromShell()
            "reload", "applyUpdate" -> {
                // Both need the Activity: one reloads its WebView, the other
                // installs and relaunches. Getting it on screen is the same first
                // step, and if it will not come up, `restart` is the rung above.
                val updater = updater
                if (command == "applyUpdate" && updater is OtaUpdater) {
                    updater.refreshAndMaybeApply()
                } else {
                    startPlayerActivity()
                }
            }
            else -> Log.w(TAG, "unknown shell command: $command")
        }
    }

    private fun startPlayerActivity() {
        try {
            startActivity(
                Intent(this, KioskActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        } catch (t: Throwable) {
            Log.w(TAG, "could not start the player", t)
        }
    }

    /**
     * Restarts by scheduling the alarm and exiting, rather than by starting an
     * Activity first. The channel runs in a process that may have no Activity and
     * no foreground at all, where a background-activity launch is exactly what
     * Android refuses — the alarm has no such problem.
     */
    private fun restartFromShell() {
        scheduleRestart()
        Runtime.getRuntime().exit(0)
    }

    /**
     * Any uncaught exception used to end the process with nothing arranged to bring
     * it back: no Activity, no service, and — before the supervisor rewrite — no
     * durable state that would have let a revived service do anything about it. Now
     * the crash is recorded for the CMS and an alarm is armed a few seconds out, so
     * even a crash on the first line of `onCreate` heals itself.
     *
     * The previous handler is still called: swallowing a crash would hide it from
     * logcat and from the OS, and this is a breadcrumb, not a recovery from the error
     * itself.
     */
    private fun installCrashHandler() {
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            try {
                runtimeStore.update {
                    it.copy(
                        lastCrash = "${error.javaClass.simpleName}: ${error.message}"
                            .take(MAX_CRASH_CHARS),
                        lastCrashAt = System.currentTimeMillis(),
                    )
                }
                // The single most valuable line in the file: the log survives the
                // process, so the next person sees what killed it and when.
                if (logReady) {
                    shellLog.record(
                        "crash",
                        "${error.javaClass.simpleName}: ${error.message}",
                    )
                }
                scheduleRestart()
            } catch (t: Throwable) {
                Log.w(TAG, "crash handler failed", t)
            }
            previous?.uncaughtException(thread, error)
        }
    }

    private fun scheduleRestart() {
        val alarms = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pending = PendingIntent.getBroadcast(
            this,
            2,
            Intent(this, HeartbeatReceiver::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        // An EXACT alarm needs SCHEDULE_EXACT_ALARM from Android 12, which this app
        // does not hold and should not — asking for it to restart a crashed player is
        // out of proportion, and Play restricts it. Attempting it anyway throws a
        // SecurityException, and throwing from inside the uncaught-exception handler
        // would turn one crash into two. An inexact alarm may drift by minutes; a
        // screen that comes back in three minutes instead of five is not the problem
        // this handler exists to solve.
        try {
            alarms.setExactAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + RESTART_DELAY_MILLIS,
                pending,
            )
        } catch (_: SecurityException) {
            alarms.setAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + RESTART_DELAY_MILLIS,
                pending,
            )
        }
    }

    /**
     * Recursively removes the WebView's data directories. Only ever reached from the
     * deactivate marker, before the first WebView is constructed — `WebStorage` and
     * `CookieManager` deletes are asynchronous, so doing this on the way out (as the
     * shell used to) raced a `Runtime.exit(0)` that followed microseconds later and
     * essentially never completed.
     */
    private fun wipeWebViewStorage() {
        try {
            listOf(
                getDir("webview", MODE_PRIVATE),
                File(applicationInfo.dataDir, "app_webview"),
                File(cacheDir, "WebView"),
            ).forEach { dir -> if (dir.exists()) dir.deleteRecursively() }
            Log.i(TAG, "wiped WebView storage for a pending deactivate")
        } catch (t: Throwable) {
            Log.w(TAG, "could not wipe WebView storage", t)
        }
    }

    private companion object {
        const val TAG = "PlayerApp"
        const val MAX_CRASH_CHARS = 300

        /** Long enough that a crash loop backs off a little, short enough that a
         *  one-off crash is invisible to anyone watching the screen. */
        const val RESTART_DELAY_MILLIS = 5_000L
    }
}
