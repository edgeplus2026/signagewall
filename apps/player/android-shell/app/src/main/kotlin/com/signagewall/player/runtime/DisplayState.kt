package com.signagewall.player.runtime

import android.content.Context
import android.os.PowerManager
import android.util.Log
import com.signagewall.player.kiosk.KioskPresence

/**
 * Whether the panel is actually showing anything.
 *
 * Read at tick time rather than watched through a `DisplayManager.DisplayListener`:
 * both callers already run a timer (the recovery ladder every 15 s, the supervisor
 * every 10 s), so a listener would add a registration lifecycle — and a leak, and an
 * ordering question about which fires first after a process restart — to answer a
 * question a single call answers exactly.
 *
 * This exists because a screen switched off at the wall is not idle from the app's
 * point of view, it is CUT OFF. Android's Low Power Standby blocks the app's network
 * outright while the device sleeps (measured on an Android 14 TV: the uid's
 * `blocked_state` reads `effective=LOW_POWER_STANDBY`), so the player cannot reach
 * its page, its update channel or the backend — while `adb shell`, being a different
 * uid, keeps working and makes it look like the app is at fault. Everything the
 * shell does on a timer therefore fails for as long as the panel is off, and before
 * this the ladders kept climbing anyway: a recovery escalation every few minutes and
 * a launch attempt that reached "attempt 10, rung 3" on a display that could not
 * show the result either way.
 *
 * Note this is deliberately NOT `Activity.onPause`. That fires when the panel goes
 * dark AND when anything else comes to the front — the system installer dialog, the
 * launcher after a stray BACK — and standing down for the second case is precisely
 * when the watchdog must instead fight to get the player back.
 */
object DisplayState {

    private const val TAG = "DisplayState"

    /**
     * Whether this screen is showing something to somebody.
     *
     * Two independent reasons to say yes, and only one of them is the power state.
     * `isInteractive` is plain AOSP and honest on the hardware it was measured on,
     * but the shell has to run on whatever a customer already owns — a cheap TV, a
     * stick, a box driven entirely over HDMI — and a device that mis-reports itself
     * as non-interactive while happily playing content would otherwise have its page
     * recovery and its update checks switched off permanently, which is far worse
     * than the churn this whole mechanism exists to stop.
     *
     * So a resumed player counts as serving on its own. Android pauses the top
     * activity when the panel really does sleep, so this cannot mask a genuine
     * standby; all it does is make the odd device fall back to exactly the behaviour
     * it had before any of this existed. Every unreadable state resolves the same
     * way, for the same reason: a screen wrongly judged dark is a screen whose
     * recovery never runs, and nobody finds out until a wall has been dead all day.
     */
    fun isServing(context: Context): Boolean =
        isInteractive(context) || KioskPresence.isResumed()

    private fun isInteractive(context: Context): Boolean =
        try {
            val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            power.isInteractive
        } catch (t: Throwable) {
            Log.w(TAG, "could not read display state; assuming on", t)
            true
        }
}
