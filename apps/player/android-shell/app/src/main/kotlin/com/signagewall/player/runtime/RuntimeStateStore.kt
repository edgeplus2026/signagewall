package com.signagewall.player.runtime

import com.signagewall.player.util.AtomicFile
import com.signagewall.player.util.json
import java.io.File

/**
 * Atomic persistence of [RuntimeState] (`runtime.json`), alongside `device.json`
 * and `updates/state.json`. A missing or corrupt file reads as the default —
 * which is RUNNING — so a damaged state file can never be what keeps a screen
 * dark. Every failure mode here has to fail towards "put the player on screen".
 */
open class RuntimeStateStore(private val file: File) {

    /** This store's slot in the process-wide cache; see the companion. */
    private val cacheKey: String = try {
        file.canonicalPath
    } catch (_: Throwable) {
        file.absolutePath
    }

    private var cached: RuntimeState?
        get() = shared[cacheKey]
        set(value) {
            if (value == null) shared.remove(cacheKey) else shared[cacheKey] = value
        }

    open fun read(): RuntimeState {
        cached?.let { return it }
        val loaded =
            try {
                if (file.exists()) {
                    json.decodeFromString(RuntimeState.serializer(), file.readText())
                } else {
                    RuntimeState()
                }
            } catch (_: Throwable) {
                RuntimeState()
            }
        cached = loaded
        return loaded
    }

    open fun write(state: RuntimeState) {
        // Cached BEFORE the write is attempted, deliberately: on a full or
        // read-only disk the file write fails, and readers must still see what this
        // process decided rather than the stale value for the rest of the boot.
        cached = state
        try {
            AtomicFile.write(
                file,
                json.encodeToString(RuntimeState.serializer(), state)
                    .toByteArray(Charsets.UTF_8),
            )
        } catch (_: Throwable) {
            // A full or read-only disk must not take the player down; the
            // in-memory view in KioskPresence stays authoritative for this boot.
        }
    }

    /**
     * Read-modify-write. Callers never touch the file directly.
     *
     * Synchronized because the callers are on several threads — the bridge writes
     * the deactivate marker, the recovery ladder spends its restart budget, the
     * supervisor records a rung — and two concurrent updates of different fields
     * would otherwise race, with the loser's change silently lost.
     */
    @Synchronized
    fun update(block: (RuntimeState) -> RuntimeState) {
        write(block(read()))
    }

    companion object {
        /**
         * The cached state, keyed by file rather than held per instance.
         *
         * Per-instance caching would have been a bug, and a quiet one. Several
         * places build their own store over the SAME `runtime.json` — the
         * Application, the supervisor's launch ladder, the boot receiver — and each
         * writes a different field through a read-modify-write. With separate
         * caches, one of them recording a recovery would resurrect its stale copy
         * of `desiredState` over what another had just written, and a screen the
         * operator closed would come back, or one that should be running would not.
         * Sharing the cache keeps the invariant the file gave them for free.
         *
         * `ConcurrentHashMap` because the readers are the UI thread, the
         * supervisor's handler, and the WebView's JavaScript thread.
         */
        private val shared = java.util.concurrent.ConcurrentHashMap<String, RuntimeState>()

        /** Test seam: drops the process-wide cache between cases. */
        @JvmStatic
        fun resetCacheForTests() {
            shared.clear()
        }
    }
}
