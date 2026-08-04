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

    open fun read(): RuntimeState =
        try {
            if (file.exists()) {
                json.decodeFromString(RuntimeState.serializer(), file.readText())
            } else {
                RuntimeState()
            }
        } catch (_: Throwable) {
            RuntimeState()
        }

    open fun write(state: RuntimeState) {
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

    /** Read-modify-write. Callers never touch the file directly. */
    fun update(block: (RuntimeState) -> RuntimeState) {
        write(block(read()))
    }
}
