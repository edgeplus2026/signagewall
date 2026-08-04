package com.signagewall.player.kiosk

import android.view.KeyEvent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The BACK-tap route into the offline escape. It exists because the volume-hold
 * route is
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

/**
 * Whether the app is entitled to the hardware volume keys.
 *
 * It used to take them unconditionally, in every mode, and put nothing in their
 * place — the shell never touches AudioManager, and the CMS volume command sets the
 * media element's volume in the web layer. So on an UNLOCKED player, on somebody's
 * own television, the app silently disabled the volume buttons for nothing. The
 * escape combo needs BOTH keys down, so single presses were never load-bearing.
 */
class EscapeHatchVolumeKeysTest {

    /** Records rather than schedules, so the hold timer needs no Looper. */
    private class FakeScheduler : EscapeHatch.Scheduler {
        var pending: Runnable? = null
        override fun post(action: Runnable, delayMillis: Long) {
            pending = action
        }

        override fun cancel(action: Runnable) {
            pending = null
        }
    }

    @Test
    fun `an unlocked screen leaves single volume presses to the TV`() {
        val hatch = EscapeHatch(isLocked = { false }, onTriggered = {})

        // One key at a time, released in between — which is what pressing volume on
        // a remote actually looks like, and what the app was swallowing for nothing.
        assertFalse(hatch.onKey(KeyEvent.KEYCODE_VOLUME_UP, isDown = true, repeatCount = 0))
        assertFalse(hatch.onKey(KeyEvent.KEYCODE_VOLUME_UP, isDown = false, repeatCount = 0))
        assertFalse(hatch.onKey(KeyEvent.KEYCODE_VOLUME_DOWN, isDown = true, repeatCount = 0))
        assertFalse(hatch.onKey(KeyEvent.KEYCODE_VOLUME_DOWN, isDown = false, repeatCount = 0))
    }

    /** A locked signage screen is not somewhere anyone should be adjusting volume. */
    @Test
    fun `a locked screen still swallows them`() {
        val hatch = EscapeHatch(isLocked = { true }, onTriggered = {})
        assertTrue(hatch.onKey(KeyEvent.KEYCODE_VOLUME_UP, isDown = true, repeatCount = 0))
    }

    /** And the combo itself must keep working on an unlocked screen: it is the
     *  offline escape, and "unlocked" is exactly when someone is trying to use it. */
    @Test
    fun `the combo is still claimed while both keys are held, unlocked`() {
        val hatch = EscapeHatch(
            isLocked = { false },
            scheduler = FakeScheduler(),
            onTriggered = {},
        )
        hatch.onKey(KeyEvent.KEYCODE_VOLUME_UP, isDown = true, repeatCount = 0)
        assertTrue(hatch.onKey(KeyEvent.KEYCODE_VOLUME_DOWN, isDown = true, repeatCount = 0))
    }

    /** And it still FIRES — the route had no test at all before, because the real
     *  hold timer needs a Looper that unit tests do not have. */
    @Test
    fun `holding both keys arms the escape and firing it triggers`() {
        var fired = false
        val clock = FakeScheduler()
        val hatch = EscapeHatch(
            isLocked = { true },
            scheduler = clock,
            onTriggered = { fired = true },
        )
        hatch.onKey(KeyEvent.KEYCODE_VOLUME_UP, isDown = true, repeatCount = 0)
        hatch.onKey(KeyEvent.KEYCODE_VOLUME_DOWN, isDown = true, repeatCount = 0)
        assertNotNull(clock.pending)

        clock.pending?.run()
        assertTrue(fired)
    }

    /** Letting go before the hold elapses must cancel it, or a stray double-tap
     *  would unlock the screen. */
    @Test
    fun `releasing a key disarms the hold`() {
        val clock = FakeScheduler()
        val hatch = EscapeHatch(
            isLocked = { true },
            scheduler = clock,
            onTriggered = {},
        )
        hatch.onKey(KeyEvent.KEYCODE_VOLUME_UP, isDown = true, repeatCount = 0)
        hatch.onKey(KeyEvent.KEYCODE_VOLUME_DOWN, isDown = true, repeatCount = 0)
        hatch.onKey(KeyEvent.KEYCODE_VOLUME_DOWN, isDown = false, repeatCount = 0)
        assertNull(clock.pending)
    }
}
