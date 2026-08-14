package com.signagewall.player.boot

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import com.signagewall.player.KioskActivity
import com.signagewall.player.PlayerApp
import com.signagewall.player.update.OtaUpdater
import com.signagewall.player.R
import com.signagewall.player.kiosk.KioskController
import com.signagewall.player.kiosk.KioskPresence

/**
 * The supervisor. A foreground service that owns the player's lifecycle: it is the
 * only thing that starts [KioskActivity], and it keeps starting it until the player
 * is actually on screen.
 *
 * This used to be a keep-alive that only ran when the Activity had already created
 * it, and only acted when a loaded page had pushed a kiosk lock. Every way of
 * losing the Activity therefore lost everything — the service came back under
 * START_STICKY into a fresh process, found the mode at its default OFF, and polled
 * uselessly forever. Now intent-to-run lives on disk (see `RuntimeState`) and is
 * loaded before any Activity exists, so a bare service in a bare process is enough
 * to put the player back.
 *
 * The other half of the rewrite is that recovery ESCALATES. The old code re-issued a
 * byte-identical intent every ten seconds and logged once; on a non-Device-Owner TV
 * Android refused it 63 times in a row while the screen sat on the launcher. Now
 * each rung is given a couple of attempts and then the next, stronger one is used —
 * see [LaunchLadder]. What actually works on which OEM is not knowable in advance,
 * so the ladder tries everything it has rather than betting on one call.
 */
class WatchdogService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    private val handler = Handler(Looper.getMainLooper())
    private lateinit var ladder: LaunchLadder

    /**
     * Last manifest check, on the monotonic clock. Null means "never", which is NOT
     * the same as 0: `elapsedRealtime` also starts near zero at boot, so a sentinel
     * of 0 made `now - 0 < UPDATE_CHECK_MILLIS` true for the first hour of uptime
     * and suppressed exactly the check that matters most — the one right after a
     * device comes back from a power cut.
     */
    private var lastUpdateCheckAt: Long? = null

    private val tick = object : Runnable {
        override fun run() {
            try {
                supervise()
            } catch (t: Throwable) {
                // The supervisor is the last thing standing; it must never be the
                // thing that dies. A tick that throws still schedules the next.
                Log.w(TAG, "supervisor tick failed", t)
            }
            handler.postDelayed(this, POLL_MILLIS)
        }
    }

    /**
     * One decision per tick, in priority order. "No player at all" outranks "player
     * is behind something": the first is never a state anyone asked for, the second
     * might be an operator standing at the screen.
     */
    private fun supervise() {
        when {
            KioskPresence.shouldLaunch() -> ladder.attempt("no activity")
            KioskPresence.shouldReclaimForeground() -> ladder.attempt("backgrounded")
            else -> ladder.settled()
        }
        maybeCheckForUpdate()
    }

    /**
     * Keeps the update channel alive from the SHELL rather than from the page.
     *
     * Every trigger used to live in the web layer — the nightly reload, a 6h timer,
     * standby — and the updater object was not even constructed until the page made a
     * bridge call. So the one lever capable of repairing a broken screen was gated on
     * the screen not being broken. It also meant the manifest was read once per
     * process: a display that runs for four months read it in March and answered from
     * that cache until July.
     *
     * The web triggers still exist and are still useful — they pick a moment when the
     * screen is dark or idle — but they are hints now, not the only path.
     */
    private fun maybeCheckForUpdate() {
        val now = SystemClock.elapsedRealtime()
        val last = lastUpdateCheckAt
        if (last != null && now - last < UPDATE_CHECK_MILLIS) {
            return
        }
        lastUpdateCheckAt = now
        val updater = (application as? PlayerApp)?.updater
        if (updater is OtaUpdater) {
            updater.refreshAndMaybeApply()
        }
    }

    override fun onCreate() {
        super.onCreate()
        ladder = LaunchLadder(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            startForeground(NOTIF_ID, buildNotification())
        } catch (t: Throwable) {
            // An OEM that refuses the foreground-service start must not take the
            // supervisor with it — a background service that still ticks is worth
            // more than no supervisor at all.
            Log.w(TAG, "could not enter the foreground", t)
        }
        scheduleSelfHeal()

        // Act NOW rather than after a full poll interval. This path is reached on a
        // START_STICKY revival after a process kill, on boot, and after a package
        // replace — every case where the screen is already dark and a ten-second
        // wait is ten seconds of nothing.
        handler.removeCallbacks(tick)
        handler.post(tick)
        return START_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(tick)
        super.onDestroy()
    }

    /**
     * A repeating alarm that re-starts this service. START_STICKY is a request, not
     * a guarantee: OEM task-killers and some low-memory paths drop the service
     * without reviving it, and the supervisor cannot supervise its own absence.
     * `setInexactRepeating` is deliberate — this is a safety net, not a clock, and
     * an inexact alarm the OS is free to batch costs nothing.
     */
    private fun scheduleSelfHeal() {
        try {
            val alarms = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val pending = PendingIntent.getBroadcast(
                this,
                0,
                Intent(this, HeartbeatReceiver::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            alarms.setInexactRepeating(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + SELF_HEAL_MILLIS,
                SELF_HEAL_MILLIS,
                pending,
            )
        } catch (t: Throwable) {
            Log.w(TAG, "could not schedule the self-heal alarm", t)
        }
    }

    /**
     * The task disappearing usually means somebody swiped the player out of Recents,
     * which on a signage screen is exactly what this service is for, so the default
     * is to undo it at once.
     *
     * A close asked for from the service bar is different. It removes the task the
     * same way, but the operator must SEE the player go away — relaunching in the
     * same breath made the menu's "Close application" look broken. So a locked
     * screen gets the return on a short delay instead, and an unlocked one keeps it.
     *
     * The delay is short on purpose: Android only lets a background app start an
     * activity for about ten seconds after it was last in the foreground, so waiting
     * for the next tick would land outside that window and simply be refused.
     */
    override fun onTaskRemoved(rootIntent: Intent?) {
        if (!KioskPresence.wasClosedByOperator()) {
            ladder.attempt("task removed")
        } else if (KioskPresence.mode() != KioskController.Mode.OFF) {
            handler.postDelayed(
                { ladder.attempt("operator close, locked") },
                OPERATOR_CLOSE_RETURN_MILLIS,
            )
        }
        super.onTaskRemoved(rootIntent)
    }

    private fun buildNotification(): Notification {
        val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        mgr.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "SignageWall Player",
                NotificationManager.IMPORTANCE_MIN,
            ),
        )
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("SignageWall Player")
            .setContentText("Signage player is running")
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val TAG = "Watchdog"

        /** Slow enough to be invisible on battery/CPU, quick enough that a screen
         *  nobody is watching is dark for seconds rather than minutes. */
        private const val POLL_MILLIS = 10_000L

        /** Long enough that a deliberate close is visibly real, short enough to stay
         *  inside Android's ~10s background-activity-launch grace period. */
        private const val OPERATOR_CLOSE_RETURN_MILLIS = 5_000L

        /** The supervisor cannot supervise its own absence; this is what wakes it. */
        private const val SELF_HEAL_MILLIS = 15 * 60 * 1000L

        /** How often the update channel is consulted. Hourly is far more often than
         *  releases happen, and the fetch is a few hundred bytes — the cost of being
         *  wrong in the other direction is a fleet that cannot be reached. */
        private const val UPDATE_CHECK_MILLIS = 60 * 60 * 1000L

        private const val CHANNEL_ID = "signagewall-player-watchdog"
        private const val NOTIF_ID = 1

        fun start(context: Context) {
            try {
                context.startForegroundService(Intent(context, WatchdogService::class.java))
            } catch (t: Throwable) {
                Log.w(TAG, "could not start the supervisor", t)
            }
        }

        /** Stands the keep-alive down — only for a deliberate close of an unlocked
         *  screen, where the operator has said they want the player gone. */
        fun stop(context: Context) {
            try {
                context.stopService(Intent(context, WatchdogService::class.java))
            } catch (t: Throwable) {
                Log.w(TAG, "could not stop the supervisor", t)
            }
        }
    }
}
