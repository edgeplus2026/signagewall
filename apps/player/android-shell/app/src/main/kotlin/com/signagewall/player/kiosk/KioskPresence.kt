package com.signagewall.player.kiosk

import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

/**
 * The two facts the keep-alive watchdog needs, shared between the Activity (which
 * knows them) and the service (which acts on them). Both live in the same process,
 * so this is a plain holder rather than IPC — but it is deliberately NOT owned by
 * either side: the service outlives the Activity (START_STICKY), and the Activity
 * is recreated on configuration changes.
 *
 * The mode matters as much as the presence. Dragging the app back to the front
 * whenever it loses focus is correct for a locked signage screen and *wrong* for an
 * unlocked one — there it is indistinguishable from a device that refuses to quit,
 * which is exactly how it read on a TV before the Back fix.
 */
object KioskPresence {
    private val mode = AtomicReference(KioskController.Mode.OFF)
    private val resumed = AtomicBoolean(false)

    /**
     * Set when the operator closes the player from the service bar, to tell that
     * apart from an ACCIDENTAL exit — a swipe out of Recents, an OEM launcher
     * grabbing focus — which the watchdog undoes instantly. A deliberate close has
     * to actually be visible: putting the player back ~100ms later reads as a
     * device that refuses to quit.
     *
     * It does NOT mean the close is permanent. That is decided by the kiosk lock:
     * a locked screen comes back a few seconds later, because self-healing is the
     * only thing the lock actually promises, and a PIN-less menu anyone can reach
     * would otherwise hand that promise away to whoever holds the remote. An
     * unlocked screen stays shut.
     *
     * Cleared when the Activity next starts, so it can never outlive the session
     * that set it and leave a rebooted screen unguarded.
     */
    private val closedByOperator = AtomicBoolean(false)

    /** Last mode the CMS asked for, as applied by [KioskController]. */
    fun setMode(next: KioskController.Mode) {
        mode.set(next)
    }

    fun mode(): KioskController.Mode = mode.get()

    /** Driven from the Activity's resume/pause. */
    fun setResumed(next: Boolean) {
        resumed.set(next)
    }

    fun isResumed(): Boolean = resumed.get()

    /** Marks (or clears) a deliberate close from the service bar. */
    fun setClosedByOperator(next: Boolean) {
        closedByOperator.set(next)
    }

    fun wasClosedByOperator(): Boolean = closedByOperator.get()

    /**
     * Whether the watchdog should pull the player back to the front right now.
     * Only while locked, and only when something else is actually in front — a
     * deliberate close is handled by onTaskRemoved, which delays the return rather
     * than suppressing it, so the operator sees the app actually go away.
     */
    fun shouldReclaimForeground(): Boolean =
        mode.get() != KioskController.Mode.OFF && !resumed.get()
}
