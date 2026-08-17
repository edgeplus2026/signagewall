package com.signagewall.player.bridge

import com.signagewall.player.identity.DeviceIdStore
import com.signagewall.player.update.NoopUpdater
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import com.signagewall.player.util.json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.file.Files

/**
 * The bridge is injected into every frame the WebView renders, at every origin,
 * and a signage screen renders third-party pages on purpose. These tests pin the
 * one thing standing between an embedded page and the native shell.
 */
class AndroidBridgeTest {
    private val nonce = "s3cr3t-nonce"

    private class Calls {
        var restarts = 0
        var kioskModes = mutableListOf<String>()
        var closes = 0
        var names = mutableListOf<String>()
        var menuStates = mutableListOf<Boolean>()
    }

    private fun bridge(calls: Calls): AndroidBridge {
        val dir = Files.createTempDirectory("signagewall").toFile()
        return AndroidBridge(
            nonce = nonce,
            dispatcher = BridgeDispatcher(
                shellVersion = "0.1.4",
                deviceIdStore = DeviceIdStore(File(dir, "device.json")),
                updater = NoopUpdater("0.1.4"),
            ),
            onRestart = { calls.restarts += 1 },
            onSetKioskLock = { calls.kioskModes.add(it) },
            onScreenName = { calls.names.add(it) },
            onCloseApp = { calls.closes += 1 },
            onServiceMenuOpen = { calls.menuStates.add(it) },
        )
    }

    @Test
    fun `the player origin's nonce reaches the dispatcher`() {
        val raw = bridge(Calls()).invoke(nonce, "shell_version", "{}")
        val envelope = json.parseToJsonElement(raw).jsonObject
        assertTrue(envelope["ok"]?.jsonPrimitive?.booleanOrNull == true)
        assertEquals("0.1.4", envelope["value"]?.jsonPrimitive?.contentOrNull)
    }

    @Test
    fun `a frame without the nonce is refused, not served`() {
        val raw = bridge(Calls()).invoke("guessed", "shell_version", "{}")
        val envelope = json.parseToJsonElement(raw).jsonObject
        assertFalse(envelope["ok"]?.jsonPrimitive?.booleanOrNull == true)
        assertEquals("unauthorized", envelope["error"]?.jsonPrimitive?.contentOrNull)
        assertNull(envelope["value"])
    }

    @Test
    fun `a missing nonce is refused`() {
        val raw = bridge(Calls()).invoke(null, "shell_version", "{}")
        val envelope = json.parseToJsonElement(raw).jsonObject
        assertFalse(envelope["ok"]?.jsonPrimitive?.booleanOrNull == true)
    }

    /**
     * The dangerous half. `invoke` at least answers with an envelope the caller can
     * read; these are fire-and-forget, so a missing guard would be silent — an
     * embedded page unlocking the kiosk and nobody the wiser.
     */
    @Test
    fun `the fire-and-forget methods do nothing without the nonce`() {
        val calls = Calls()
        val bridge = bridge(calls)

        bridge.restart("wrong")
        bridge.setKioskLock("wrong", "off")
        bridge.closeApp("wrong")
        bridge.setScreenName("wrong", "Lobby")
        bridge.setServiceMenuOpen("wrong", true)

        assertEquals(0, calls.restarts)
        assertEquals(0, calls.closes)
        assertTrue(calls.kioskModes.isEmpty())
        assertTrue(calls.names.isEmpty())
        assertTrue(calls.menuStates.isEmpty())
    }

    @Test
    fun `the fire-and-forget methods work with the nonce`() {
        val calls = Calls()
        val bridge = bridge(calls)

        bridge.restart(nonce)
        bridge.setKioskLock(nonce, "hard")
        bridge.closeApp(nonce)
        bridge.setScreenName(nonce, "Lobby")
        bridge.setServiceMenuOpen(nonce, true)

        assertEquals(1, calls.restarts)
        assertEquals(1, calls.closes)
        assertEquals(listOf("hard"), calls.kioskModes)
        assertEquals(listOf("Lobby"), calls.names)
        assertEquals(listOf(true), calls.menuStates)
    }
}
