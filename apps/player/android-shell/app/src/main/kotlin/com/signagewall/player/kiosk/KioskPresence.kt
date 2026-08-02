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

    /**
     * Whether the watchdog should pull the player back to the front right now.
     * Only while locked, and only when something else is actually in front.
     */
    fun shouldReclaimForeground(): Boolean =
        mode.get() != KioskController.Mode.OFF && !resumed.get()
}
