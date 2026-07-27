package com.edgerize.player.update

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * The no-op updater: always reports the running version as up to date, never
 * installs. Used in dev (no `UPDATE_MANIFEST_URL`) and as the safe fallback so the
 * web's OTA policy layer always has a valid, resolving bridge.
 */
class NoopUpdater(private val currentVersion: String) : Updater {
    override fun cachedCheck(): JsonElement = buildJsonObject {
        put("available", false)
        put("currentVersion", currentVersion)
    }

    override fun runUpdate(): JsonElement = buildJsonObject {
        put("kind", "up-to-date")
    }

    override fun stateReport(): JsonElement = buildJsonObject {
        put("currentVersion", currentVersion)
    }

    override fun reportAlive() = Unit

    override fun reportHealthy() = Unit
}
