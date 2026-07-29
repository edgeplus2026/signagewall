package com.signagewall.player.update

/**
 * Pure OTA state transitions — the Kotlin port of the Tauri shell's decision helpers
 * (`is_post_update_boot` / `reconcile` / `promote` / `poison` in updater.rs). Kept
 * side-effect-free so they are unit-tested exactly like the Rust `#[test]`s, and so
 * the [OtaUpdater] / [HealthWatchdog] just persist their results.
 */
object UpdateDecisions {

    /**
     * True when this boot is running a version we just installed but have not yet
     * confirmed healthy (a `pendingVersion` is recorded and the running name matches
     * it) — the window in which the watchdog must promote-or-rollback.
     */
    fun isPostUpdateBoot(state: UpdaterState, currentVersionName: String): Boolean =
        state.pendingVersion != null && state.pendingVersion == currentVersionName

    /**
     * On boot, clears a stale `pendingVersion` that does NOT match the running
     * version (an install that never actually took effect) into an `error`, so the
     * CMS is never stuck showing a phantom install.
     */
    fun reconcile(state: UpdaterState, currentVersionName: String): UpdaterState =
        if (state.pendingVersion != null && state.pendingVersion != currentVersionName) {
            state.copy(pendingVersion = null, lastResult = "error")
        } else {
            state
        }

    /** Promotes the running version to last-known-good and clears the pending flag. */
    fun promote(state: UpdaterState, currentVersionCode: Int): UpdaterState =
        state.copy(
            lastGoodVersionCode = currentVersionCode,
            pendingVersion = null,
            lastResult = "up-to-date",
            rolledBack = null,
            postUpdateAttempts = 0,
        )

    /** Records a version code that failed its health check so it is never re-installed. */
    fun poison(state: UpdaterState, versionCode: Int): UpdaterState =
        if (isPoisoned(state, versionCode)) {
            state
        } else {
            state.copy(poisonedVersions = state.poisonedVersions + versionCode)
        }

    fun isPoisoned(state: UpdaterState, versionCode: Int): Boolean =
        state.poisonedVersions.contains(versionCode)
}
