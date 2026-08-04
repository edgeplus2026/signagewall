package com.signagewall.player.bridge

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import com.signagewall.player.identity.DeviceIdStore
import com.signagewall.player.update.OtaUpdater
import com.signagewall.player.update.Updater
import com.signagewall.player.runtime.PlayerLiveness
import com.signagewall.player.util.json

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
    /**
     * Whether this install is provisioned as Device Owner. Only then can a HARD
     * kiosk actually lock the box; without it the request silently degrades to
     * escapable screen-pinning (see KioskController), and the CMS would keep
     * telling the operator the screen was "fully locked" when it was not.
     * A lambda so the dispatcher stays testable without a DevicePolicyManager.
     */
    private val deviceOwner: () -> Boolean = { false },
    /** Pre-serialised device facts for the web service menu. */
    private val deviceInfo: () -> String = { "{}" },
    /** Unpairs this display locally: drops the device id and restarts. */
    private val onDeactivate: () -> Unit = {},
    /** Opens the overlay-permission settings screen; false if the device has none. */
    private val onRequestRecovery: () -> Boolean = { false },
) {
    fun dispatch(cmd: String, argsJson: String): JsonElement = when (cmd) {
        "get_device_id" -> getDeviceId()
        "set_device_id" -> setDeviceId(argsJson)
        "shell_version" -> JsonPrimitive(shellVersion)
        "device_owner" -> JsonPrimitive(deviceOwner())
        "device_info" -> json.parseToJsonElement(deviceInfo())
        "deactivate" -> {
            onDeactivate()
            JsonNull
        }
        // Opens the system screen where the operator allows the player to put
        // itself back on screen. Answers whether such a screen exists here.
        "request_recovery_permission" -> JsonPrimitive(onRequestRecovery())
        "check_update" -> updater.cachedCheck()
        // `operator: true` means a technician is standing at the screen and can
        // answer the system's install confirmation. Without it a scheduled update
        // that would prompt is refused rather than left hanging over the content.
        "run_update" -> {
            val u = updater
            if (u is OtaUpdater) u.runUpdate(parseOperatorFlag(argsJson)) else u.runUpdate()
        }
        "get_update_state" -> updater.stateReport()
        // The page beats every 5s from its own event loop, specifically so a
        // frozen WebView can be told apart from a working one. There was no case
        // for it here, so ~17k beats a day were answered with "unknown command"
        // and discarded — the shell had the heartbeat it needed all along.
        "report_liveness" -> {
            PlayerLiveness.beat(parseItemId(argsJson), parseMultiItem(argsJson))
            JsonNull
        }
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

    private fun parseOperatorFlag(argsJson: String): Boolean =
        try {
            json.parseToJsonElement(argsJson)
                .jsonObject["operator"]
                ?.jsonPrimitive
                ?.content == "true"
        } catch (_: Throwable) {
            false
        }

    /** Whether the playlist has more than one item, so "content has not changed"
     *  means something. Absent on an older bundle, which reads as false — the safe
     *  direction, since it only disables a check. */
    private fun parseMultiItem(argsJson: String): Boolean =
        try {
            json.parseToJsonElement(argsJson)
                .jsonObject["multiItem"]
                ?.jsonPrimitive
                ?.content == "true"
        } catch (_: Throwable) {
            false
        }

    /** The renderable currently on screen, if the page sent one. Absent on older
     *  web bundles, which still prove the event loop is alive. */
    private fun parseItemId(argsJson: String): String? =
        try {
            json.parseToJsonElement(argsJson)
                .jsonObject["itemId"]
                ?.jsonPrimitive
                ?.contentOrNull
        } catch (_: Throwable) {
            null
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
