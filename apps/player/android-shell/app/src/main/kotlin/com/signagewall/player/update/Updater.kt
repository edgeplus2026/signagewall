package com.signagewall.player.update

import kotlinx.serialization.json.JsonElement

/**
 * The updater contract the bridge dispatcher speaks — the four updater commands.
 * Two implementations:
 *  - [NoopUpdater] — always "up to date" (dev builds with no `UPDATE_MANIFEST_URL`,
 *    and the safe fallback).
 *  - [OtaUpdater]  — the real Android-channel self-updater (fetch manifest → verify
 *    sha256 → install via PackageInstaller → health-gate → rollback).
 *
 * All JSON shapes mirror the Tauri Rust commands (updater.rs) 1:1. `runUpdate`
 * returns immediately; any download/install happens on a background thread while
 * the web polls `get_update_state`.
 */
interface Updater {
    fun cachedCheck(): JsonElement
    fun runUpdate(): JsonElement
    fun stateReport(): JsonElement
    fun reportAlive()
    fun reportHealthy()
}
