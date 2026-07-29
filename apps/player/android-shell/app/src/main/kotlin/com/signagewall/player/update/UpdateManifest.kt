package com.edgerize.player.update

import kotlinx.serialization.Serializable

/**
 * The Android update channel manifest (`edge-player/android/latest.json` on R2).
 * Distinct from the desktop Tauri `latest.json` (whose signature is minisign): the
 * Android trust anchor is the **APK signing certificate** (PackageInstaller refuses
 * an update signed by a different key), backed by the `sha256` integrity check here
 * and a `versionCode`-downgrade guard.
 */
@Serializable
data class UpdateManifest(
    val versionName: String,
    val versionCode: Int,
    val url: String,
    val sha256: String,
    val notes: String? = null,
    val pubDate: String? = null,
)
