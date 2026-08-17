package com.signagewall.player.runtime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.file.Files

/**
 * The channel's own logic, tested without a network: whether it will speak at all,
 * and whether it can be made to speak to the wrong place.
 *
 * The HTTP round trip is not covered here — it needs a real backend, and the parts
 * that can be got wrong on their own are the credential rules.
 */
class ShellChannelTest {

    private fun channel(file: File, onCommand: (String) -> Unit = {}): ShellChannel =
        ShellChannel(
            credentialsFile = file,
            shellVersion = "0.1.0",
            readState = { RuntimeState() },
            readFreeDisk = { 1_000L },
            readLog = { emptyList() },
            isPageAlive = { true },
            onCommand = onCommand,
        )

    private fun tempFile(): File =
        File(Files.createTempDirectory("signagewall-channel").toFile(), "channel.json")

    @Test
    fun `stores usable credentials and keeps them across instances`() {
        val file = tempFile()
        channel(file).setCredentials("https://api.example.com/api/v1", "tok")

        assertTrue(file.exists())
        // A fresh instance is what a restarted process gets. The whole point of
        // this channel is that it outlives the page that supplied it.
        val text = file.readText()
        assertTrue(text.contains("https://api.example.com/api/v1"))
        assertTrue(text.contains("tok"))
    }

    @Test
    fun `trims a trailing slash so the built URL never doubles up`() {
        val file = tempFile()
        channel(file).setCredentials("https://api.example.com/api/v1/", "tok")
        assertTrue(file.readText().contains("https://api.example.com/api/v1\""))
    }

    @Test
    fun `refuses a plaintext URL`() {
        // The token travels on this connection. Accepting http would hand it to
        // anyone on the same shop wifi.
        val file = tempFile()
        channel(file).setCredentials("http://api.example.com", "tok")
        assertFalse(file.exists())
    }

    @Test
    fun `refuses an empty token or address`() {
        val file = tempFile()
        channel(file).setCredentials("https://api.example.com", "")
        assertFalse(file.exists())

        channel(file).setCredentials("", "tok")
        assertFalse(file.exists())
    }

    @Test
    fun `polling without credentials does nothing at all`() {
        // A device whose page has never loaded has no channel — and must not
        // crash, block, or invent a destination.
        val ran = mutableListOf<String>()
        channel(tempFile()) { ran.add(it) }.poll()
        assertEquals(emptyList<String>(), ran)
    }

    @Test
    fun `an unreadable credentials file reads as no channel, not a crash`() {
        val file = tempFile()
        file.parentFile?.mkdirs()
        file.writeText("{ this is not json")

        val ran = mutableListOf<String>()
        channel(file) { ran.add(it) }.poll()
        assertEquals(emptyList<String>(), ran)
    }
}
