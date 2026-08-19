package com.signagewall.player.kiosk

import android.app.Activity
import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Log
import com.signagewall.player.KioskActivity
import com.signagewall.player.runtime.ShellLog

/**
 * The kiosk-lockdown state machine, driven by the web via `AndroidBridge.setKioskLock`
 * (set on the device, in the player's service menu). Three modes, plus an implicit
 * HARD_DEGRADED: a HARD request on a non-Device-Owner device falls back to SOFT and
 * logs the gap (you cannot un-escapably lock without provisioning).
 *
 *  - HARD = Device Owner + LockTask allowlist + `startLockTask()` (un-escapable) +
 *    status bar disabled + self as persistent HOME.
 *  - SOFT = `startLockTask()` without a DO allowlist → OS screen-pinning
 *    (user-escapable via Back+Recents). No provisioning required.
 *  - OFF  = `stopLockTask()` + clear DO lock features → a normal app.
 *
 * All LockTask APIs must run on the main thread; [setMode] marshals there. Idempotent.
 *
 * NOTE: LockTask + HOME-override behaviour varies across Android-TV OEMs — this is a
 * top on-device verification item (README). Treat the exact calls as a starting point.
 */
class KioskController(private val activity: Activity) {

    enum class Mode { OFF, SOFT, HARD }

    private val dpm =
        activity.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val activityManager =
        activity.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    private val admin = ComponentName(activity, PlayerDeviceAdminReceiver::class.java)

    @Volatile
    var current: Mode = Mode.OFF
        private set

    /** Entry point from the bridge. Parses the string mode and applies on the UI thread. */
    fun setMode(modeStr: String) {
        val mode = parse(modeStr)
        activity.runOnUiThread { apply(mode) }
    }

    private fun apply(mode: Mode) {
        try {
            when (mode) {
                Mode.HARD -> if (isDeviceOwner()) applyHard() else applyDegraded()
                Mode.SOFT -> applySoft()
                Mode.OFF -> applyOff()
            }
            current = mode
            // The watchdog decides whether to pull the player back to the front from
            // this, and it must never act on a mode that failed to apply.
            KioskPresence.setMode(mode)
        } catch (t: Throwable) {
            Log.w(TAG, "failed to apply kiosk mode $mode", t)
            // Durable, not just logcat. A screen that silently failed to lock looks
            // identical to one that locked fine, and on this hardware logcat is gone
            // by the time anyone asks — which is why ShellLog exists and why it names
            // kiosk changes as one of the things it holds. The benign "degraded to
            // SOFT" path below was already recorded; the outright failure, the one
            // worth a call-out, was the one that vanished.
            ShellLog.of(activity)?.record(
                "kiosk",
                "failed to apply $mode: ${t.javaClass.simpleName}: ${t.message}",
            )
        }
    }

    /** HARD requested but not Device Owner: the best we can do is SOFT. */
    private fun applyDegraded() {
        Log.w(TAG, "HARD kiosk requested but app is not Device Owner — degrading to SOFT")
        ShellLog.of(activity)?.record(
            "kiosk",
            "hard lock requested but not Device Owner — degraded to escapable pinning",
        )
        applySoft()
    }

    private fun applyHard() {
        dpm.setLockTaskPackages(admin, arrayOf(activity.packageName))
        dpm.setStatusBarDisabled(admin, true)
        // Become the persistent HOME so the box always returns to us. Clear first:
        // addPersistentPreferredActivity ACCUMULATES, and applyHard is re-run on every
        // reconnect/settings push — without the clear the preferred-activity list would
        // grow unboundedly and HOME resolution would become nondeterministic.
        dpm.clearPackagePersistentPreferredActivities(admin, activity.packageName)
        val homeFilter = IntentFilter(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            addCategory(Intent.CATEGORY_DEFAULT)
        }
        dpm.addPersistentPreferredActivity(
            admin,
            homeFilter,
            ComponentName(activity, KioskActivity::class.java),
        )
        if (!isInLockTask()) activity.startLockTask()
        // Checked on the Device Owner path too: this is where the lock is supposed to
        // be un-escapable, so a silent refusal here is the most important one to hear
        // about — it is the difference between a provisioned box and a promise.
        verifyLockTaskEngaged()
    }

    private fun applySoft() {
        if (isDeviceOwner()) {
            // Clear the DO allowlist so startLockTask enters escapable pinning, drop
            // the un-escapable HARD features, AND drop any HARD-mode HOME override —
            // otherwise HOME still traps back to us and SOFT would not be escapable.
            dpm.setLockTaskPackages(admin, emptyArray())
            dpm.setStatusBarDisabled(admin, false)
            dpm.clearPackagePersistentPreferredActivities(admin, activity.packageName)
        }
        // Without a DO allowlist this is OS screen-pinning: the user can exit via
        // Back+Recents. Keep-screen-on + immersive are handled by the Activity.
        if (!isInLockTask()) activity.startLockTask()
        verifyLockTaskEngaged()
    }

    /**
     * Says so when the lock did not actually take.
     *
     * `startLockTask()` does not throw when the system simply declines it — screen
     * pinning can be switched off device-wide, and some TV builds ignore it outright.
     * Measured on an Android 14 TV: the request returned cleanly, the service menu
     * went on claiming the screen was locked, and `mLockTaskModeState` stayed NONE,
     * so HOME walked straight out to the launcher. Nothing anywhere said otherwise.
     * The player still comes back — the supervisor reclaims it within about ten
     * seconds — but "locked" and "returns shortly" are different promises, and an
     * operator deciding whether a site needs a Device Owner box has to be able to
     * tell them apart.
     */
    private fun verifyLockTaskEngaged() {
        if (isInLockTask()) return
        Log.w(TAG, "lock task did not engage; the screen can still be left")
        ShellLog.of(activity)?.record(
            "kiosk",
            "lock requested but screen pinning did not engage — the player can be left, " +
                "and is put back by the supervisor instead",
        )
    }

    private fun applyOff() {
        if (isInLockTask()) activity.stopLockTask()
        if (isDeviceOwner()) {
            dpm.setStatusBarDisabled(admin, false)
            dpm.clearPackagePersistentPreferredActivities(admin, activity.packageName)
        }
    }

    fun isDeviceOwner(): Boolean = dpm.isDeviceOwnerApp(activity.packageName)

    private fun isInLockTask(): Boolean =
        activityManager.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE

    companion object {
        private const val TAG = "KioskController"

        fun parse(mode: String): Mode = when (mode.lowercase()) {
            "hard" -> Mode.HARD
            "soft" -> Mode.SOFT
            else -> Mode.OFF
        }
    }
}
