package com.signagewall.player.update

import android.content.Context
import android.os.StatFs
import android.util.Log
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
 * The Android-channel self-updater.
 *
 * It used to be driven entirely by the web page and to have no memory of its own
 * failures, which made it a channel that reported success while being incapable of
 * delivering anything:
 *
 *  - `refresh()` had exactly one caller, `init`. A screen that runs for four months
 *    answered "up-to-date" from a four-month-old cache several hundred times, and if
 *    that single fetch failed the cache stayed null and the device was permanently
 *    un-updatable while reporting green.
 *  - A failed install wrote nothing at all, so `isInstallable` — which asked only
 *    "is the version newer" — kept saying yes. The same doomed APK was downloaded
 *    and re-attempted every six hours, forever.
 *  - "Cannot reach the manifest" and "there is nothing newer" were the same answer,
 *    so a fleet-wide bucket misconfiguration was invisible.
 *
 * Now: the shell schedules the work (see WatchdogService), every outcome is durable,
 * and an unreachable channel is a distinct, loud state. The one thing this cannot fix
 * is the install prompt — off Device Owner Android insists a human confirms the first
 * install, so an unattended screen deliberately does NOT attempt one; it reports
 * `needs-operator` and waits for a technician to trigger it from the service bar.
 */
/** A download refused for lack of room — an environmental condition, not a verdict
 *  on the build, so it must not count against the version's retry budget. */
class InsufficientSpace(message: String) : Exception(message)

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
    private val now: () -> Long = { System.currentTimeMillis() },
) : Updater {

    private val io = Executors.newSingleThreadExecutor()
    private val running = AtomicBoolean(false)

    @Volatile
    private var cached: UpdateManifest? = null

    /**
     * Reads the manifest if the cached copy is older than [MANIFEST_TTL_MILLIS].
     * Called from the supervisor's schedule, not from the page — the page is the
     * thing most likely to be broken on a device that needs updating.
     */
    fun refreshIfStale() {
        val state = stateStore.read()
        if (cached != null && now() - state.lastFetchAt < MANIFEST_TTL_MILLIS) {
            return
        }
        refresh()
    }

    /**
     * Reads the channel and, if there is something installable that can go in
     * WITHOUT a human, installs it.
     *
     * The apply half is the point. An earlier version had the supervisor refresh the
     * manifest and stop there, leaving every apply trigger in the web layer — so a
     * screen whose page could not load still had no way to receive the fix for
     * whatever was stopping it from loading, which is the exact scenario the whole
     * rework exists for. `canInstallSilently()` keeps this from ever throwing a
     * system dialog onto an unattended wall.
     */
    fun refreshAndMaybeApply() {
        refreshIfStale()
        io.execute {
            val state = stateStore.read()
            val m = cached ?: return@execute
            if (!isInstallable(m, state) || !installer.canInstallSilently()) {
                return@execute
            }
            if (!running.compareAndSet(false, true)) {
                return@execute
            }
            try {
                downloadAndInstall(m)
            } finally {
                running.set(false)
            }
        }
    }

    /** Kicks a background manifest fetch and records the outcome, either way. */
    fun refresh() {
        io.execute {
            try {
                val manifest = fetchManifest()
                cached = manifest
                stateStore.write(
                    stateStore.read().copy(lastFetchAt = now(), lastFetchError = null),
                )
            } catch (t: Throwable) {
                // Recorded rather than swallowed: a channel nobody can reach is a
                // fleet-level fault, and it used to look identical to a healthy one.
                Log.w(TAG, "manifest fetch failed", t)
                stateStore.write(
                    stateStore.read().copy(
                        lastFetchError = "${t.javaClass.simpleName}: ${t.message}"
                            .take(MAX_ERROR_CHARS),
                    ),
                )
            }
        }
    }

    override fun cachedCheck(): JsonElement {
        val state = stateStore.read()
        val m = cached
        val available = m != null && isInstallable(m, state)
        return buildJsonObject {
            put("available", available)
            put("currentVersion", currentVersionName)
            if (available && m != null) put("availableVersion", m.versionName)
            // Loud on purpose. A screen that has not seen the channel for days is a
            // problem to act on, not a screen that is up to date.
            if (isChannelStale(state)) {
                put("channel", "unreachable")
                put("lastFetchAt", state.lastFetchAt)
                state.lastFetchError?.let { put("lastFetchError", it) }
            }
        }
    }

    override fun runUpdate(): JsonElement = runUpdate(operatorPresent = false)

    /**
     * [operatorPresent] is what makes it safe to attempt an install that Android will
     * ask a human to confirm. Scheduled updates never set it: a system dialog on an
     * unattended shop wall is worse than being a version behind, and nobody is there
     * to answer it anyway.
     */
    fun runUpdate(operatorPresent: Boolean): JsonElement {
        val state = stateStore.read()
        val m = cached
        if (m == null || !isInstallable(m, state, operatorPresent)) {
            // "I could not reach the channel" is not "there is nothing newer", and
            // conflating them is how a broken channel stayed invisible.
            return buildJsonObject {
                put("kind", if (m == null && isChannelStale(state)) "unreachable" else "up-to-date")
                state.lastFetchError?.let { put("error", it) }
            }
        }
        if (!operatorPresent && !installer.canInstallSilently()) {
            return buildJsonObject {
                put("kind", "needs-operator")
                put("version", m.versionName)
            }
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
            put("lastFetchAt", s.lastFetchAt)
            s.lastFetchError?.let { put("lastFetchError", it) }
            if (isChannelStale(s)) put("channelUnreachable", true)
            if (!installer.canInstallSilently()) put("needsOperatorToInstall", true)
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

    /** No successful read for long enough that somebody should be told. */
    private fun isChannelStale(state: UpdaterState): Boolean =
        state.lastFetchAt == 0L || now() - state.lastFetchAt > CHANNEL_STALE_MILLIS

    private fun isInstallable(
        m: UpdateManifest,
        state: UpdaterState,
        operatorPresent: Boolean = false,
    ): Boolean {
        if (m.versionCode <= currentVersionCode) return false
        if (UpdateDecisions.isPoisoned(state, m.versionCode)) return false

        // A technician standing at the screen is not the unattended retry loop the
        // backoff exists to stop. Applying it to them made `needs-operator` a dead
        // end: the device would not install by itself, and after a few automatic
        // attempts it also stopped OFFERING the update to the one person who could.
        // The poison and downgrade guards above still apply — those are about the
        // build being bad, not about how often we have tried.
        if (operatorPresent) return true

        // A version that has repeatedly failed to INSTALL can never be poisoned by the
        // health gate, because the health gate only ever judges versions that ran. So
        // this is the only thing standing between a bad APK and an endless
        // download-fail-retry loop on every screen in the fleet.
        val failures = state.failuresFor(m.versionCode)
        if (failures >= MAX_INSTALL_FAILURES) return false
        if (failures > 0) {
            val wait = INSTALL_BACKOFF_MILLIS.getOrElse(failures - 1) { WEEK_MILLIS }
            if (now() - state.lastInstallAttemptAt < wait) return false
        }
        return true
    }

    private fun downloadAndInstall(m: UpdateManifest) {
        // Downloads land in the cache directory, not in filesDir: filesDir also holds
        // device.json and the updater's own state, and filling it with a 700MB partial
        // download would take the device's identity with it. The OS may also reclaim
        // cacheDir under pressure, which for a re-downloadable APK is exactly right.
        val dir = File(context.cacheDir, "updates").apply { mkdirs() }
        val apk = File(dir, "signagewall-player-${m.versionCode}.apk")
        val part = File(dir, "${apk.name}.part")
        try {
            // A previous run may already have fetched and verified this exact APK —
            // typically the run that was told to wait for an operator. Re-downloading
            // it costs the customer's bandwidth for nothing.
            if (!(apk.exists() && sha256Hex(apk).equals(m.sha256, ignoreCase = true))) {
                requireFreeSpace(dir, m.size)
                download(m.url, part)
                require(sha256Hex(part).equals(m.sha256, ignoreCase = true)) {
                    "APK sha256 mismatch"
                }
                // Only now is it a complete, verified APK. Downloading straight to
                // the real name would leave an interrupted transfer behind for a
                // later run to find, trust and try to install.
                apk.delete()
                if (!part.renameTo(apk)) {
                    apk.writeBytes(part.readBytes())
                    part.delete()
                }
            }
            stateStore.write(
                stateStore.read().copy(
                    pendingVersion = m.versionName,
                    lastResult = "installing",
                    postUpdateAttempts = 0,
                    lastInstallAttemptAt = now(),
                ),
            )
            installer.install(apk, m.versionCode)
        } catch (t: Throwable) {
            Log.w(TAG, "update to ${m.versionName} failed", t)
            part.delete()
            apk.delete()
            // A full disk says nothing about the build. Counting it against the
            // version would abandon a perfectly good update because the device was
            // temporarily out of room, and the device would then never take it even
            // after somebody cleared space.
            val environmental = t is InsufficientSpace
            stateStore.write(
                stateStore.read()
                    .copy(pendingVersion = null, lastResult = "error")
                    .let { if (environmental) it else it.withFailure(m.versionCode, now()) },
            )
        }
    }

    /**
     * Refuses to start a download that cannot finish. Without this a nearly-full
     * device wrote until the filesystem gave out, which on the old code path meant
     * writing into the same directory as the device identity.
     */
    private fun requireFreeSpace(dir: File, needed: Long?) {
        val required = (needed ?: DEFAULT_APK_SIZE_GUESS) * SPACE_HEADROOM
        val free = StatFs(dir.absolutePath).availableBytes
        if (free <= required) {
            throw InsufficientSpace("not enough free space: $free < $required")
        }
    }

    /** Keep only the running version's cached APK (the previous one stays for rollback). */
    private fun pruneOldApks() {
        val keep = "signagewall-player-$currentVersionCode.apk"
        listOf(File(context.cacheDir, "updates"), File(context.filesDir, "updates"))
            .forEach { dir ->
                dir.listFiles()
                    ?.filter { it.name.startsWith("signagewall-player-") && it.name != keep }
                    ?.forEach { it.delete() }
            }
    }

    private fun fetchManifest(): UpdateManifest =
        json.decodeFromString(UpdateManifest.serializer(), httpGet(manifestUrl))

    private fun httpGet(url: String): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = CONNECT_TIMEOUT
        conn.readTimeout = READ_TIMEOUT
        try {
            conn.requestMethod = "GET"
            if (conn.responseCode !in 200..299) {
                throw IllegalStateException("manifest HTTP ${conn.responseCode}")
            }
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
            if (conn.responseCode !in 200..299) {
                throw IllegalStateException("APK HTTP ${conn.responseCode}")
            }
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
        const val TAG = "OtaUpdater"
        const val CONNECT_TIMEOUT = 15_000
        const val READ_TIMEOUT = 15_000
        const val DOWNLOAD_TIMEOUT = 60_000
        const val MAX_ERROR_CHARS = 200

        /** How long a cached manifest is trusted before it is read again. */
        const val MANIFEST_TTL_MILLIS = 60 * 60 * 1000L

        /** No successful read for this long is reported as a fault, not as silence. */
        const val CHANNEL_STALE_MILLIS = 48 * 60 * 60 * 1000L

        /** Attempts at one version before it is abandoned entirely. */
        const val MAX_INSTALL_FAILURES = 3
        val INSTALL_BACKOFF_MILLIS = listOf(6 * 60 * 60 * 1000L, 24 * 60 * 60 * 1000L)
        const val WEEK_MILLIS = 7 * 24 * 60 * 60 * 1000L

        /**
         * Used only when the manifest omits a size, which the publisher normally
         * supplies. The real APK is around a megabyte; the first guess here was 50MB
         * with a 3x headroom, so a device with 140MB free — an ordinary state for a
         * cheap signage box — refused every update forever, and each refusal counted
         * as a failed attempt until the version was abandoned entirely.
         */
        const val DEFAULT_APK_SIZE_GUESS = 8L * 1024 * 1024
        const val SPACE_HEADROOM = 2
    }
}
