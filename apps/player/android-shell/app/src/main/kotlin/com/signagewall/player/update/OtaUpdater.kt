package com.signagewall.player.update

import android.content.Context
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import com.signagewall.player.util.json
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * The real Android-channel self-updater. Fetches the manifest, and on `run_update`
 * downloads the APK, verifies its sha256, records a pending version, and installs it
 * (silent on Device Owner, prompted otherwise). Health-gate + rollback CONCEPTS are
 * ported from the Tauri updater: `report_healthy` on a post-update boot promotes the
 * running version to last-known-good; the [HealthWatchdog] poisons + rolls back a
 * version that never reports healthy.
 *
 * Android rollback caveat: a `versionCode` downgrade is blocked except for a Device
 * Owner with a downgrade-flagged session — so a silent rollback only works on DO
 * boxes; off DO a bad version degrades to a flagged `unhealthy` state. NEEDS
 * ON-DEVICE VERIFICATION (README).
 */
class OtaUpdater(
    private val context: Context,
    private val currentVersionName: String,
    private val currentVersionCode: Int,
    private val manifestUrl: String,
    // The process-wide health gate owns alive/healthy + promote/poison (single writer
    // of those state fields), armed at process start in PlayerApp.
    private val health: HealthWatchdog,
    private val stateStore: UpdaterStateStore =
        UpdaterStateStore(File(context.filesDir, "updates/state.json")),
    private val installer: InstallerStrategy = InstallerStrategy(context),
) : Updater {

    private val io = Executors.newSingleThreadExecutor()
    private val running = AtomicBoolean(false)

    @Volatile
    private var cached: UpdateManifest? = null

    init {
        refresh()
    }

    /** Kick a background manifest fetch; the result feeds [cachedCheck]. */
    fun refresh() {
        io.execute { runCatching { cached = fetchManifest() } }
    }

    override fun cachedCheck(): JsonElement {
        val m = cached
        val available = m != null && isInstallable(m)
        return buildJsonObject {
            put("available", available)
            put("currentVersion", currentVersionName)
            if (available && m != null) put("availableVersion", m.versionName)
        }
    }

    override fun runUpdate(): JsonElement {
        val m = cached
        if (m == null || !isInstallable(m)) {
            return buildJsonObject { put("kind", "up-to-date") }
        }
        if (!running.compareAndSet(false, true)) {
            return buildJsonObject { put("kind", "busy") }
        }
        io.execute {
            try {
                downloadAndInstall(m)
            } finally {
                running.set(false)
            }
        }
        return buildJsonObject {
            put("kind", "updating")
            put("version", m.versionName)
        }
    }

    override fun stateReport(): JsonElement {
        val s = stateStore.read()
        return buildJsonObject {
            s.pendingVersion?.let { put("pendingVersion", it) }
            s.lastResult?.let { put("lastResult", it) }
            s.rolledBack?.let { put("rolledBack", it) }
            put("currentVersion", currentVersionName)
        }
    }

    override fun reportAlive() = health.reportAlive()

    override fun reportHealthy() {
        // The health gate does the promote/poison; prune only runs on this (healthy)
        // path, so the previous APK stays available as a rollback target while an
        // update is still being health-gated / offline-deferred.
        health.reportHealthy()
        pruneOldApks()
    }

    private fun isInstallable(m: UpdateManifest): Boolean =
        m.versionCode > currentVersionCode &&
            !UpdateDecisions.isPoisoned(stateStore.read(), m.versionCode)

    private fun downloadAndInstall(m: UpdateManifest) {
        val dir = File(context.filesDir, "updates").apply { mkdirs() }
        val apk = File(dir, "signagewall-player-${m.versionCode}.apk")
        try {
            download(m.url, apk)
            require(sha256Hex(apk).equals(m.sha256, ignoreCase = true)) {
                "APK sha256 mismatch"
            }
            stateStore.write(
                stateStore.read().copy(
                    pendingVersion = m.versionName,
                    lastResult = "installing",
                    postUpdateAttempts = 0,
                ),
            )
            installer.install(apk) // silent (DO) or prompted; relaunches on success
        } catch (t: Throwable) {
            apk.delete()
            stateStore.write(
                stateStore.read().copy(pendingVersion = null, lastResult = "error"),
            )
        }
    }

    /** Keep only the running version's cached APK (the previous one stays for rollback). */
    private fun pruneOldApks() {
        val dir = File(context.filesDir, "updates")
        val keep = "signagewall-player-$currentVersionCode.apk"
        dir.listFiles()
            ?.filter { it.name.startsWith("signagewall-player-") && it.name != keep }
            ?.forEach { it.delete() }
    }

    private fun fetchManifest(): UpdateManifest =
        json.decodeFromString(UpdateManifest.serializer(), httpGet(manifestUrl))

    private fun httpGet(url: String): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = CONNECT_TIMEOUT
        conn.readTimeout = READ_TIMEOUT
        try {
            conn.requestMethod = "GET"
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }

    private fun download(url: String, into: File) {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = CONNECT_TIMEOUT
        conn.readTimeout = DOWNLOAD_TIMEOUT
        try {
            conn.inputStream.use { input ->
                into.outputStream().use { output -> input.copyTo(output) }
            }
        } finally {
            conn.disconnect()
        }
    }

    private fun sha256Hex(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buf = ByteArray(8192)
            while (true) {
                val n = input.read(buf)
                if (n < 0) break
                digest.update(buf, 0, n)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it.toInt() and 0xFF) }
    }

    private companion object {
        const val CONNECT_TIMEOUT = 15_000
        const val READ_TIMEOUT = 15_000
        const val DOWNLOAD_TIMEOUT = 60_000
    }
}
