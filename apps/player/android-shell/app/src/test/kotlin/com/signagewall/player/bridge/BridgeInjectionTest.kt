package com.signagewall.player.bridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The origin rule decides who receives the bridge nonce. Getting it wrong in the
 * permissive direction hands the native shell to every page an app embeds, so the
 * parsing is worth pinning.
 */
class BridgeInjectionTest {

    @Test
    fun `derives an origin with an explicit port`() {
        assertEquals(
            "http://10.0.2.2:5174",
            BridgeInjection.originRule("http://10.0.2.2:5174"),
        )
    }

    @Test
    fun `derives an origin without a port and ignores the path`() {
        assertEquals(
            "https://player.signagewall.com",
            BridgeInjection.originRule("https://player.signagewall.com/?device=abc"),
        )
    }

    @Test
    fun `an unparseable url yields no rule, never a wildcard`() {
        assertNull(BridgeInjection.originRule("not a url"))
        assertNull(BridgeInjection.originRule(""))
    }

    @Test
    fun `same origin is recognised across paths and queries`() {
        val configured = "https://player.signagewall.com"
        assertTrue(
            BridgeInjection.isPlayerOrigin(
                "https://player.signagewall.com/?device=abc",
                configured,
            ),
        )
    }

    @Test
    fun `a different host, scheme or the offline page is not the player origin`() {
        val configured = "https://player.signagewall.com"
        assertFalse(BridgeInjection.isPlayerOrigin("https://evil.example/", configured))
        assertFalse(
            BridgeInjection.isPlayerOrigin("http://player.signagewall.com/", configured),
        )
        assertFalse(
            BridgeInjection.isPlayerOrigin("file:///android_asset/offline.html", configured),
        )
        assertFalse(BridgeInjection.isPlayerOrigin(null, configured))
    }

    @Test
    fun `the injected script carries the nonce as a quoted literal`() {
        val script = BridgeInjection.script("abc\"123")
        // Escaped, so a nonce can never terminate the string and inject code.
        assertTrue(script.contains("""var k = "abc\"123";"""))
        assertTrue(script.contains("host.invoke(k, cmd, argsJson)"))
        assertTrue(script.contains("host.setKioskLock(k, mode)"))
    }
}
