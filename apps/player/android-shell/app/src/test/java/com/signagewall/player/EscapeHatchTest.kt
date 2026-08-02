package com.signagewall.player.kiosk

import android.view.KeyEvent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

/**
 * The BACK-tap route into the PIN gate. It exists because the volume-hold route is
 * unreachable on a remote, so the whole point is that it must fire from the kind of
 * events a remote actually sends: discrete presses, never two keys at once.
 *
 * The hold route is not covered here — it needs a real Looper — but the tap route is
 * pure timestamp logic, so the clock is injected.
 */
class EscapeHatchTest {
    private var clock = 0L
    private var fired = 0

    private fun hatch(
        tapCount: Int = 5,
        tapWindowMillis: Long = 3_000L,
    ) = EscapeHatch(
        tapCount = tapCount,
        tapWindowMillis = tapWindowMillis,
        now = { clock },
        onTriggered = { fired++ },
    )

    // Plain values, not KeyEvent: the framework class is a stub off-device, so the
    // tests drive `onKey` — the same decision the adapter feeds from a real event.
    private fun EscapeHatch.back(repeat: Int = 0) =
        onKey(KeyEvent.KEYCODE_BACK, isDown = true, repeatCount = repeat)

    private fun EscapeHatch.backUp() =
        onKey(KeyEvent.KEYCODE_BACK, isDown = false, repeatCount = 0)

    @Test
    fun `five taps inside the window open the gate`() {
        val h = hatch()
        repeat(5) {
            h.back()
            h.backUp()
            clock += 200
        }
        assertEquals(1, fired)
    }

    @Test
    fun `taps spread beyond the window do not fire`() {
        val h = hatch()
        repeat(5) {
            h.back()
            clock += 1_000 // 4s across five presses
        }
        assertEquals(0, fired)
    }

    /** A slow start must not disqualify a burst that follows it — the window slides. */
    @Test
    fun `a burst after idle taps still fires`() {
        val h = hatch()
        h.back()
        clock += 10_000
        repeat(5) {
            h.back()
            clock += 100
        }
        assertEquals(1, fired)
    }

    @Test
    fun `one extra tap after firing does not fire again`() {
        val h = hatch()
        repeat(5) {
            h.back()
            clock += 100
        }
        assertEquals(1, fired)

        h.back()
        assertEquals(1, fired)
    }

    /** A stuck key auto-repeats; counting repeats would open the gate on its own. */
    @Test
    fun `auto-repeat from a held key does not count`() {
        val h = hatch()
        h.back(repeat = 0)
        repeat(10) { h.back(repeat = it + 1) }
        assertEquals(0, fired)
    }

    /** BACK must reach the Activity, which decides whether a kiosk swallows it. */
    @Test
    fun `back is never consumed`() {
        val h = hatch()
        assertFalse(h.back())
        assertFalse(h.backUp())
    }
}
