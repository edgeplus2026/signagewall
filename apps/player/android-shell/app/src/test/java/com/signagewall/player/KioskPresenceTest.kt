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

    @Test
    fun `already on screen never relaunches`() {
        KioskPresence.setMode(KioskController.Mode.HARD)
        KioskPresence.setResumed(true)
        assertFalse(KioskPresence.shouldReclaimForeground())
    }
}
