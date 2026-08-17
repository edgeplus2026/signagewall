package com.signagewall.player.runtime

import android.util.Log
import com.signagewall.player.util.AtomicFile
import com.signagewall.player.util.json
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * The shell's own line to the backend, independent of the player page.
 *
 * Everything else a screen says goes through that page — the heartbeat, the
 * diagnostics, every command. Which is fine right up until the page is the thing
 * that broke: a bad web deploy, a WebView that will not load, a renderer that
 * keeps dying. Then the screen goes silent while the shell underneath is running
 * perfectly and would happily say so.
 *
 * Polling, not a socket. This is the layer that has to work when nothing else
 * does, so it gets the mechanism with the least to go wrong: a request on a
 * timer, no connection to lose, no reconnect logic to get subtly wrong, no
 * library to keep alive. The cost is that a command waits up to one interval —
 * the right trade for "the screen is dark", the wrong one for anything the page
 * can already do faster.
 *
 * Credentials come from the page rather than the build. The shell learns the API
 * address and the device token the first time a page ever loads, and keeps them.
 * A screen whose page has never once loaded therefore has no channel — which is
 * honest, because such a device was never paired and has nothing to report.
 */
class ShellChannel(
    private val credentialsFile: File,
    private val shellVersion: String,
    private val readState: () -> RuntimeState,
    private val readFreeDisk: () -> Long,
    private val readLog: () -> List<String>,
    private val isPageAlive: () -> Boolean,
    private val onCommand: (String) -> Unit,
    private val log: ShellLog? = null,
) {

    @Serializable
    data class Credentials(
        @SerialName("apiUrl") val apiUrl: String = "",
        @SerialName("token") val token: String = "",
    ) {
        val usable: Boolean get() = apiUrl.startsWith("https://") && token.isNotBlank()
    }

    @Volatile
    private var cached: Credentials? = null

    /**
     * Stores what the page just handed over. Written atomically for the same
     * reason the device id is: a half-written credentials file after a power cut
     * would silence this channel permanently, and it is the channel of last
     * resort.
     */
    @Synchronized
    fun setCredentials(apiUrl: String, token: String) {
        val next = Credentials(apiUrl.trimEnd('/'), token)
        if (!next.usable) {
            Log.w(TAG, "refusing unusable channel credentials")
            return
        }
        if (next == credentials()) {
            return
        }
        try {
            AtomicFile.write(
                credentialsFile,
                json.encodeToString(Credentials.serializer(), next).toByteArray(),
            )
            cached = next
            log?.record("channel", "credentials updated")
        } catch (t: Throwable) {
            Log.w(TAG, "could not store channel credentials", t)
        }
    }

    @Synchronized
    private fun credentials(): Credentials? {
        cached?.let { return it }
        return try {
            if (!credentialsFile.exists()) {
                null
            } else {
                json
                    .decodeFromString(Credentials.serializer(), credentialsFile.readText())
                    .takeIf { it.usable }
                    ?.also { cached = it }
            }
        } catch (t: Throwable) {
            Log.w(TAG, "could not read channel credentials", t)
            null
        }
    }

    /**
     * One check-in. Reports, collects, runs whatever came back.
     *
     * Returns quietly on every failure. A screen with no network, no credentials
     * or an unreachable backend must go on playing exactly as before — this
     * channel is a way to ASK a healthy-ish device for help, never a dependency
     * of the device being healthy.
     */
    fun poll(includeLogOverride: Boolean = false) {
        val creds = credentials() ?: return
        val state = readState()

        try {
            val response = post(
                "${creds.apiUrl}/player/shell/status",
                creds.token,
                buildReport(state, includeLogOverride),
            )
            val decoded = json.decodeFromString(Response.serializer(), response)
            if (decoded.commands.isNotEmpty()) {
                log?.record("channel", "received ${decoded.commands.joinToString(",")}")
            }
            decoded.commands.forEach(onCommand)
            // Asked for the log? Answer immediately rather than making an operator
            // who is already looking at a broken screen wait a whole interval.
            if (decoded.wantsLog && !includeLogOverride) {
                poll(includeLogOverride = true)
            }
        } catch (t: Throwable) {
            Log.w(TAG, "shell channel poll failed", t)
        }
    }

    private fun buildReport(state: RuntimeState, includeLog: Boolean): String {
        val fields = mutableMapOf<String, kotlinx.serialization.json.JsonElement>(
            "shellVersion" to JsonPrimitive(shellVersion),
            "pageAlive" to JsonPrimitive(isPageAlive()),
            "recoveries" to JsonPrimitive(state.recoveries),
            "freeDiskBytes" to JsonPrimitive(readFreeDisk()),
        )
        state.lastCrash?.let { fields["lastCrash"] = JsonPrimitive(it.take(MAX_CRASH_CHARS)) }
        if (state.lastCrashAt > 0L) {
            fields["lastCrashAt"] = JsonPrimitive(state.lastCrashAt)
        }
        if (includeLog) {
            fields["log"] = kotlinx.serialization.json.JsonArray(
                readLog().takeLast(MAX_LOG_LINES).map { JsonPrimitive(it) },
            )
        }
        return json.encodeToString(JsonObject.serializer(), JsonObject(fields))
    }

    private fun post(url: String, token: String, body: String): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = CONNECT_TIMEOUT
        conn.readTimeout = READ_TIMEOUT
        try {
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.outputStream.use { it.write(body.toByteArray()) }
            if (conn.responseCode !in 200..299) {
                throw IllegalStateException("shell status HTTP ${conn.responseCode}")
            }
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }

    /**
     * Only the fields this shell acts on. Unknown ones are ignored rather than
     * rejected, so a newer backend can add to the response without silencing
     * every older device in the fleet.
     */
    @Serializable
    private data class Response(
        val commands: List<String> = emptyList(),
        val wantsLog: Boolean = false,
    )

    companion object {
        private const val TAG = "ShellChannel"
        private const val CONNECT_TIMEOUT = 10_000
        private const val READ_TIMEOUT = 15_000
        private const val MAX_CRASH_CHARS = 200
        private const val MAX_LOG_LINES = 200

        /**
         * Five minutes. Long enough that a fleet of screens is not a load problem
         * and a sleeping box is not woken constantly; short enough that an
         * operator staring at a dark screen is not left wondering whether the
         * click worked.
         */
        const val POLL_INTERVAL_MILLIS = 5 * 60 * 1000L
    }
}
