package com.signagewall.player.bridge

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Test
import com.signagewall.player.identity.DeviceIdStore
import com.signagewall.player.update.NoopUpdater
import java.io.File
import java.nio.file.Files

/**
 * Verifies the commands produce the exact JSON `value` shapes the web `native/`
 * layer depends on — the same shapes as the Tauri Rust commands, except for the
 * Android-only ones. (Do not write that path with a star: Kotlin nests block
 * comments, so a `/*` inside KDoc swallows the closing `*/` and the file stops
 * parsing.)
 */
class BridgeDispatcherTest {
    private val uuid = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"

    private fun dispatcher(): BridgeDispatcher {
        val dir = Files.createTempDirectory("signagewall").toFile()
        return BridgeDispatcher(
            shellVersion = "0.1.0",
            deviceIdStore = DeviceIdStore(File(dir, "device.json")),
            updater = NoopUpdater("0.1.0"),
        )
    }

    @Test
    fun `shell_version returns the version string`() {
        assertEquals(JsonPrimitive("0.1.0"), dispatcher().dispatch("shell_version", "{}"))
    }

    @Test
    fun `get_device_id is JSON null when absent, then round-trips set_device_id`() {
        val d = dispatcher()
        assertEquals(JsonNull, d.dispatch("get_device_id", "{}"))
        assertEquals(JsonNull, d.dispatch("set_device_id", """{"id":"$uuid"}"""))
        assertEquals(JsonPrimitive(uuid), d.dispatch("get_device_id", "{}"))
    }

    @Test
    fun `check_update reports the up-to-date shape`() {
        val v = dispatcher().dispatch("check_update", "{}").jsonObject
        assertEquals(false, v["available"]!!.jsonPrimitive.booleanOrNull)
        assertEquals("0.1.0", v["currentVersion"]!!.jsonPrimitive.content)
    }

    @Test
    fun `run_update returns the up-to-date kind`() {
        val v = dispatcher().dispatch("run_update", "{}").jsonObject
        assertEquals("up-to-date", v["kind"]!!.jsonPrimitive.content)
    }

    @Test
    fun `report_alive and report_healthy return JSON null`() {
        val d = dispatcher()
        assertEquals(JsonNull, d.dispatch("report_alive", "{}"))
        assertEquals(JsonNull, d.dispatch("report_healthy", "{}"))
    }

    @Test
    fun `free_disk returns the shell's reading`() {
        val dir = Files.createTempDirectory("signagewall").toFile()
        val d = BridgeDispatcher(
            shellVersion = "0.1.0",
            deviceIdStore = DeviceIdStore(File(dir, "device.json")),
            updater = NoopUpdater("0.1.0"),
            freeDiskBytes = { 1_234L },
        )
        assertEquals(JsonPrimitive(1_234L), d.dispatch("free_disk", "{}"))
    }

    @Test
    fun `free_disk reports -1 when the device will not say`() {
        // Not zero: the web layer reads -1 as "unknown" and falls back to the
        // browser's quota, where zero would read as "full" and stop caching on a
        // device that is actually fine.
        assertEquals(JsonPrimitive(-1L), dispatcher().dispatch("free_disk", "{}"))
    }

    @Test
    fun `set_web_debugging passes the flag through and defaults to off`() {
        val seen = mutableListOf<Boolean>()
        val dir = Files.createTempDirectory("signagewall").toFile()
        val d = BridgeDispatcher(
            shellVersion = "0.1.0",
            deviceIdStore = DeviceIdStore(File(dir, "device.json")),
            updater = NoopUpdater("0.1.0"),
            onSetWebDebugging = { seen.add(it) },
        )
        assertEquals(JsonNull, d.dispatch("set_web_debugging", """{"enabled":true}"""))
        d.dispatch("set_web_debugging", """{"enabled":"true"}""")
        d.dispatch("set_web_debugging", """{"enabled":false}""")
        // Unreadable args must never read as permission to open the page up.
        d.dispatch("set_web_debugging", "not json")
        d.dispatch("set_web_debugging", "{}")
        assertEquals(listOf(true, true, false, false, false), seen)
    }

    @Test
    fun `read_log returns the shell's entries, and an empty array when there are none`() {
        val dir = Files.createTempDirectory("signagewall").toFile()
        val withLog = BridgeDispatcher(
            shellVersion = "0.1.0",
            deviceIdStore = DeviceIdStore(File(dir, "device.json")),
            updater = NoopUpdater("0.1.0"),
            readLog = { listOf("08-17 01:02:03 boot process started") },
        )
        val lines = withLog.dispatch("read_log", "{}").jsonArray
        assertEquals(1, lines.size)
        assertEquals("08-17 01:02:03 boot process started", lines[0].jsonPrimitive.content)

        // A host that keeps no log answers with an empty array, NOT an error: the
        // menu then hides the row instead of showing a failure the operator
        // cannot act on.
        assertEquals(0, dispatcher().dispatch("read_log", "{}").jsonArray.size)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `unknown command throws`() {
        dispatcher().dispatch("bogus", "{}")
    }

    @Test(expected = IllegalArgumentException::class)
    fun `set_device_id rejects a non-uuid`() {
        dispatcher().dispatch("set_device_id", """{"id":"nope"}""")
    }
}
