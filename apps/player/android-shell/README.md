# EdgeRize Player — Android native shell (Kotlin)

A thin native **Android WebView kiosk shell** that wraps the **remote** web player
(`EDGE_PLAYER_URL`) — the Android counterpart of the desktop Tauri shell
(`../src-tauri`). The web player is shared; this shell only does the 5 native jobs:
fullscreen kiosk, autostart, watchdog, durable deviceId, and self-update.

Android is the **primary** signage target (boxes + tablets). This is **NOT** a
`tauri android` build — a standalone Gradle project (`./gradlew`, its own CI job),
reusing the desktop `applicationId` (`com.edgerize.player`) and the
`player-vX.Y.Z` tag for versioning.

> ⚠️ **Unverified on-device.** The Kotlin here was authored against the Tauri
> shell's contract but has **not** been compiled or run on an Android device in
> this repo (no Android SDK in the authoring env). Build + smoke-test it on the
> qualified box/tablet before relying on it — see the checklist below.

## Build levels (what's implemented)

- **Level 1 — runnable demo (this commit):** fullscreen WebView → `EDGE_PLAYER_URL`,
  the `AndroidBridge` servicing **all 8** native commands (real `DeviceIdStore`;
  `run_update` = up-to-date), `restart()`, immersive + keep-screen-on, back
  swallowed, render-process-gone recovery. **No lockdown, no OTA install, no
  autostart.** → an installable APK where the player runs and reports
  `runtime: android-webview` + `shellVersion`.
- **Level 2 — full kiosk (next):** `KioskController` (hard/soft/off) + Device Owner
  + LockTask, `EscapeHatch` (native key-combo → PIN), `BootReceiver`,
  `WatchdogService`, D-pad forwarding, and the `setKioskLock` bridge wired to it.
- **Level 3 — fleet:** real `Updater` (silent `PackageInstaller` on Device Owner /
  prompted otherwise) + health-gate + rollback, QR/adb provisioning, and the
  CI publish to the R2 `edge-player/android/` channel.

## The native-command contract (mirrors the Tauri shell 1:1)

`AndroidBridge.invoke(cmd, argsJson): String` returns a JSON envelope
`{"ok":true,"value":…}` / `{"ok":false,"error":…}`. The web transport
(`apps/player/src/native/host.ts`) unwraps `value` on ok and rejects on `!ok`.
Commands (same JSON shapes as `../src-tauri/src/lib.rs` + `updater.rs`):
`get_device_id` · `set_device_id{id}` · `shell_version` · `check_update` ·
`run_update` · `get_update_state` · `report_alive` · `report_healthy`. Plus the
direct bridge methods `restart()` and `setKioskLock(mode)`.

## Run in dev (against the local vite player)

```bash
# one-time: the wrapper jar/scripts aren't committed — generate them (or just open
# the folder in Android Studio, which does it on import):
cd apps/player/android-shell && gradle wrapper --gradle-version 8.11.1

# start the web player, then install the debug APK on an emulator/device:
pnpm --filter @edge/player dev            # serves http://localhost:5174
./gradlew :app:installDebug               # EDGE_PLAYER_URL defaults to http://10.0.2.2:5174
```

`10.0.2.2` is the host loopback from the Android emulator. On a real device pass
your machine's LAN URL: `./gradlew :app:installDebug -PedgePlayerUrl=http://192.168.x.y:5174`.

Verify the bridge from the WebView console (`chrome://inspect` → the device):

```js
JSON.parse(window.AndroidBridge.invoke('get_device_id', '{}'))   // {ok:true,value:null} first boot
JSON.parse(window.AndroidBridge.invoke('shell_version', '{}'))   // {ok:true,value:"0.1.0"}
```

## Build a release APK

```bash
./gradlew :app:assembleRelease \
  -PedgePlayerUrl="https://player.vecom.rs" \
  -PversionName=0.2.0 -PversionCode=200
# → app/build/outputs/apk/release/app-release.apk
```

Signing keystore comes from CI env (`ANDROID_KEYSTORE_FILE`/`_PASSWORD`,
`ANDROID_KEY_ALIAS`/`_PASSWORD`); a local release build without them stays unsigned.
CI publishes the APK + `edge-player/android/latest.json` to R2 (Phase D).

## Unit tests

```bash
./gradlew :app:testDebugUnitTest        # DeviceIdStore (UUID + round-trip), BridgeDispatcher (8-command shapes)
```

## Notes / gotchas

- **`minSdk = 26`** so the launcher icon is pure-XML (adaptive) and Device Owner /
  LockTask / silent `PackageInstaller` are robust. Lowering it needs PNG mipmap
  densities (Android Studio → Image Asset, or reuse `../src-tauri/icons/android`).
- **Cleartext** is permitted only for `10.0.2.2` / `localhost` (dev); prod is
  HTTPS-only (`res/xml/network_security_config.xml`).
- **`@JavascriptInterface` is synchronous** — quick commands return JSON at once;
  `run_update` (Level 3) must return immediately and work on a background thread
  while the web polls `get_update_state`. Do not add blocking network to a bridge
  method.
- Pin the admin PIN per fleet with `-PkioskPinSha256=<sha256-hex>` (Level 2).
