package com.edgerize.player.bridge

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * The JSON envelope every `AndroidBridge.invoke` returns, mirroring the Tauri
 * command Result: `{"ok":true,"value":…}` for Ok, `{"ok":false,"error":…}` for Err.
 * The web transport (`native/host.ts`) unwraps `value` on ok and rejects on `!ok`,
 * so this is what preserves the Tauri "resolve vs reject" semantics on Android —
 * in particular keeping `get_device_id`'s unreadable(reject) vs absent(value:null)
 * distinction intact.
 */
object BridgeEnvelope {
    fun ok(value: JsonElement): String =
        buildJsonObject {
            put("ok", true)
            put("value", value)
        }.toString()

    fun error(message: String): String =
        buildJsonObject {
            put("ok", false)
            put("error", message)
        }.toString()
}
