package com.signagewall.player.runtime

import android.os.SystemClock
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference

/**
 * What the shell knows about whether the page is actually working.
 *
 * Before this, the shell's entire notion of health was `Activity.isResumed()`. A
 * white page, a Chromium error page, a frozen last frame and a playlist stuck on the
 * same advert for three months were all indistinguishable from a healthy screen —
 * and every one of them is a real, ordinary outcome on an unattended display.
 *
 * The page has been beating every five seconds all along (`src/native/liveness.ts`),
 * specifically so a frozen WebView could be detected. The bridge had no case for the
 * command, so every beat was answered with `unknown command: report_liveness` and
 * thrown away — roughly seventeen thousand discarded heartbeats per device per day.
 * This is where they land now.
 *
 * Two facts, and the second is the one that matters:
 *
 *  - [lastBeatAt] — the page's event loop is running at all. Catches a frozen or
 *    crashed renderer.
 *  - [lastAdvanceAt] — content actually CHANGED. Catches the far more common and
 *    far more embarrassing failure where the player is alive, painting, connected,
 *    and showing one frame forever.
 */
object PlayerLiveness {

    private val lastBeatAt = AtomicLong(0L)
    private val lastAdvanceAt = AtomicLong(0L)
    private val currentItem = AtomicReference<String?>(null)

    /** Whether the page says its playlist has more than one item. A one-item screen
     *  is legitimately static forever, so the stuck-content rule must not apply. */
    private val multiItem = AtomicBoolean(false)

    /** Injectable because SystemClock is a framework stub in unit tests, and the
     *  recovery ladder's whole correctness is a question about time. */
    @Volatile
    private var clock: () -> Long = { SystemClock.elapsedRealtime() }

    /**
     * Records a beat. [itemId] is whatever the page currently has on screen; a
     * change in it is what proves the playlist is moving. A null id (pairing screen,
     * standby, nothing to play) counts as an advance, because those are legitimate
     * idle states and must not be mistaken for a stuck playlist.
     */
    fun beat(itemId: String?, multiItemPlaylist: Boolean = false) {
        multiItem.set(multiItemPlaylist)
        val now = clock()
        lastBeatAt.set(now)
        if (itemId != currentItem.get()) {
            currentItem.set(itemId)
            lastAdvanceAt.set(now)
        } else if (itemId == null) {
            lastAdvanceAt.set(now)
        }
    }

    /** Raw mark of the last beat on the monotonic clock, 0 when there never was
     *  one. Callers that must know whether a beat arrived AFTER something they did
     *  need the mark, not an age — see PageRecovery. */
    fun lastBeatMark(): Long = lastBeatAt.get()

    /** Milliseconds since the last beat, or [Long.MAX_VALUE] if there never was one. */
    fun sinceBeat(): Long = since(lastBeatAt.get())

    /** Milliseconds since content last changed, or [Long.MAX_VALUE] if it never has. */
    fun sinceAdvance(): Long = since(lastAdvanceAt.get())

    fun currentItemId(): String? = currentItem.get()

    /** True only when a change in content would actually be expected. */
    fun contentShouldAdvance(): Boolean = multiItem.get()

    /**
     * Called when the shell deliberately replaces the page — a reload, a WebView
     * recreate, a fresh Activity — so no stale item id survives into the new one.
     *
     * It clears the marks to UNKNOWN rather than to "now", which is the opposite of
     * what it used to do and the difference between a working recovery ladder and a
     * decorative one. Stamping a fresh beat here meant the shell manufactured the
     * very evidence it was about to check for: the next poll saw a recent "beat",
     * declared the page healthy, and reset the ladder to rung zero — so nothing
     * above the first rung could ever run. The grace period a recovering page needs
     * belongs to the thing that acted (PageRecovery's own action mark), not to a
     * heartbeat the page never sent.
     */
    fun reset() {
        lastBeatAt.set(0L)
        lastAdvanceAt.set(0L)
        currentItem.set(null)
    }

    private fun since(mark: Long): Long =
        if (mark == 0L) Long.MAX_VALUE else clock() - mark

    /** Test seam: a deterministic clock in place of the framework stub. */
    fun setClockForTests(next: () -> Long) {
        clock = next
    }

    /** Test seam. */
    fun resetForTests() {
        clock = { SystemClock.elapsedRealtime() }
        multiItem.set(false)
        lastBeatAt.set(0L)
        lastAdvanceAt.set(0L)
        currentItem.set(null)
    }
}
