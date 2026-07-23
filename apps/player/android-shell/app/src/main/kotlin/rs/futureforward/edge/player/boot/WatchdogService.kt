package rs.futureforward.edge.player.boot

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import rs.futureforward.edge.player.KioskActivity
import rs.futureforward.edge.player.R

/**
 * Keep-alive watchdog. A foreground service so the OS is far less likely to kill the
 * app; it relaunches the kiosk Activity if the task is swiped/removed, and
 * START_STICKY brings the service back after a process kill. The Android analogue of
 * the Tauri shell's "refuse to close" behaviour.
 *
 * NOTE: Android 14+ foreground-service + background-activity-launch rules are strict
 * and OEM-variable. On a Device-Owner box this is permissive; off Device Owner it
 * needs on-device verification (a top item in the README).
 */
class WatchdogService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification())
        return START_STICKY
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
                "Edge Player",
                NotificationManager.IMPORTANCE_MIN,
            ),
        )
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Edge Player")
            .setContentText("Signage player is running")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "edge-player-watchdog"
        private const val NOTIF_ID = 1

        fun start(context: Context) {
            context.startForegroundService(Intent(context, WatchdogService::class.java))
        }
    }
}
