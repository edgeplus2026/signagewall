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
    private val tick = object : Runnable {
        override fun run() {
            if (KioskPresence.shouldReclaimForeground()) reclaimForeground()
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

    override fun onTaskRemoved(rootIntent: Intent?) {
        startActivity(
            Intent(this, KioskActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
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
        private const val CHANNEL_ID = "signagewall-player-watchdog"
        private const val NOTIF_ID = 1

        fun start(context: Context) {
            context.startForegroundService(Intent(context, WatchdogService::class.java))
        }
    }
}
