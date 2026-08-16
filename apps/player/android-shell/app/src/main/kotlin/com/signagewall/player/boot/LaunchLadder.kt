package com.signagewall.player.boot

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Process
import android.os.SystemClock
import android.util.Log
import com.signagewall.player.KioskActivity
import com.signagewall.player.R
import com.signagewall.player.kiosk.KioskPresence
import com.signagewall.player.runtime.RuntimeStateStore
import com.signagewall.player.runtime.ShellLog
import java.io.File

/**
 * Escalating attempts to get the player back on screen.
 *
 * The old code had one strategy: re-issue `startActivity(NEW_TASK)` every ten
 * seconds, forever, and log once at the third refusal. On a non-Device-Owner
 * Android TV that produced a measured 63 consecutive `BAL_BLOCK`s while the screen
 * sat on the OEM launcher — an hour of a byte-identical request that Android had
 * already said no to 62 times.
 *
 * A supervisor that cannot escalate is a supervisor that logs. So each rung gets a
 * couple of attempts, and then the next, differently-privileged one is used:
 *
 *  1. plain `startActivity` — measured 5/5 in ~4s once SYSTEM_ALERT_WINDOW is held,
 *     and this is the only rung the previous code had;
 *  2. a full-screen-intent notification — a background-activity-launch exemption
 *     that is DISTINCT from the overlay permission, so it can work where rung 1 is
 *     refused, and which shows the operator something either way;
 *  3. kill our own process and let the alarm bring it back — discards a wedged
 *     ActivityManager record, which no amount of polite asking can clear.
 *
 * Rungs 2 and 3 are unverified on the target OEM at the time of writing. That is
 * exactly why they are here: a ladder that tries three things and fails is strictly
 * better than one that tries the same thing three thousand times, and the rung the
 * device settled on is reported so the fleet can be told the truth.
 */
class LaunchLadder(
    private val context: Context,
    private val store: RuntimeStateStore =
        RuntimeStateStore(File(context.filesDir, "runtime.json")),
) {

    private var attempts = 0
    private var nextAttemptAt = 0L
    private var lastLoggedRung = -1

    /**
     * Read back from disk, because the top rung KILLS THIS PROCESS — and with it any
     * in-memory record of how far the ladder had climbed. The first version kept the
     * position in a plain field, so every revival started from zero and reached the
     * self-kill again about two minutes later: a device that simply could not
     * foreground itself (no SYSTEM_ALERT_WINDOW, which is every box before an
     * operator visits) rebooted its own process forever, aborting any in-flight
     * update download each time and burning a post-update health attempt on every
     * cycle. `RuntimeState.launchRung` existed for exactly this and nothing read it.
     */
    private var rung = store.read().launchRung

    /**
     * Called on every supervisor tick where the player is not where it should be.
     * Backs off between attempts so a device that genuinely cannot recover does not
     * spend its life in ActivityManager.
     */
    fun attempt(reason: String) {
        val now = SystemClock.elapsedRealtime()
        if (now < nextAttemptAt) {
            return
        }
        attempts += 1
        // Never climbs back DOWN on its own: a device that has already needed the
        // process restart does not get to try the polite rungs again a minute later.
        // Only settling (or a boot) lowers it.
        val next = maxOf(rung, rungFor(attempts))
        if (next != rung) {
            rung = next
            store.update { it.copy(launchRung = next) }
        }
        nextAttemptAt = now + backoffFor(attempts)

        if (rung != lastLoggedRung || attempts % 10 == 0) {
            Log.w(TAG, "player not on screen ($reason); attempt $attempts, rung $rung")
            lastLoggedRung = rung
        }

        when (rung) {
            0 -> startDirect()
            1 -> {
                startDirect()
                showFullScreenIntent()
            }
            else -> if (mayRestart()) {
                store.update { it.copy(launchRung = RESTART_USED_RUNG) }
                restartProcess()
            } else {
                // Already spent. Keep the visible rungs going rather than looping.
                startDirect()
                showFullScreenIntent()
            }
        }
    }

    /** The player is where it belongs: forget the escalation. */
    fun settled() {
        if (attempts != 0 || rung != 0) {
            Log.i(TAG, "player back on screen after $attempts attempt(s) at rung $rung")
            ShellLog.of(context)?.record(
                "recovery",
                "back on screen after $attempts attempt(s) at rung $rung",
            )
            store.update { it.copy(launchRung = 0, recoveries = it.recoveries + 1) }
        }
        attempts = 0
        rung = 0
        nextAttemptAt = 0L
        lastLoggedRung = -1
        cancelFullScreenIntent()
    }

    private fun rungFor(n: Int): Int = when {
        n <= 2 -> 0
        n <= 6 -> 1
        else -> 2
    }

    /**
     * Whether the process restart is still allowed. It is a one-shot: it either
     * cleared whatever was wedged, in which case `settled()` has already lowered the
     * rung, or it did not — and repeating it is a reboot loop that fixes nothing,
     * kills in-flight downloads and poisons a healthy build through the post-update
     * attempt counter. Past that, the ladder keeps asking politely on a long backoff,
     * which is what a screen waiting for an operator to grant a permission needs.
     */
    private fun mayRestart(): Boolean = store.read().launchRung < RESTART_USED_RUNG

    /** 10s while it is probably a transient, then minutes — a screen that cannot
     *  recover must not also flatten the device it is running on. */
    private fun backoffFor(n: Int): Long = when {
        n <= 3 -> 0L
        n <= 6 -> 30_000L
        n <= 12 -> 60_000L
        else -> 300_000L
    }

    private fun startDirect() {
        try {
            context.startActivity(
                Intent(context, KioskActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        } catch (t: Throwable) {
            Log.w(TAG, "direct start refused", t)
        }
    }

    /**
     * A high-importance notification carrying a full-screen intent. Android treats
     * this as a distinct reason to allow an activity launch from the background, and
     * on a TV it also puts something on screen that a passer-by can act on — which
     * beats the launcher sitting there with no explanation.
     */
    private fun showFullScreenIntent() {
        try {
            val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE)
                as NotificationManager
            mgr.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "SignageWall recovery",
                    NotificationManager.IMPORTANCE_HIGH,
                ),
            )
            val pending = PendingIntent.getActivity(
                context,
                1,
                Intent(context, KioskActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            mgr.notify(
                NOTIF_ID,
                Notification.Builder(context, CHANNEL_ID)
                    .setContentTitle("SignageWall Player")
                    .setContentText("Reopening the player…")
                    .setSmallIcon(R.drawable.ic_notification)
                    .setFullScreenIntent(pending, true)
                    .setAutoCancel(true)
                    .build(),
            )
        } catch (t: Throwable) {
            Log.w(TAG, "full-screen intent refused", t)
        }
    }

    private fun cancelFullScreenIntent() {
        try {
            val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE)
                as NotificationManager
            mgr.cancel(NOTIF_ID)
        } catch (_: Throwable) {
            // Nothing to clean up is not a failure.
        }
    }

    /**
     * Last resort. Something in this process — a wedged ActivityManager record, a
     * WebView provider that will not initialise, a leaked window token — is stopping
     * the Activity from ever coming up, and no API clears it. The self-heal alarm
     * scheduled by the supervisor brings the process back within ~15 minutes, and
     * boot-time state is durable, so this loses nothing but the current process.
     *
     * Guarded so it can only happen once the gentler rungs have genuinely failed for
     * minutes, because a restart loop is the one failure worse than a dark screen.
     */
    private fun restartProcess() {
        Log.w(TAG, "no rung worked after $attempts attempts; restarting the process")
        ShellLog.of(context)?.record(
            "recovery",
            "every rung refused after $attempts attempts; restarting the process",
        )
        try {
            context.startActivity(
                Intent(context, KioskActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        } catch (_: Throwable) {
            // Best effort — the point of this rung is the kill that follows.
        }
        KioskPresence.setActivityAlive(false)
        Process.killProcess(Process.myPid())
    }

    private companion object {
        const val TAG = "LaunchLadder"
        const val CHANNEL_ID = "signagewall-player-recovery"
        const val NOTIF_ID = 2

        /** Persisted rung meaning "the process restart has been used once". */
        const val RESTART_USED_RUNG = 3
    }
}
