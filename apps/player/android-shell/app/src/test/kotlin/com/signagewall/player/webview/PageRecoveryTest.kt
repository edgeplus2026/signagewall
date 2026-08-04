package com.signagewall.player.webview

import com.signagewall.player.runtime.PlayerLiveness
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

/**
 * The recovery ladder, which is only worth anything if each rung is VERIFIED.
 *
 * The first version of this class was not. It stamped a synthetic heartbeat every
 * time it acted, and its own health check then read that stamp as proof the page had
 * recovered — so the rung was wiped fifteen seconds after every escalation and the
 * ladder was structurally incapable of climbing past its first step. A dead page got
 * `loadUrl` re-issued into the same wedged WebView forever, while the log announced
 * "page healthy again" every ninety seconds. Recreating the WebView, restarting the
 * process and showing the offline page were unreachable code.
 *
 * These tests exist so that cannot happen twice: they drive the clock and the
 * heartbeat directly and assert on which action actually fires.
 */
class PageRecoveryTest {

    private class Recorder : PageRecovery.Actions {
        val calls = mutableListOf<String>()
        var loading = false
        override fun reloadPage() {
            calls += "reload"
        }

        override fun recreateWebView() {
            calls += "recreate"
        }

        override fun restartProcess() {
            calls += "restart"
        }

        override fun showOfflinePage() {
            calls += "offline"
        }

        override fun isPageLoading(): Boolean = loading
    }

    private var now = 10_000L
    private lateinit var actions: Recorder
    private lateinit var recovery: PageRecovery

    @Before
    fun setUp() {
        PlayerLiveness.resetForTests()
        PlayerLiveness.setClockForTests { now }
        actions = Recorder()
        now = 10_000L
        recovery = PageRecovery(actions, schedule = { _, _ -> }, clock = { now })
        recovery.noteLoadStarted()
    }

    /** Fifteen-second polls, like the Activity's. */
    private fun poll(times: Int) {
        repeat(times) {
            now += 15_000L
            recovery.check()
        }
    }

    private fun beat(itemId: String? = "item-1", multiItem: Boolean = true) {
        PlayerLiveness.beat(itemId, multiItem)
    }

    // ---- the bug this class exists for --------------------------------------

    /**
     * A page that never beats must be escalated on, all the way. This is the exact
     * scenario the first version could not do: it wiped the rung after every step.
     */
    @Test
    fun `a page that never beats climbs the whole ladder`() {
        poll(40) // ten minutes of silence
        assertEquals(
            listOf("reload", "recreate", "restart", "offline"),
            actions.calls,
        )
    }

    /** And it stops at the offline page rather than restarting the process forever —
     *  a network outage would otherwise reboot the device every few minutes. */
    @Test
    fun `the ladder stops climbing after the offline page`() {
        poll(80)
        assertEquals(1, actions.calls.count { it == "restart" })
        assertEquals(1, actions.calls.count { it == "offline" })
    }

    /** A beat the PAGE produced after our action is what clears the rung — and then
     *  a later failure starts again from the bottom. */
    @Test
    fun `a real beat resets the ladder`() {
        poll(8) // silent long enough for rung 1
        assertEquals(listOf("reload"), actions.calls)

        now += 1_000L
        beat()
        poll(2)
        assertEquals(listOf("reload"), actions.calls) // healthy: nothing further

        // Silence again → starts from rung 1 rather than resuming where it left off.
        poll(7)
        assertEquals(listOf("reload", "reload"), actions.calls)
    }

    // ---- the false-positive this class also caused ---------------------------

    /**
     * A single-item playlist shows the same renderable forever by design. Treating
     * that as a hang reloaded a perfectly healthy screen every fifteen minutes.
     */
    @Test
    fun `a healthy single-item screen is never touched`() {
        repeat(200) {
            now += 15_000L
            beat(itemId = "the-only-item", multiItem = false)
            recovery.check()
        }
        assertEquals(emptyList<String>(), actions.calls)
    }

    /** But a multi-item playlist frozen on one item IS a hang. */
    @Test
    fun `a multi-item playlist stuck on one item is recovered`() {
        repeat(80) { // twenty minutes, beating but never advancing
            now += 15_000L
            beat(itemId = "stuck-item", multiItem = true)
            recovery.check()
        }
        assertEquals("reload", actions.calls.first())
    }

    // ---- patience ------------------------------------------------------------

    /** A cold boot must not be escalated on at the first poll: the initial load is
     *  an action and gets the same verify window as a recovery. */
    @Test
    fun `a slow first load is given time`() {
        actions.loading = true
        poll(5) // 75s
        assertEquals(emptyList<String>(), actions.calls)
    }

    /** A page beating normally is left alone indefinitely. */
    @Test
    fun `a healthy page is never touched`() {
        repeat(200) {
            now += 15_000L
            beat(itemId = "item-$it", multiItem = true)
            recovery.check()
        }
        assertEquals(emptyList<String>(), actions.calls)
    }
}
