package com.signagewall.player.boot

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import com.signagewall.player.KioskActivity
import com.signagewall.player.R
import com.signagewall.player.kiosk.KioskController
import com.signagewall.player.kiosk.KioskPresence

/**
 * Keep-alive watchdog. A foreground service so the OS is far less likely to kill the
 * app; it relaunches the kiosk Activity if the task is swiped/removed, and
 * START_STICKY brings the service back after a process kill. The Android analogue of
 * the Tauri shell's "refuse to close" behaviour.
 *
 * It also polls, because `onTaskRemoved` only covers the task actually going away.
 * A HOME press does not remove the task — the Activity is simply backgrounded and
 * stays there, which on a locked signage screen means the content is gone until
 * someone walks over. Measured on an Android TV: after HOME the launcher held the
 * foreground indefinitely and nothing brought the player back.
 *
 * NOTE: Android 14+ foreground-service + background-activity-launch rules are strict
 * and OEM-variable. On a Device-Owner box this is permissive; off Device Owner it
 * needs on-device verification (a top item in the README).
 */
class WatchdogService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    private val handler = Handler(Looper.getMainLooper())
    /** Consecutive ticks that asked for the foreground and did not get it. */
    private var refusedReclaims = 0
    private val tick = object : Runnable {
        override fun run() {
            if (KioskPresence.shouldReclaimForeground()) {
                // Still backgrounded a tick after asking means the previous request
                // was refused — `startActivity` reports that by doing nothing, not by
                // throwing, so this count is the only evidence we can produce.
                refusedReclaims++
                if (refusedReclaims == REFUSALS_BEFORE_WARNING) {
                    Log.w(
                        TAG,
                        "the player has been backgrounded for " +
                            "${REFUSALS_BEFORE_WARNING * POLL_MILLIS / 1000}s and Android " +
                            "keeps refusing to bring it back (background activity launch " +
                            "is blocked). Provision the app as Device Owner to make the " +
                            "kiosk hold; logging this once until it recovers.",
                    )
                }
                reclaimForeground()
            } else {
                refusedReclaims = 0
            }
            handler.postDelayed(this, POLL_MILLIS)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification())
        handler.removeCallbacks(tick)
        handler.postDelayed(tick, POLL_MILLIS)
        return START_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(tick)
        super.onDestroy()
    }

    /**
     * Background activity launch is restricted from Android 10 and the rules are
     * OEM-variable; a Device Owner box is permissive, everything else may simply
     * refuse. Failing here must not take the watchdog down with it — a screen that
     * cannot pull itself forward is still better than one with no watchdog at all.
     */
    private fun reclaimForeground() {
        try {
            startActivity(
                Intent(this, KioskActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        } catch (t: Throwable) {
            Log.w(TAG, "could not bring the player back to the foreground", t)
        }
    }

    /**
     * The task disappearing usually means somebody swiped the player out of
     * Recents, which on a signage screen is exactly what this service is for, so
     * the default is to undo it at once.
     *
     * A close asked for from the service bar is different. It removes the task the
     * same way, but the operator must SEE the player go away — relaunching in the
     * same breath made the menu's "Close application" look broken. So a locked
     * screen gets the return on a delay instead, and an unlocked one keeps it.
     *
     * The delay is short on purpose. Android only lets a background app start an
     * activity for about ten seconds after it was last in the foreground; waiting
     * for the next watchdog tick would land outside that window and the return
     * would simply be refused on any box that is not Device Owner.
     */
    override fun onTaskRemoved(rootIntent: Intent?) {
        if (!KioskPresence.wasClosedByOperator()) {
            reclaimForeground()
        } else if (KioskPresence.mode() != KioskController.Mode.OFF) {
            handler.postDelayed(::reclaimForeground, OPERATOR_CLOSE_RETURN_MILLIS)
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
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val TAG = "Watchdog"
        /** Slow enough to be invisible on battery/CPU, quick enough that a screen
         *  nobody is watching is dark for seconds rather than minutes. */
        private const val POLL_MILLIS = 10_000L
        /** ~30s of refusals before saying so — long enough not to fire on the normal
         *  one-tick lag between asking and the Activity actually resuming. */
        private const val REFUSALS_BEFORE_WARNING = 3
        /** Long enough that the close is visibly real, short enough to stay inside
         *  Android's ~10s background-activity-launch grace period. */
        private const val OPERATOR_CLOSE_RETURN_MILLIS = 5_000L
        private const val CHANNEL_ID = "signagewall-player-watchdog"
        private const val NOTIF_ID = 1

        fun start(context: Context) {
            context.startForegroundService(Intent(context, WatchdogService::class.java))
        }

        /** Stands the keep-alive down — only for a deliberate close. */
        fun stop(context: Context) {
            context.stopService(Intent(context, WatchdogService::class.java))
        }
    }
}
