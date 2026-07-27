package com.edgerize.player.identity

import com.edgerize.player.util.AtomicFile
import java.io.File

/**
 * Durable device-id persistence. Mirrors the Tauri shell's `get_device_id` /
 * `set_device_id` (lib.rs): a canonical lowercase UUID in an app-private file
 * (`filesDir/device.json`) that survives a WebView `clearData()` AND an app update.
 *
 * The absent-vs-unreadable distinction is LOAD-BEARING: a read error must NOT be
 * reported as "absent", because the web bootstrap only overwrites the store when it
 * is provably empty — a false "absent" would mint a fresh id over the real one and
 * permanently strand a paired screen.
 */
class DeviceIdStore(private val file: File) {

    sealed interface ReadResult {
        data class Present(val id: String) : ReadResult
        data object Absent : ReadResult
        data object Unreadable : ReadResult
    }

    // Cache the DEFINITIVE result (present/absent) so `get_device_id` — called over
    // the synchronous @JavascriptInterface bridge, which blocks the WebView JS thread
    // — never re-touches disk after the first read. A transient `Unreadable` is NOT
    // cached, so a later boot can still recover the real id.
    @Volatile
    private var cached: ReadResult? = null

    /** Present (valid UUID on disk) / Absent (no file) / Unreadable (IO/parse error). */
    fun read(): ReadResult {
        cached?.let { return it }
        val result = readFromDisk()
        if (result is ReadResult.Present || result is ReadResult.Absent) {
            cached = result
        }
        return result
    }

    private fun readFromDisk(): ReadResult {
        if (!file.exists()) return ReadResult.Absent
        return try {
            val id = file.readText().trim()
            if (isUuid(id)) ReadResult.Present(id) else ReadResult.Unreadable
        } catch (_: Throwable) {
            ReadResult.Unreadable
        }
    }

    /** Persists a canonical lowercase UUID atomically. Rejects anything else. */
    fun write(id: String) {
        require(isUuid(id)) { "deviceId must be a UUID" }
        AtomicFile.write(file, id.toByteArray(Charsets.UTF_8))
        cached = ReadResult.Present(id)
    }

    companion object {
        private val UUID_RE =
            Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

        /** Canonical lowercase UUID — the same shape the Rust `is_uuid` accepts. */
        fun isUuid(value: String): Boolean = UUID_RE.matches(value)
    }
}
