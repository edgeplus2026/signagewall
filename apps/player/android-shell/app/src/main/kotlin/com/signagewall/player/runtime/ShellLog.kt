package com.signagewall.player.runtime

import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * A small rolling log of the things a screen does when nobody is watching.
 *
 * logcat cannot serve this. On the Android TV measured here the vendor's video
 * driver writes a line per decoded frame, which rolls the ring buffer past our own
 * entries within the hour — so a fault at three in the morning leaves no trace by
 * the time anyone asks. This file is ours, it survives reboots, and it holds only
 * events worth waking someone for: recoveries, updates, crashes, kiosk changes.
 *
 * Bounded by rewriting rather than rotating. At [MAX_BYTES] the oldest half is
 * dropped and the rest written back, so the file has one name, one reader, and a
 * predictable ceiling on a device where storage is the scarce resource. Halving
 * (rather than trimming one line at a time) means that costs one rewrite per few
 * hundred entries instead of one per entry.
 *
 * Every method swallows its own failures. A supervisor's diary must never be the
 * reason the supervised process dies — a full disk or a revoked permission has to
 * degrade to "no log", never to a crash.
 */
class ShellLog(private val file: File) {

    private val stamp = SimpleDateFormat("MM-dd HH:mm:ss", Locale.US)

    /**
     * Appends one entry, and mirrors it to logcat so a developer with a cable sees
     * the same story as the file. Synchronized because the recovery ladder, the
     * updater and the bridge all write from different threads.
     */
    @Synchronized
    fun record(tag: String, message: String) {
        Log.i(TAG, "$tag: $message")
        try {
            file.parentFile?.mkdirs()
            file.appendText("${stamp.format(Date())} $tag $message\n")
            if (file.length() > MAX_BYTES) {
                trim()
            }
        } catch (t: Throwable) {
            Log.w(TAG, "could not write shell log", t)
        }
    }

    /** The most recent [limit] entries, oldest first. Empty when there is no log. */
    @Synchronized
    fun tail(limit: Int = DEFAULT_TAIL): List<String> =
        try {
            if (!file.exists()) emptyList() else file.readLines().takeLast(limit)
        } catch (t: Throwable) {
            Log.w(TAG, "could not read shell log", t)
            emptyList()
        }

    /** Drops the oldest half. See the class note for why halves and not lines. */
    private fun trim() {
        val lines = file.readLines()
        file.writeText(lines.drop(lines.size / 2).joinToString("\n", postfix = "\n"))
    }

    companion object {
        private const val TAG = "ShellLog"

        /**
         * The process-wide log, for the classes that hold a Context but not the
         * Application. Returns null rather than throwing where there is none (a
         * unit test, a receiver in an odd process), so a call site can record
         * unconditionally without guarding — recording is never important enough
         * to be worth a crash.
         */
        @JvmStatic
        fun of(context: android.content.Context): ShellLog? =
            (context.applicationContext as? com.signagewall.player.PlayerApp)
                ?.takeIf { it.logReady }
                ?.shellLog

        /**
         * 256 KB — a few thousand entries, which on a screen that logs only real
         * events is weeks of history. Small enough that it can never be the thing
         * that fills a 4 GB signage box.
         */
        const val MAX_BYTES = 256 * 1024L

        /** Entries returned when a caller does not ask for a specific count. */
        const val DEFAULT_TAIL = 200
    }
}
