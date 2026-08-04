package com.signagewall.player.update

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Persisted OTA state for the Android channel — the analogue of the Tauri shell's
 * `UpdaterState` (updater.rs), serialized to `state.json`.
 *
 * The later fields exist because the update channel used to have no memory of its own
 * failures. The manifest was fetched once per process and never again, a failed
 * install wrote nothing at all, and `isInstallable` asked only "is the version
 * newer" — so a device could re-download and re-fail the same doomed APK every six
 * hours forever while reporting itself perfectly healthy to the CMS. Nothing here is
 * bookkeeping for its own sake: each field is something the fleet was previously
 * unable to find out.
 */
@Serializable
data class UpdaterState(
    @SerialName("pendingVersion") val pendingVersion: String? = null,
    @SerialName("lastResult") val lastResult: String? = null,
    @SerialName("rolledBack") val rolledBack: Boolean? = null,
    @SerialName("lastGoodVersionCode") val lastGoodVersionCode: Int? = null,
    @SerialName("poisonedVersions") val poisonedVersions: List<Int> = emptyList(),
    @SerialName("postUpdateAttempts") val postUpdateAttempts: Int = 0,

    /**
     * When the manifest was last read successfully (epoch millis, 0 = never). The
     * fleet needs this to tell "this screen is on the newest build" apart from "this
     * screen has not been able to see the update channel since March".
     */
    @SerialName("lastFetchAt") val lastFetchAt: Long = 0L,

    /** Why the last manifest fetch failed, or null when the last one succeeded. */
    @SerialName("lastFetchError") val lastFetchError: String? = null,

    /**
     * Failed install attempts per versionCode. A version that never installs can
     * never be poisoned by the health gate — that gate only judges versions which
     * actually ran — so without this counter there is nothing anywhere to break the
     * retry loop.
     */
    @SerialName("installFailures") val installFailures: Map<String, Int> = emptyMap(),

    /** When an install was last attempted, for the backoff between retries. */
    @SerialName("lastInstallAttemptAt") val lastInstallAttemptAt: Long = 0L,
) {
    fun failuresFor(versionCode: Int): Int = installFailures[versionCode.toString()] ?: 0

    fun withFailure(versionCode: Int, at: Long): UpdaterState = copy(
        installFailures =
            installFailures + (versionCode.toString() to failuresFor(versionCode) + 1),
        lastInstallAttemptAt = at,
    )
}
