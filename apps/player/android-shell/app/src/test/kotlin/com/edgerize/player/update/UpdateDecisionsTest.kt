package com.edgerize.player.update

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UpdateDecisionsTest {

    @Test
    fun `isPostUpdateBoot true only when pending matches running`() {
        assertTrue(
            UpdateDecisions.isPostUpdateBoot(UpdaterState(pendingVersion = "0.2.0"), "0.2.0"),
        )
        assertFalse(
            UpdateDecisions.isPostUpdateBoot(UpdaterState(pendingVersion = "0.2.0"), "0.1.0"),
        )
        assertFalse(UpdateDecisions.isPostUpdateBoot(UpdaterState(), "0.2.0"))
    }

    @Test
    fun `reconcile clears a stale pending into error`() {
        val stale = UpdaterState(pendingVersion = "0.9.0", lastResult = "installing")
        val out = UpdateDecisions.reconcile(stale, "0.1.0")
        assertNull(out.pendingVersion)
        assertEquals("error", out.lastResult)
    }

    @Test
    fun `reconcile leaves a matching pending untouched`() {
        val ok = UpdaterState(pendingVersion = "0.2.0", lastResult = "installing")
        assertEquals(ok, UpdateDecisions.reconcile(ok, "0.2.0"))
    }

    @Test
    fun `promote records last-good and clears pending`() {
        val out = UpdateDecisions.promote(
            UpdaterState(pendingVersion = "0.2.0", lastResult = "installing"),
            200,
        )
        assertEquals(200, out.lastGoodVersionCode)
        assertNull(out.pendingVersion)
        assertEquals("up-to-date", out.lastResult)
        assertEquals(0, out.postUpdateAttempts)
    }

    @Test
    fun `poison is idempotent and only affects the poisoned code`() {
        val once = UpdateDecisions.poison(UpdaterState(), 200)
        val twice = UpdateDecisions.poison(once, 200)
        assertEquals(listOf(200), twice.poisonedVersions)
        assertTrue(UpdateDecisions.isPoisoned(twice, 200))
        assertFalse(UpdateDecisions.isPoisoned(twice, 201))
    }
}
