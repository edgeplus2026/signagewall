package rs.futureforward.edge.player.identity

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.file.Files

class DeviceIdStoreTest {
    private val validUuid = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"

    @Test
    fun `accepts a canonical lowercase uuid`() {
        assertTrue(DeviceIdStore.isUuid(validUuid))
    }

    @Test
    fun `rejects uppercase, braces and junk`() {
        assertFalse(DeviceIdStore.isUuid(validUuid.uppercase()))
        assertFalse(DeviceIdStore.isUuid("{$validUuid}"))
        assertFalse(DeviceIdStore.isUuid("not-a-uuid"))
    }

    @Test
    fun `absent with no file, present after write, round-trips`() {
        val dir = Files.createTempDirectory("edge").toFile()
        val store = DeviceIdStore(File(dir, "device.json"))
        assertEquals(DeviceIdStore.ReadResult.Absent, store.read())
        store.write(validUuid)
        assertEquals(DeviceIdStore.ReadResult.Present(validUuid), store.read())
    }

    @Test(expected = IllegalArgumentException::class)
    fun `write rejects a non-uuid`() {
        val dir = Files.createTempDirectory("edge").toFile()
        DeviceIdStore(File(dir, "device.json")).write("garbage")
    }
}
