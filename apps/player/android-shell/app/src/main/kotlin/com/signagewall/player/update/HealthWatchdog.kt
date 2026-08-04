package com.signagewall.player.update

import android.os.Handler
import android.os.SystemClock
import com.signagewall.player.runtime.RuntimeStateStore
import android.os.Looper
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Post-update health gate — the analogue of the Tauri shell's `spawn_health_watchdog`
 * (HEALTH_TIMEOUT 90s, MAX_OFFLINE_DEFERS 3). Created once per process in
 * [com.signagewall.player.PlayerApp] and armed BEFORE the WebView loads, so
 * a freshly-installed build that never even loads the page is still caught.
 *
 * It is the SINGLE owner of the `alive`/`healthy` flags and of the promote/poison
 * writes to `state.json` (the updater's own writes are install-time only and never
 * overlap), which removes the two-writer race. All state transitions are marshaled
 * onto the main looper, so `reportAlive`/`reportHealthy` (which arrive on a WebView
 * binder thread) and the timeout can't interleave.
 *
 * Two-phase, mirroring updater.rs:
 *  - `report_alive` (web JS booted) sets `alive`; `report_healthy` (reached a real
 *    working state) promotes the running version to last-known-good and cancels the
 *    timer.
 *  - On timeout with a still-pending version: if it went **alive but never healthy**,
 *    the build is bad → poison + roll back. If it was **never alive**, the device is
 *    almost certainly OFFLINE (the remote page never loaded), so DEFER rather than
 *    roll back a possibly-good update — bounded by [maxOfflineDefers] so a genuinely
 *    broken build that also can't go alive is still caught eventually.
 */
class HealthWatchdog(
    private val stateStore: UpdaterStateStore,
    private val currentVersionName: String,
    private val currentVersionCode: Int,
    private val timeoutMillis: Long = 90_000L,
    private val maxOfflineDefers: Int = 3,
    /** Where the boot marker lives. Absent in tests, which then treat every arm as
     *  a fresh boot — the old behaviour, and the safe one for a unit test. */
    private val runtimeStore: RuntimeStateStore? = null,
    private val onRollback: (UpdaterState) -> Unit = {},
) {
    private val handler = Handler(Looper.getMainLooper())
    private val alive = AtomicBoolean(false)
    private val healthy = AtomicBoolean(false)
    private var armed = false

    /** Call once at process start. Reconciles a stale pending, then arms only if this
     *  is genuinely a post-update boot. */
    fun armIfPostUpdate() {
        val current = stateStore.read()
        val reconciled = UpdateDecisions.reconcile(current, currentVersionName)
        if (reconciled != current) stateStore.write(reconciled)
        if (!UpdateDecisions.isPostUpdateBoot(reconciled, currentVersionName)) return
        // Count the attempt HERE, not in onTimeout. A build that dies at 800ms never
        // reaches the timer, so state.json stayed byte-identical on every boot: the
        // gate re-armed forever, the CMS read "installing" forever, and a build that
        // crashes on startup could crash-loop indefinitely without ever being judged.
        //
        // But count BOOTS, not process starts. The shell now restarts its own process
        // deliberately in several places — the launch ladder's last rung, the page
        // recovery ladder, the restart after an overlay grant — and counting those
        // would poison a perfectly good build within minutes of a device that simply
        // cannot foreground itself. Only a real reboot is a fresh chance to judge.
        if (isNewBoot()) {
            stateStore.write(
                reconciled.copy(postUpdateAttempts = reconciled.postUpdateAttempts + 1),
            )
        }
        armed = true
        handler.postDelayed({ onTimeout() }, timeoutMillis)
    }

    /** The web JS booted (remote page loaded). Any thread; the flag is atomic. */
    fun reportAlive() {
        alive.set(true)
    }

    /** The web reached a real working state. Marshaled to the main looper. */
    /**
     * The page says this build works.
     *
     * Accepted even after the window has closed. `onTimeout` clears `armed` before
     * either branch, so a late report used to return at the guard and a provably
     * working build stayed permanently mid-flight — which happens on any device
     * whose network takes longer than the window to come up, i.e. the ones most
     * likely to have been offline for the deferral in the first place.
     */
    fun reportHealthy() {
        handler.post { onHealthy() }
    }

    private fun onHealthy() {
        healthy.set(true)
        // Deliberately NOT gated on `armed`. onTimeout clears it before either
        // branch, so a report that arrives even a second late used to be dropped —
        // and a build stuck mid-flight is one the fleet reports as "installing"
        // forever. The devices that report late are exactly the ones whose network
        // was slow to come up, i.e. the ones the offline deferral exists for.
        armed = false
        handler.removeCallbacksAndMessages(null)
        val state = stateStore.read()
        if (UpdateDecisions.isPostUpdateBoot(state, currentVersionName)) {
            stateStore.write(UpdateDecisions.promote(state, currentVersionCode))
        }
    }

    /**
     * Whether this process start follows a device reboot rather than one of the
     * shell's own restarts. Derived from the device's boot time — wall clock minus
     * uptime — which changes only when the device actually boots, and is stable
     * across process restarts within one boot. Rounded because the two clocks drift
     * against each other by a few milliseconds.
     */
    private fun isNewBoot(): Boolean {
        val current = bootId()
        val seen = runtimeStore?.read()?.bootId ?: return true
        if (seen == current) {
            return false
        }
        runtimeStore?.update { it.copy(bootId = current) }
        return true
    }

    private fun bootId(): Long =
        (System.currentTimeMillis() - SystemClock.elapsedRealtime()) / BOOT_ID_GRANULARITY

    private fun onTimeout() {
        if (!armed) return
        armed = false
        if (healthy.get()) return
        val state = stateStore.read()
        if (!UpdateDecisions.isPostUpdateBoot(state, currentVersionName)) return

        if (alive.get()) {
            // Alive but never healthy → the build actually broke the app. Kill it.
            rollBack(state)
        } else if (state.postUpdateAttempts >= maxOfflineDefers) {
            // Never alive, and out of patience: either genuinely broken, or a device
            // that has been offline for so many boots that we can no longer tell.
            rollBack(state)
        }
        // Otherwise: never alive → almost certainly offline (the remote page never
        // loaded). Leave `pendingVersion` set so the next boot re-arms and tries
        // again; the attempt was already counted when we armed.
    }

    private fun rollBack(state: UpdaterState) {
        val poisoned = UpdateDecisions
            .poison(state, currentVersionCode)
            .copy(lastResult = "unhealthy", rolledBack = true, pendingVersion = null)
        stateStore.write(poisoned)
        onRollback(poisoned)
    }

    private companion object {
        /** Wall clock and uptime drift against each other by a few milliseconds, so
         *  the derived boot time is rounded to seconds before being compared. */
        const val BOOT_ID_GRANULARITY = 1_000L
    }
}
