package com.signagewall.player.update

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * The updater's memory of its own failures.
 *
 * It had none. A failed install wrote nothing at all, and `isInstallable` asked only
 * "is the version newer" — so the same doomed APK was downloaded and re-attempted
 * every six hours, on every screen, forever. The health gate could not break the loop
 * either: it only ever judges versions that actually RAN, and a version that never
 * installs never runs, so it could never be poisoned.
 */
class UpdaterStateTest {

    @Test
    fun `a version with no history has no failures`() {
        assertEquals(0, UpdaterState().failuresFor(101))
    }

    @Test
    fun `failures accumulate per version, not globally`() {
        val state = UpdaterState()
            .withFailure(101, at = 1_000L)
            .withFailure(101, at = 2_000L)
            .withFailure(102, at = 3_000L)

        assertEquals(2, state.failuresFor(101))
        assertEquals(1, state.failuresFor(102))
        assertEquals(0, state.failuresFor(103))
    }

    /** The backoff needs to know when the last attempt was, not just how many. */
    @Test
    fun `the last attempt time follows the newest failure`() {
        val state = UpdaterState().withFailure(101, at = 1_000L).withFailure(101, at = 9_000L)
        assertEquals(9_000L, state.lastInstallAttemptAt)
    }

    /**
     * The map is keyed by string because JSON object keys are strings; a round-trip
     * through `state.json` must not quietly lose the count and reset the loop-breaker.
     */
    @Test
    fun `failure counts survive a serialization round trip`() {
        val before = UpdaterState().withFailure(101, at = 5_000L).withFailure(101, at = 6_000L)
        val json = com.signagewall.player.util.json
        val after = json.decodeFromString(
            UpdaterState.serializer(),
            json.encodeToString(UpdaterState.serializer(), before),
        )
        assertEquals(2, after.failuresFor(101))
        assertEquals(6_000L, after.lastInstallAttemptAt)
    }

    /**
     * Older devices have a `state.json` written before these fields existed. It must
     * still parse — a state file that fails to decode reads as a fresh default, which
     * would silently forget a poisoned version and re-offer a build known to be bad.
     */
    @Test
    fun `state written by an older build still parses`() {
        val legacy = """{"pendingVersion":"0.1.0","lastResult":"installing","poisonedVersions":[99]}"""
        val state = com.signagewall.player.util.json
            .decodeFromString(UpdaterState.serializer(), legacy)

        assertEquals("0.1.0", state.pendingVersion)
        assertEquals(listOf(99), state.poisonedVersions)
        assertEquals(0L, state.lastFetchAt)
        assertEquals(0, state.failuresFor(101))
    }
}
