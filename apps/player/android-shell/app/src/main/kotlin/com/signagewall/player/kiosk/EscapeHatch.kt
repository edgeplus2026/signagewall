package com.signagewall.player.kiosk

import android.os.Handler
import android.os.Looper
import android.view.KeyEvent

/**
 * The native escape hatch. It lives ABOVE the WebView (fed from
 * `Activity.dispatchKeyEvent`) so it works even when the remote page is broken or
 * offline — the exact failure a web-only unlock could not survive. Triggering only
 * OPENS the PIN gate (in the Activity); it does not unlock by itself.
 *
 * Two ways in, because the fleet has two kinds of input:
 *
 *  - **VOLUME_UP + VOLUME_DOWN held together for 5s** — for hardware with a real
 *    volume rocker (tablets, boxes with buttons).
 *  - **BACK five times within 3s** — for everything driven by a remote.
 *
 * The second exists because the first is *impossible* on an IR/Bluetooth remote:
 * such a remote emits one discrete `DOWN`→`UP` pair per press and cannot hold two
 * keys at once, so `volUpDown && volDownDown` never becomes true. Verified on an
 * Android TV set with `getevent`. Since Android TV boxes are the primary signage
 * target, the hatch was unreachable exactly where it is needed most — an operator
 * standing in front of a wedged kiosk had no way in short of adb or a factory reset.
 *
 * BACK is a safe carrier: the Activity already swallows it while locked, no remote
 * lacks it, and five presses inside three seconds is not something a viewer or the
 * embedded content produces by accident. Content cannot synthesise it either — the
 * events are read above the WebView.
 */
class EscapeHatch(
    private val holdMillis: Long = 5_000L,
    private val tapCount: Int = 5,
    private val tapWindowMillis: Long = 3_000L,
    /** Injectable so the tap sequence is testable without a device clock. */
    private val now: () -> Long = System::currentTimeMillis,
    private val onTriggered: () -> Unit,
) {
    private var volUpDown = false
    private var volDownDown = false
    private var armed = false
    /** Timestamps of the most recent BACK presses, oldest first, capped at [tapCount]. */
    private val backTaps = ArrayDeque<Long>()
    /**
     * Lazy so constructing the hatch touches no Looper. Only the volume-hold route
     * needs a Handler, and keeping it out of field init is what lets the tap route
     * — the one that matters for remotes — be unit-tested off-device.
     */
    private val handler by lazy { Handler(Looper.getMainLooper()) }
    private val fire = Runnable {
        armed = false
        onTriggered()
    }

    /**
     * Feed every key event here from `Activity.dispatchKeyEvent`. Returns true when
     * the event was consumed: volume keys always are (so single presses never leak to
     * content or change system volume on a kiosk — volume is CMS-controlled), BACK
     * never is, so the Activity keeps deciding what BACK means.
     *
     * The hold timer is armed ONLY on the transition into both-keys-down — NOT
     * re-armed on every event — because a held hardware key emits repeated
     * ACTION_DOWN (~50ms cadence); re-posting on each would reset the countdown
     * forever and the hatch would never fire.
     */
    fun onKeyEvent(event: KeyEvent): Boolean =
        onKey(event.keyCode, event.action == KeyEvent.ACTION_DOWN, event.repeatCount)

    /**
     * The decision itself, over plain values. Split from [onKeyEvent] because a
     * `KeyEvent` is an Android framework object that only exists on a device, and
     * this is the one piece of the kiosk that MUST keep working — testing it needs
     * to be possible without an emulator.
     */
    internal fun onKey(keyCode: Int, isDown: Boolean, repeatCount: Int): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_VOLUME_UP -> volUpDown = isDown
            KeyEvent.KEYCODE_VOLUME_DOWN -> volDownDown = isDown
            KeyEvent.KEYCODE_BACK -> {
                // Only real presses count. A held BACK auto-repeats, and counting the
                // repeats would let a single stuck key open the gate.
                if (isDown && repeatCount == 0) registerBackTap()
                return false
            }
            else -> return false
        }
        if (volUpDown && volDownDown) {
            if (!armed) {
                armed = true
                handler.postDelayed(fire, holdMillis)
            }
        } else if (armed) {
            armed = false
            handler.removeCallbacks(fire)
        }
        return true
    }

    private fun registerBackTap() {
        val at = now()
        backTaps.addLast(at)
        while (backTaps.size > tapCount) backTaps.removeFirst()
        if (backTaps.size == tapCount && at - backTaps.first() <= tapWindowMillis) {
            // Clear first: without it the next single press would still see a full
            // window and re-fire, so one extra tap would reopen the gate.
            backTaps.clear()
            onTriggered()
        }
    }
}
