package com.signagewall.player.util

import kotlinx.serialization.json.Json

/**
 * One Json instance for the whole shell — the wire envelope, the persisted updater
 * state, and the update manifest. Lenient on read (`ignoreUnknownKeys`) so a newer
 * server field never crashes an older shell; omits nulls on write so the JSON the
 * web reads matches the Tauri serde output (optional camelCase fields absent, not
 * null).
 */
val json: Json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
    explicitNulls = false
}
