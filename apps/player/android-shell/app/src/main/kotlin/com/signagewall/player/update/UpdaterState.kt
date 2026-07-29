package com.signagewall.player.update

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Persisted OTA state for the Android channel — the analogue of the Tauri shell's
 * `UpdaterState` (updater.rs), serialized to `state.json`. Level 1 keeps only the
 * fields the four updater commands read; the full health/rollback machine (poisoned
 * versions, last-good, post-update attempts) is exercised in Level 3.
 */
@Serializable
data class UpdaterState(
    @SerialName("pendingVersion") val pendingVersion: String? = null,
    @SerialName("lastResult") val lastResult: String? = null,
    @SerialName("rolledBack") val rolledBack: Boolean? = null,
    @SerialName("lastGoodVersionCode") val lastGoodVersionCode: Int? = null,
    @SerialName("poisonedVersions") val poisonedVersions: List<Int> = emptyList(),
    @SerialName("postUpdateAttempts") val postUpdateAttempts: Int = 0,
)
