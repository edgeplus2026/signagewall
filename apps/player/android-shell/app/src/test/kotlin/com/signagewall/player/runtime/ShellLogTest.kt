package com.signagewall.player.runtime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.file.Files

/**
 * The log's job is to still be there, and still be bounded, on a device nobody
 * visits for months. Both halves are tested: that entries survive, and that a
 * chatty screen cannot grow the file without limit.
 */
class ShellLogTest {

    private fun tempLog(): Pair<ShellLog, File> {
        val dir = Files.createTempDirectory("signagewall-log").toFile()
        val file = File(dir, "shell.log")
        return ShellLog(file) to file
    }

    @Test
    fun `records entries oldest first`() {
        val (log, _) = tempLog()
        log.record("boot", "process started")
        log.record("update", "installed successfully")

        val lines = log.tail()
        assertEquals(2, lines.size)
        assertTrue(lines[0].contains("boot process started"))
        assertTrue(lines[1].contains("update installed successfully"))
    }

    @Test
    fun `tail returns only the most recent entries`() {
        val (log, _) = tempLog()
        repeat(10) { log.record("t", "entry $it") }

        val lines = log.tail(3)
        assertEquals(3, lines.size)
        assertTrue(lines.last().contains("entry 9"))
    }

    @Test
    fun `reading a log that was never written is empty, not an error`() {
        val (log, _) = tempLog()
        assertEquals(emptyList<String>(), log.tail())
    }

    @Test
    fun `stays bounded, keeping the newest entries`() {
        val (log, file) = tempLog()
        // Comfortably past the cap, so the trim has to run more than once.
        val filler = "x".repeat(500)
        repeat(1200) { log.record("t", "$it $filler") }

        assertTrue(
            "log grew to ${file.length()} bytes, past its ${ShellLog.MAX_BYTES} cap",
            file.length() <= ShellLog.MAX_BYTES,
        )
        // Trimming must drop the OLD end. A log that discarded what just happened
        // would be worse than none: it would look complete and answer nothing.
        assertTrue(log.tail(1).first().contains("1199"))
    }

    @Test
    fun `an unwritable path degrades to no log rather than throwing`() {
        // The supervisor's diary must never be the reason the supervised process
        // dies, so a bad location is swallowed on both read and write.
        val log = ShellLog(File("/proc/definitely-not-writable/shell.log"))
        log.record("boot", "process started")
        assertEquals(emptyList<String>(), log.tail())
    }
}
