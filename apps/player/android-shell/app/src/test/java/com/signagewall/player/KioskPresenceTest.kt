package com.signagewall.player.kiosk

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * The watchdog's decision to drag the player back to the front. Getting this wrong
 * in either direction is bad in a way the operator feels: too eager and an unlocked
 * device cannot be left alone (which is how a TV read as "hung" before the Back
 * fix), too shy and a locked signage screen sits on the launcher until someone
 * walks over.
 */
class KioskPresenceTest {

    @Before
    fun reset() {
        KioskPresence.setMode(KioskController.Mode.OFF)
        KioskPresence.setResumed(true)
        KioskPresence.setClosedByOperator(false)
    }

    @Test
    fun `locked and backgrounded is the one case that reclaims`() {
        KioskPresence.setMode(KioskController.Mode.HARD)
        KioskPresence.setResumed(false)
        assertTrue(KioskPresence.shouldReclaimForeground())
    }

    @Test
    fun `soft lock reclaims too`() {
        KioskPresence.setMode(KioskController.Mode.SOFT)
        KioskPresence.setResumed(false)
        assertTrue(KioskPresence.shouldReclaimForeground())
    }

    /** An unlocked device must be leaveable — this is the "cannot exit" complaint. */
    @Test
    fun `unlocked and backgrounded stays out of the way`() {
        KioskPresence.setMode(KioskController.Mode.OFF)
        KioskPresence.setResumed(false)
        assertFalse(KioskPresence.shouldReclaimForeground())
    }

    /**
     * A close asked for from the service bar does NOT suppress the keep-alive on a
     * locked screen — self-healing is the whole of what the lock delivers, and the
     * bar takes no PIN, so a permanent close would hand that to whoever holds the
     * remote. What the flag buys is a DELAY (see WatchdogService.onTaskRemoved), so
     * the operator sees the player actually go away instead of it blinking back
     * ~100ms later, which is what made the menu item look broken.
     */
    @Test
    fun `a deliberate close on a locked screen still comes back`() {
        KioskPresence.setMode(KioskController.Mode.HARD)
        KioskPresence.setResumed(false)
        KioskPresence.setClosedByOperator(true)
        assertTrue(KioskPresence.shouldReclaimForeground())
    }

    /** Unlocked means the operator is allowed to leave: the close is final. */
    @Test
    fun `a deliberate close on an unlocked screen stays closed`() {
        KioskPresence.setMode(KioskController.Mode.OFF)
        KioskPresence.setResumed(false)
        KioskPresence.setClosedByOperator(true)
        assertFalse(KioskPresence.shouldReclaimForeground())
    }

    /**
     * The distinction the watchdog's onTaskRemoved keys off: a swipe out of
     * Recents is undone at once, a close from the bar is not. It must not outlive
     * the session that set it — the Activity's onCreate clears it, so a rebooted
     * screen is guarded again.
     */
    @Test
    fun `the deliberate-close flag round-trips`() {
        assertFalse(KioskPresence.wasClosedByOperator())
        KioskPresence.setClosedByOperator(true)
        assertTrue(KioskPresence.wasClosedByOperator())
        KioskPresence.setClosedByOperator(false)
        assertFalse(KioskPresence.wasClosedByOperator())
    }

    @Test
    fun `already on screen never relaunches`() {
        KioskPresence.setMode(KioskController.Mode.HARD)
        KioskPresence.setResumed(true)
        assertFalse(KioskPresence.shouldReclaimForeground())
    }
}
