package rs.futureforward.edge.player.kiosk

import android.os.Handler
import android.os.Looper
import android.view.KeyEvent

/**
 * The native escape hatch: hold **VOLUME_UP + VOLUME_DOWN together for 5s** to break
 * out of the kiosk. It lives ABOVE the WebView (fed from `Activity.dispatchKeyEvent`)
 * so it works even when the remote page is broken or offline — the exact failure a
 * web-only unlock could not survive. The combo is obscure enough that content / a
 * D-pad remote can't synthesize it, yet an on-site operator can reproduce it. The
 * trigger only OPENS the PIN gate (in the Activity); it does not unlock by itself.
 */
class EscapeHatch(
    private val holdMillis: Long = 5_000L,
    private val onTriggered: () -> Unit,
) {
    private var volUpDown = false
    private var volDownDown = false
    private var armed = false
    private val handler = Handler(Looper.getMainLooper())
    private val fire = Runnable {
        armed = false
        onTriggered()
    }

    /**
     * Feed every key event here from `Activity.dispatchKeyEvent`. Returns true when
     * the event is a volume key (consumed so single presses never leak to content or
     * change system volume on a kiosk — volume is CMS-controlled).
     *
     * The timer is armed ONLY on the transition into both-keys-down — NOT re-armed on
     * every event — because a held hardware key emits repeated ACTION_DOWN (~50ms
     * cadence); re-posting on each would reset the countdown forever and the hatch
     * would never fire.
     */
    fun onKeyEvent(event: KeyEvent): Boolean {
        val isDown = event.action == KeyEvent.ACTION_DOWN
        when (event.keyCode) {
            KeyEvent.KEYCODE_VOLUME_UP -> volUpDown = isDown
            KeyEvent.KEYCODE_VOLUME_DOWN -> volDownDown = isDown
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
}
