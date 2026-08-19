package com.signagewall.player.webview

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import com.signagewall.player.runtime.PlayerLiveness

/**
 * Gets a broken page working again, and — this is the part that was missing —
 * checks whether it worked.
 *
 * Every recovery in the shell used to be fire-and-forget with a single strategy.
 * `recreateWebView()` rebuilt the WebView and verified nothing; a failed load was
 * simply terminal, because nothing anywhere re-issued `loadUrl` except a render
 * process death. A TV that boots faster than the site's router after a power cut
 * therefore put `net::ERR_NAME_NOT_RESOLVED` on the wall permanently — a first load
 * that fails also leaves no service worker to fall back on.
 *
 * So: rungs, each verified by the page's own heartbeat, each stronger than the last.
 * The verification is the whole design, and getting it wrong once already cost the
 * ladder its top three rungs: an earlier version stamped a synthetic "beat" when it
 * acted, so the next poll read the shell's own optimism as proof the page was fine
 * and reset the ladder. A rung is only cleared by a beat the PAGE produced strictly
 * after the action — see [lastActionAt].
 *
 * The final rung is deliberately not "give up": it shows a bundled offline page so
 * the wall carries our branding and a diagnostic instead of a Chromium error, and
 * keeps retrying the real URL underneath, forever.
 */
class PageRecovery(
    private val actions: Actions,
    /**
     * Whether the process restart rung is still available, and how to spend it.
     * Persisted outside this object because the rung kills the process that holds
     * it — an in-memory flag would be reset by the very act it is meant to limit,
     * which on a device with no network produced a reboot every few minutes forever.
     */
    private val restartBudget: RestartBudget = RestartBudget.None,
    /** How the offline-page retry is scheduled. Injectable because the real one
     *  needs a Looper, and every question this class answers is about time. */
    private val schedule: (Runnable, Long) -> Unit = { action, delay ->
        Handler(Looper.getMainLooper()).postDelayed(action, delay)
    },
    private val clock: () -> Long = { SystemClock.elapsedRealtime() },
) {

    /** Rung whose first completed load has already been logged; -1 = none yet. */
    private var lastLoadLoggedRung = -1

    /** Whether the once-per-boot process restart has been spent. */
    interface RestartBudget {
        fun available(): Boolean
        fun spend()

        /** For tests and for a shell with nowhere to persist it. */
        object None : RestartBudget {
            override fun available(): Boolean = true
            override fun spend() = Unit
        }
    }

    /** What the Activity can do about a broken page, in ascending order of violence. */
    interface Actions {
        fun reloadPage()
        fun recreateWebView()
        fun restartProcess()
        fun showOfflinePage()
        fun isPageLoading(): Boolean
    }

    private var rung = 0

    /**
     * When we last did something about the page — including the very first load,
     * which is why a cold boot gets the same grace as a recovery rather than being
     * escalated on at the first poll.
     */
    private var lastActionAt = 0L



    /** Called when the Activity issues a load, so the first check has a grace window. */
    fun noteLoadStarted() {
        lastActionAt = clock()
    }

    /**
     * Called on a fixed cadence by the Activity. Decides nothing unless the page has
     * failed to prove itself for longer than the current rung's patience.
     */
    fun check() {
        val now = clock()
        val beatMark = PlayerLiveness.lastBeatMark()
        // The page has spoken since we last acted — that, and only that, is health.
        val provedItself = beatMark > lastActionAt && PlayerLiveness.sinceBeat() < BEAT_TIMEOUT_MS
        val stuck =
            PlayerLiveness.contentShouldAdvance() &&
                PlayerLiveness.sinceAdvance() >= STUCK_TIMEOUT_MS

        if (provedItself && !stuck) {
            if (rung != 0) {
                Log.i(TAG, "page healthy again after rung $rung")
                rung = 0
            }
            return
        }

        // Give the last action time to produce a beat before judging it. Without
        // this the ladder would climb to a process restart in one go simply because
        // a reload takes a few seconds.
        if (now - lastActionAt < VERIFY_WINDOW_MS) {
            return
        }
        // A load in flight is not a hang; a slow network on a cold TV is ordinary.
        if (actions.isPageLoading() && PlayerLiveness.sinceBeat() < HARD_TIMEOUT_MS) {
            return
        }

        escalate(
            reason = if (stuck && provedItself) {
                "content has not changed in ${PlayerLiveness.sinceAdvance() / 1000}s"
            } else {
                "no heartbeat since the last recovery attempt"
            },
        )
    }

    private fun escalate(reason: String) {
        val topped = rung >= MAX_RUNG
        rung = minOf(rung + 1, MAX_RUNG)
        lastActionAt = clock()
        // A new rung gets to announce its first completed load again.
        lastLoadLoggedRung = -1
        if (!topped) {
            Log.w(TAG, "page recovery rung $rung: $reason")
        }

        // Clears the stale item id so the new page is judged on its own. It marks
        // the beat as UNKNOWN rather than fresh — see PlayerLiveness.reset.
        PlayerLiveness.reset()

        when (rung) {
            1 -> actions.reloadPage()
            2 -> actions.recreateWebView()
            3 -> if (restartBudget.available()) {
                restartBudget.spend()
                actions.restartProcess()
            } else {
                // Already spent this boot. Skip straight to the terminal rung rather
                // than rebooting on a loop for something a reboot does not fix.
                rung = MAX_RUNG
                actions.showOfflinePage()
                schedule({
                    lastActionAt = clock()
                    actions.reloadPage()
                }, OFFLINE_RETRY_MS)
            }
            else -> {
                // Nothing short of new hardware is going to fix this in the next
                // minute. Show something honest, once, and keep trying the real URL
                // underneath. The rung stays pinned here rather than climbing: for a
                // network outage, restarting the process every few minutes fixes
                // nothing, loses the offline page each time, and burns a post-update
                // health attempt on every cycle.
                if (!topped) {
                    actions.showOfflinePage()
                }
                schedule({
                    lastActionAt = clock()
                    actions.reloadPage()
                }, OFFLINE_RETRY_MS)
            }
        }
    }

    /**
     * The panel came back on after being switched off.
     *
     * Grants the same grace a fresh load gets, and deliberately does NOT touch the
     * rung: standby is not evidence the page recovered, only that it was never given
     * a fair chance to prove otherwise. Without the grace the very first tick after
     * wake escalates a page whose only crime was that the OS had blocked its network
     * for the whole time the screen was dark.
     */
    fun resumeAfterStandby() {
        lastActionAt = clock()
    }

    /**
     * A load completed. Not proof the page WORKS — an HTTP 200 serving a broken
     * bundle finishes loading too — so it deliberately does not clear the rung. Only
     * a heartbeat does that.
     */
    fun onPageLoaded() {
        // Deduped like LaunchLadder's `lastLoggedRung`, because one recovery episode
        // reaches here more than once: `onPageFinished` also fires for the error
        // document Chromium commits under the ORIGINAL url, and an escalation posts
        // a delayed reload that nothing cancels, so an aborted navigation and its
        // replacement both report finished. The duplicates are in the log only —
        // resist "fixing" the source by filtering error pages out of
        // `onPageFinished`, because that callback also clears `pageLoading`, and a
        // `pageLoading` stuck true is read by `check()` as a reason NOT to escalate,
        // which would disable this ladder entirely.
        if (rung != 0 && rung != lastLoadLoggedRung) {
            lastLoadLoggedRung = rung
            Log.i(TAG, "page loaded while recovering at rung $rung; waiting for a beat")
        }
    }

    /**
     * The rung this screen is currently on. Surfaced through `device_info` so the
     * fleet can see a display that is limping — recovering repeatedly is not the
     * same as healthy, and from the outside the two look identical.
     */
    fun currentRung(): Int = rung

    private companion object {
        const val TAG = "PageRecovery"

        /** The page beats every 5s; twelve missed beats is unambiguous. */
        const val BEAT_TIMEOUT_MS = 60_000L

        /** Beating but frozen on one item, on a playlist that has more than one. */
        const val STUCK_TIMEOUT_MS = 15 * 60 * 1000L

        /** Even a load in flight cannot excuse this much silence. */
        const val HARD_TIMEOUT_MS = 180_000L

        /** How long a rung gets to prove itself before the next one fires. */
        const val VERIFY_WINDOW_MS = 90_000L

        /** How often the offline page retries the real URL underneath. */
        const val OFFLINE_RETRY_MS = 60_000L

        /** The ladder stops climbing here and keeps retrying instead of restarting
         *  the process forever. */
        const val MAX_RUNG = 4
    }
}
