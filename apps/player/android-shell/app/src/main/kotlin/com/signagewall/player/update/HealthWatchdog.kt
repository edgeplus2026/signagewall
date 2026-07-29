package com.signagewall.player.update

import android.os.Handler
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
        armed = true
        handler.postDelayed({ onTimeout() }, timeoutMillis)
    }

    /** The web JS booted (remote page loaded). Any thread; the flag is atomic. */
    fun reportAlive() {
        alive.set(true)
    }

    /** The web reached a real working state. Marshaled to the main looper. */
    fun reportHealthy() {
        handler.post { onHealthy() }
    }

    private fun onHealthy() {
        healthy.set(true)
        if (!armed) return
        armed = false
        handler.removeCallbacksAndMessages(null)
        val state = stateStore.read()
        if (UpdateDecisions.isPostUpdateBoot(state, currentVersionName)) {
            stateStore.write(UpdateDecisions.promote(state, currentVersionCode))
        }
    }

    private fun onTimeout() {
        if (!armed) return
        armed = false
        if (healthy.get()) return
        val state = stateStore.read()
        if (!UpdateDecisions.isPostUpdateBoot(state, currentVersionName)) return

        if (alive.get()) {
            // Alive but never healthy → the build actually broke the app. Kill it.
            rollBack(state)
        } else {
            // Never alive → almost certainly offline (remote page never loaded).
            // Defer instead of rolling back a possibly-good update; `pendingVersion`
            // stays set so the next boot re-arms and tries again.
            val attempts = state.postUpdateAttempts + 1
            if (attempts >= maxOfflineDefers) {
                rollBack(state) // out of patience — treat as genuinely broken
            } else {
                stateStore.write(state.copy(postUpdateAttempts = attempts))
            }
        }
    }

    private fun rollBack(state: UpdaterState) {
        val poisoned = UpdateDecisions
            .poison(state, currentVersionCode)
            .copy(lastResult = "unhealthy", rolledBack = true, pendingVersion = null)
        stateStore.write(poisoned)
        onRollback(poisoned)
    }
}
