package com.signagewall.player.kiosk

import android.os.SystemClock
import com.signagewall.player.runtime.RuntimeState
import com.signagewall.player.runtime.RuntimeStateStore
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference

/**
 * The supervisor's view of what this display should be doing and what it actually
 * is doing. Shared between the Activity (which knows the "is") and the service
 * (which acts on the gap), and owned by neither: the service outlives the
 * Activity, and the Activity is recreated on configuration changes.
 *
 * Seeded from disk in `PlayerApp.onCreate` — BEFORE any Activity exists — which is
 * the whole point. The previous design initialised the mode to OFF in every fresh
 * process and only ever wrote it when a loaded page called `setKioskLock`, so a
 * process that came back WITHOUT its Activity (a sticky service restart, a
 * low-memory kill, a package replace) could never launch one. It polled every ten
 * seconds forever, showed a "player is running" notification, and did nothing.
 *
 * Two decisions come out of this class, and keeping them apart is the point:
 *
 *  - [shouldLaunch] — there is no Activity at all. This ignores the kiosk lock
 *    entirely. A signage device with no player on screen is never the intended
 *    state, locked or not; the lock governs whether people may leave the app, not
 *    whether the app should exist.
 *  - [shouldReclaimForeground] — the Activity exists but something is in front of
 *    it. That is the lock's business, and only the lock's.
 */
object KioskPresence {

    private val mode = AtomicReference(KioskController.Mode.OFF)
    private val resumed = AtomicBoolean(false)
    private val activityAlive = AtomicBoolean(false)
    private val desiredRunning = AtomicBoolean(true)

    /**
     * Set when the operator closes the player from the service bar, to tell that
     * apart from an accidental exit — a swipe out of Recents, an OEM launcher
     * grabbing focus — which is undone at once. A deliberate close has to be
     * visible: putting the player back ~100ms later reads as a device that refuses
     * to quit. It does not decide whether the close is permanent; that is
     * [desiredRunning], which the lock decides.
     */
    private val closedByOperator = AtomicBoolean(false)

    /**
     * Wall against which reclaim attempts are held off, on `elapsedRealtime` so an
     * NTP step can neither cancel nor extend it. The shell opens system screens
     * itself — the overlay-permission grant, the install confirmation — and
     * without this it drags itself back over them within seconds. Those are
     * precisely the two flows that repair a screen's ability to heal and to
     * update, so the keep-alive was making them impossible to complete.
     */
    private val suppressUntil = AtomicLong(0L)

    /**
     * Monotonic clock, injectable because `SystemClock` is a framework stub in unit
     * tests. Monotonic and not wall-clock on purpose: an NTP step must be unable to
     * either cancel or extend a suppression window.
     */
    @Volatile
    private var clock: () -> Long = { SystemClock.elapsedRealtime() }

    /** Where intent-to-run is persisted. Absent in unit tests, which is fine: every
     *  setter tolerates null and the in-memory view stays authoritative. */
    @Volatile
    private var store: RuntimeStateStore? = null

    /** Called once, from `PlayerApp.onCreate`, before anything else reads this. */
    fun attach(store: RuntimeStateStore, state: RuntimeState) {
        this.store = store
        desiredRunning.set(state.isRunning)
        mode.set(KioskController.parse(state.kioskMode))
    }

    /** Last mode the CMS asked for, as applied by [KioskController]. Persisted so a
     *  reboot re-locks from disk instead of waiting for the page to load. */
    fun setMode(next: KioskController.Mode) {
        mode.set(next)
        store?.update { it.copy(kioskMode = next.name.lowercase()) }
    }

    fun mode(): KioskController.Mode = mode.get()

    /** Driven from the Activity's resume/pause. */
    fun setResumed(next: Boolean) {
        resumed.set(next)
    }

    fun isResumed(): Boolean = resumed.get()

    /** Driven from the Activity's create/destroy — the "is there a player at all"
     *  half of the supervisor's question. */
    fun setActivityAlive(next: Boolean) {
        activityAlive.set(next)
    }

    fun isActivityAlive(): Boolean = activityAlive.get()

    /**
     * Whether this display is supposed to be showing the player. Only "Close
     * application" on an UNLOCKED screen sets it false, and boot resets it to true:
     * closing a screen is an instruction for the rest of the day, not for the life
     * of the device, and a display left dark through a power cut because of a tap
     * three weeks ago is indistinguishable from a broken one.
     */
    fun setDesiredRunning(next: Boolean) {
        desiredRunning.set(next)
        store?.update {
            it.copy(desiredState = if (next) RuntimeState.RUNNING else RuntimeState.STOPPED)
        }
    }

    fun isDesiredRunning(): Boolean = desiredRunning.get()

    fun setClosedByOperator(next: Boolean) {
        closedByOperator.set(next)
    }

    fun wasClosedByOperator(): Boolean = closedByOperator.get()

    /** Holds reclaims off for [millis] — used around system screens we open. */
    fun suppressReclaim(millis: Long) {
        suppressUntil.set(clock() + millis)
    }

    fun clearSuppression() {
        suppressUntil.set(0L)
    }

    private fun suppressed(): Boolean = clock() < suppressUntil.get()

    /**
     * No Activity exists and one is supposed to. Deliberately independent of the
     * kiosk lock: this is the case the old predicate excluded, and it is the case
     * that leaves a screen dark for months.
     */
    fun shouldLaunch(): Boolean =
        desiredRunning.get() && !activityAlive.get() && !suppressed()

    /**
     * The Activity is alive but something else is in front of it. Locked screens
     * are dragged back; unlocked ones are left alone, or an operator could never
     * put the player down.
     */
    fun shouldReclaimForeground(): Boolean =
        desiredRunning.get() &&
            activityAlive.get() &&
            !resumed.get() &&
            mode.get() != KioskController.Mode.OFF &&
            !suppressed()

    /** Test seam: a deterministic clock in place of the framework stub. */
    fun setClockForTests(next: () -> Long) {
        clock = next
    }

    /** Test seam: drops every in-memory bit back to its default. */
    fun resetForTests() {
        clock = { SystemClock.elapsedRealtime() }
        mode.set(KioskController.Mode.OFF)
        resumed.set(false)
        activityAlive.set(false)
        desiredRunning.set(true)
        closedByOperator.set(false)
        suppressUntil.set(0L)
        store = null
    }
}
