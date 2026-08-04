package com.signagewall.player.kiosk

import com.signagewall.player.runtime.RuntimeState
import com.signagewall.player.runtime.RuntimeStateStore
import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * The supervisor's two decisions. Getting either wrong is felt by a real screen: too
 * eager and an unlocked device cannot be left alone, too shy and a display sits on
 * the TV's own menu for months while a foreground notification insists it is running.
 *
 * The split between them is the whole point of the rewrite. "There is no player at
 * all" and "the player is behind something" are different questions with different
 * answers, and the old code asked only the second — which is why every process that
 * came back without its Activity was structurally incapable of starting one.
 */
class KioskPresenceTest {

    /** Advances only when a test says so, so a suppression window is exact rather
     *  than a race with the machine running the suite. */
    private var now = 1_000L

    @Before
    fun reset() {
        KioskPresence.resetForTests()
        now = 1_000L
        KioskPresence.setClockForTests { now }
    }

    // ---- shouldLaunch: is there a player at all ------------------------------

    /**
     * The case the old predicate excluded entirely, and the one that leaves a screen
     * dark until somebody drives out to it: a process revived without its Activity.
     * The kiosk lock is OFF here and it must launch anyway — the lock governs whether
     * people may leave the app, not whether the app should exist.
     */
    @Test
    fun `a process with no activity launches one, even unlocked`() {
        KioskPresence.setActivityAlive(false)
        KioskPresence.setMode(KioskController.Mode.OFF)
        assertTrue(KioskPresence.shouldLaunch())
    }

    @Test
    fun `an existing activity is never launched again`() {
        KioskPresence.setActivityAlive(true)
        assertFalse(KioskPresence.shouldLaunch())
    }

    /** "Close application" on an unlocked screen means it stays closed. */
    @Test
    fun `a player the operator stopped is not relaunched`() {
        KioskPresence.setActivityAlive(false)
        KioskPresence.setDesiredRunning(false)
        assertFalse(KioskPresence.shouldLaunch())
    }

    /** ...and boot puts it back, which BootReceiver does by rewriting the state. */
    @Test
    fun `intent to run is restored when it is set again`() {
        KioskPresence.setActivityAlive(false)
        KioskPresence.setDesiredRunning(false)
        KioskPresence.setDesiredRunning(true)
        assertTrue(KioskPresence.shouldLaunch())
    }

    // ---- shouldReclaimForeground: it exists but is behind something ----------

    @Test
    fun `locked and backgrounded is the case that reclaims`() {
        KioskPresence.setActivityAlive(true)
        KioskPresence.setMode(KioskController.Mode.HARD)
        KioskPresence.setResumed(false)
        assertTrue(KioskPresence.shouldReclaimForeground())
    }

    @Test
    fun `soft lock reclaims too`() {
        KioskPresence.setActivityAlive(true)
        KioskPresence.setMode(KioskController.Mode.SOFT)
        KioskPresence.setResumed(false)
        assertTrue(KioskPresence.shouldReclaimForeground())
    }

    /** An unlocked device must be leaveable — this is the "cannot exit" complaint. */
    @Test
    fun `unlocked and backgrounded stays out of the way`() {
        KioskPresence.setActivityAlive(true)
        KioskPresence.setMode(KioskController.Mode.OFF)
        KioskPresence.setResumed(false)
        assertFalse(KioskPresence.shouldReclaimForeground())
    }

    @Test
    fun `already on screen never reclaims`() {
        KioskPresence.setActivityAlive(true)
        KioskPresence.setMode(KioskController.Mode.HARD)
        KioskPresence.setResumed(true)
        assertFalse(KioskPresence.shouldReclaimForeground())
    }

    /** Reclaim is about a backgrounded Activity; a missing one is [shouldLaunch]'s
     *  job, and answering yes to both would have the supervisor act twice. */
    @Test
    fun `a missing activity is not a reclaim`() {
        KioskPresence.setActivityAlive(false)
        KioskPresence.setMode(KioskController.Mode.HARD)
        KioskPresence.setResumed(false)
        assertFalse(KioskPresence.shouldReclaimForeground())
    }

    // ---- suppression: the shell must not fight its own system screens --------

    /**
     * The overlay-permission grant and the install confirmation are the two flows
     * that repair a screen's ability to heal and to update. Both are system screens
     * the shell itself opens, and without a suppression window the keep-alive drags
     * the player back over them in about four seconds — making both impossible to
     * complete on exactly the devices that need them most.
     */
    @Test
    fun `an open system screen holds off both decisions`() {
        KioskPresence.setActivityAlive(true)
        KioskPresence.setMode(KioskController.Mode.HARD)
        KioskPresence.setResumed(false)
        KioskPresence.suppressReclaim(60_000L)
        assertFalse(KioskPresence.shouldReclaimForeground())

        KioskPresence.setActivityAlive(false)
        assertFalse(KioskPresence.shouldLaunch())
    }

    /** The window has to expire by itself: a technician who wanders off must not
     *  leave the screen unsupervised for the rest of the day. */
    @Test
    fun `suppression expires on its own`() {
        KioskPresence.setActivityAlive(true)
        KioskPresence.setMode(KioskController.Mode.HARD)
        KioskPresence.setResumed(false)
        KioskPresence.suppressReclaim(60_000L)
        assertFalse(KioskPresence.shouldReclaimForeground())
        now += 60_001L
        assertTrue(KioskPresence.shouldReclaimForeground())
    }

    @Test
    fun `clearing suppression resumes supervision at once`() {
        KioskPresence.setActivityAlive(true)
        KioskPresence.setMode(KioskController.Mode.HARD)
        KioskPresence.setResumed(false)
        KioskPresence.suppressReclaim(60_000L)
        KioskPresence.clearSuppression()
        assertTrue(KioskPresence.shouldReclaimForeground())
    }

    // ---- durable state -------------------------------------------------------

    /**
     * The heart of the rewrite: a process that has never loaded the page still knows
     * it is supposed to be running, and at what lock level. Both facts used to
     * default to "do nothing" in every fresh process and were only ever written by a
     * loaded page — so the supervisor could not act on the one case where the page
     * was the thing that was missing.
     */
    @Test
    fun `state seeded from disk arms the supervisor before any page loads`() {
        KioskPresence.attach(
            store = FakeStore(),
            state = RuntimeState(desiredState = RuntimeState.RUNNING, kioskMode = "hard"),
        )
        assertTrue(KioskPresence.isDesiredRunning())
        assertTrue(KioskPresence.shouldLaunch())

        KioskPresence.setActivityAlive(true)
        KioskPresence.setResumed(false)
        assertTrue(KioskPresence.shouldReclaimForeground())
    }

    @Test
    fun `a stopped screen read from disk stays stopped`() {
        KioskPresence.attach(
            store = FakeStore(),
            state = RuntimeState(desiredState = RuntimeState.STOPPED),
        )
        assertFalse(KioskPresence.shouldLaunch())
    }

    /** The flag the watchdog's onTaskRemoved keys off, to delay a deliberate close's
     *  return rather than cancel it. */
    @Test
    fun `the deliberate-close flag round-trips`() {
        assertFalse(KioskPresence.wasClosedByOperator())
        KioskPresence.setClosedByOperator(true)
        assertTrue(KioskPresence.wasClosedByOperator())
        KioskPresence.setClosedByOperator(false)
        assertFalse(KioskPresence.wasClosedByOperator())
    }
}

/** In-memory store — the real one needs a filesystem. */
private class FakeStore : RuntimeStateStore(File("")) {
    private var state = RuntimeState()
    override fun read(): RuntimeState = state
    override fun write(state: RuntimeState) {
        this.state = state
    }
}
