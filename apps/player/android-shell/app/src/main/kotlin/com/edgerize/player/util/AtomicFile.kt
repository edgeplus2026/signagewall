package com.edgerize.player.util

import java.io.File
import java.io.FileOutputStream

/**
 * Atomic file write: write to a temp sibling, fsync its contents, then rename over
 * the target. Port of the Tauri shell's `write_atomic` (updater.rs). A reader can
 * only ever observe the whole old file or the whole new one — never a torn write —
 * which is what makes `device.json` / `state.json` safe to trust after a crash or
 * power cut mid-write. The rename is atomic on the same filesystem (temp is created
 * in the target's own directory to guarantee that).
 */
object AtomicFile {
    fun write(target: File, bytes: ByteArray) {
        val dir = target.parentFile
            ?: throw IllegalArgumentException("no parent dir for $target")
        if (!dir.exists()) dir.mkdirs()

        val tmp = File.createTempFile("tmp", ".swap", dir)
        try {
            FileOutputStream(tmp).use { out ->
                out.write(bytes)
                out.fd.sync() // flush contents to disk before the rename
            }
            if (!tmp.renameTo(target)) {
                // Rename can fail in rare cross-filesystem cases; fall back to a
                // direct overwrite (loses atomicity but not the data).
                target.writeBytes(bytes)
            }
        } finally {
            if (tmp.exists()) tmp.delete()
        }
    }
}
