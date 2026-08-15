package com.signagewall.player.runtime

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * What this device is supposed to be doing, persisted across process death.
 *
 * The shell used to derive its recovery policy from the web page: the keep-alive
 * only armed once a loaded page had pushed a kiosk mode, and the mode lived in
 * process memory. A supervisor whose arming condition is supplied by the thing it
 * supervises is not a supervisor — every way of losing the Activity (power cut,
 * package replace, low-memory kill, native crash, a sticky service restart)
 * produced a foreground service that polled every ten seconds and was structurally
 * incapable of ever launching anything. It logged that it was running while the
 * screen showed the TV's own menu, for as long as it took someone to drive out.
 *
 * So intent-to-run moves to disk, ahead of the page, and defaults to RUNNING. For
 * a signage display "be on screen" is the resting state; not being on screen is
 * the thing that needs a reason.
 */
@Serializable
data class RuntimeState(
    /**
     * RUNNING unless an operator deliberately closed an UNLOCKED player from the
     * service bar. Reset to RUNNING on boot: closing a screen is an instruction
     * for the rest of the day, not for the rest of the device's life, and a
     * display that stayed dark through a power cut because of a tap three weeks
     * ago is indistinguishable from a broken one.
     */
    @SerialName("desiredState") val desiredState: String = RUNNING,
    /** Last kiosk mode set on the device, from the service menu — `off` / `soft` / `hard`. */
    @SerialName("kioskMode") val kioskMode: String = "off",
    /** Rung of the launch ladder currently in use; persisted so an escalation
     *  survives the process restart that is itself one of the rungs. */
    @SerialName("launchRung") val launchRung: Int = 0,
    /**
     * Whether the page-recovery ladder has already spent its process restart during
     * this boot. Persisted because that rung KILLS THE PROCESS, taking any in-memory
     * record of it with it: without this a device with no network restarted itself
     * every few minutes forever, never reaching the offline page it was supposed to
     * settle on, and burning a post-update health attempt on each cycle.
     * Cleared on boot.
     */
    @SerialName("pageRestartUsed") val pageRestartUsed: Boolean = false,

    /**
     * The boot this state was last touched in, as the wall-clock time at which the
     * device booted (now minus uptime, rounded). It is how the post-update health
     * gate tells a genuine reboot from a process restart the shell caused itself —
     * see HealthWatchdog.
     */
    @SerialName("bootId") val bootId: Long = 0L,

    /**
     * Whether the operator has already been asked for notification permission. Asked
     * once per install, on a screen where somebody is presumably standing, and never
     * again — an unattended wall must not sprout a system dialog over the content on
     * every boot. Declaring the permission in the manifest is not enough on Android
     * 13+: without the runtime grant the recovery ladder's full-screen-intent rung is
     * posted, silently dropped, and looks like a working escalation in the log.
     */
    @SerialName("askedForNotifications") val askedForNotifications: Boolean = false,
    /**
     * Set immediately before the process exits for a deactivate, and cleared once
     * the wipe has actually happened. The WebView's own storage can only be
     * deleted safely before any WebView exists in the process, and the delete is
     * asynchronous — so it cannot be done on the way out, only on the way in.
     */
    @SerialName("deactivatePending") val deactivatePending: Boolean = false,
    /** Short breadcrumb from the last uncaught exception, for the CMS. */
    @SerialName("lastCrash") val lastCrash: String? = null,
    @SerialName("lastCrashAt") val lastCrashAt: Long = 0L,
) {
    val isRunning: Boolean get() = desiredState == RUNNING

    companion object {
        const val RUNNING = "running"
        const val STOPPED = "stopped"
    }
}
