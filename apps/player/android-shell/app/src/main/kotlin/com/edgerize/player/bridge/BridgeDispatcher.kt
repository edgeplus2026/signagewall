package com.edgerize.player.bridge

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import com.edgerize.player.identity.DeviceIdStore
import com.edgerize.player.update.Updater
import com.edgerize.player.util.json

/**
 * Routes a bridge command to its handler and produces the `value` JsonElement — or
 * throws, which the caller turns into an `{ok:false}` envelope. The eight commands
 * mirror the Tauri Rust commands 1:1 (lib.rs + updater.rs) with the same JSON
 * shapes. Quick commands do sub-millisecond work synchronously; `run_update` returns
 * immediately (Level 3 runs the actual download/install on a background thread).
 */
class BridgeDispatcher(
    private val shellVersion: String,
    private val deviceIdStore: DeviceIdStore,
    private val updater: Updater,
) {
    fun dispatch(cmd: String, argsJson: String): JsonElement = when (cmd) {
        "get_device_id" -> getDeviceId()
        "set_device_id" -> setDeviceId(argsJson)
        "shell_version" -> JsonPrimitive(shellVersion)
        "check_update" -> updater.cachedCheck()
        "run_update" -> updater.runUpdate()
        "get_update_state" -> updater.stateReport()
        "report_alive" -> {
            updater.reportAlive()
            JsonNull
        }
        "report_healthy" -> {
            updater.reportHealthy()
            JsonNull
        }
        else -> throw IllegalArgumentException("unknown command: $cmd")
    }

    private fun getDeviceId(): JsonElement =
        when (val r = deviceIdStore.read()) {
            is DeviceIdStore.ReadResult.Present -> JsonPrimitive(r.id)
            DeviceIdStore.ReadResult.Absent -> JsonNull
            // Reject, do NOT return null — a false "absent" would strand pairing.
            DeviceIdStore.ReadResult.Unreadable ->
                throw IllegalStateException("device id store unreadable")
        }

    private fun setDeviceId(argsJson: String): JsonElement {
        val id = json.parseToJsonElement(argsJson)
            .jsonObject["id"]
            ?.jsonPrimitive
            ?.contentOrNull
            ?: throw IllegalArgumentException("set_device_id requires { id }")
        deviceIdStore.write(id) // throws if not a canonical lowercase UUID
        return JsonNull
    }
}
