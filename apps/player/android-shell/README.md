# SignageWall Player — Android native shell (Kotlin)

A thin native **Android WebView kiosk shell** that wraps the **remote** web player
(`SIGNAGEWALL_PLAYER_URL`) — the Android counterpart of the desktop Tauri shell
(`../src-tauri`). The web player is shared; this shell only does the 5 native jobs:
fullscreen kiosk, autostart, watchdog, durable deviceId, and self-update.

Android is the **primary** signage target (boxes + tablets). This is **NOT** a
`tauri android` build — a standalone Gradle project (`./gradlew`, its own CI job),
reusing the desktop `applicationId` (`com.signagewall.player`).

**Cut a release** — the tag is the only version input here: `versionName` is the
tag and `versionCode` is derived from it (`major*10000 + minor*100 + patch`), so
there is nothing to bump in a file first.

```bash
git tag player-v0.2.0
git push origin player-v0.2.0    # -> player-android-release: CI, build, sign, publish
```

`player-v*` is the **Android** prefix; the desktop shell uses
`player-desktop-v*` (`../scripts/release/bump.sh`). Keep them apart — they ship
different artifacts under different signing keys.

> ⚠️ **Verified on one box, not on a fleet.** The Kotlin builds
> (`:app:assembleDebug`, `:app:testDebugUnitTest`) cover the decision logic
> off-device, and the checklist below was walked end to end on a Tesla Android TV
> (Android 14, MediaTek, no Device Owner): kiosk, autostart, page recovery, shell
> check-in and a full silent OTA. What no test and no single box can answer is how a
> *different* OEM behaves — LockTask, HOME override, background-activity launches and
> the silent installer all vary. Re-walk the checklist on each qualified device.

## What's implemented

Everything below ships in the current shell. (This section used to describe a
"Level 1 demo with no lockdown, no OTA and no autostart" long after all three had
landed — if you are reading it to learn what exists, read the code, and fix this
if it has drifted again.)

- **Kiosk** — `KioskController` hard/soft/off over Device Owner + LockTask, with a
  documented degrade to escapable screen-pinning off Device Owner; `EscapeHatch`
  key combo above the WebView; immersive + keep-screen-on; BACK routed to the web
  service bar when it is open.
- **Autostart + supervision** — `BootReceiver`, `PackageReplacedReceiver`, a
  foreground `WatchdogService` with a `LaunchLadder` (direct start →
  full-screen-intent notification → process restart), and a `HeartbeatReceiver`
  alarm that resurrects the supervisor when `START_STICKY` is not honoured.
- **Page recovery** — `PageRecovery`, a ladder verified by the PAGE's own heartbeat
  (reload → recreate WebView → restart process → bundled offline page with an
  endless retry), plus renderer-crash backoff and unresponsive-renderer termination.
- **OTA** — `OtaUpdater` against the R2 channel manifest: sha256-verified download,
  silent `PackageInstaller` on Device Owner and `needs-operator` otherwise,
  per-version failure backoff and poisoning, and a post-update `HealthWatchdog`.
- **Shell channel** — `ShellChannel` polls the backend every five minutes on the
  device token, so a screen whose PAGE is broken can still be seen and commanded.
- **Bridge** — ~17 commands over `AndroidBridge.invoke`, plus the direct
  `restart` / `setKioskLock` / `setScreenName` / `closeApp` / `setServiceMenuOpen`
  methods. **Origin-guarded**: see the security note below.

## Bridge security (read before touching `BridgeInjection`)

`addJavascriptInterface` injects its object into **every frame at every origin** —
there is no origin parameter, which is why AndroidX added `addWebMessageListener`
as its replacement. This shell renders third-party pages on purpose: the Web app
mounts an operator-supplied URL, and YouTube, Canva, Power BI, Google Slides and
the stream player each embed somebody else's document.

So the raw host requires a per-process nonce, and the wrapper that carries it is
injected into the **player origin only**. A foreign frame sees the object, calls
it, and is refused. Two rules follow:

- Never widen `addDocumentStartJavaScript`'s origin set back to `"*"`.
- Never add a `@JavascriptInterface` method that skips the `authorized(nonce)`
  check — the fire-and-forget ones matter most, because a missing guard there is
  silent rather than visible in a returned envelope.

## The native-command contract (mirrors the Tauri shell 1:1)

`AndroidBridge.invoke(cmd, argsJson): String` returns a JSON envelope
`{"ok":true,"value":…}` / `{"ok":false,"error":…}`. The web transport
(`apps/player/src/native/host.ts`) unwraps `value` on ok and rejects on `!ok`.

Shared with the Tauri shell (same JSON shapes as `../src-tauri/src/lib.rs` +
`updater.rs`): `get_device_id` · `set_device_id{id}` · `shell_version` ·
`report_liveness` · `check_update` · `run_update` · `get_update_state` ·
`report_alive` · `report_healthy`.

**Android-only** (the desktop shell answers none of these, and the web layer
degrades to `undefined`): `device_owner` · `device_info` · `free_disk` ·
`health` · `read_log` · `set_channel` · `set_web_debugging` · `deactivate` ·
`request_recovery_permission`.

Plus the direct methods `restart()`, `setKioskLock(mode)`, `setScreenName(name)`,
`closeApp()` and `setServiceMenuOpen(open)`. All of them — `invoke` included —
take the bridge nonce as their first argument; the injected wrapper supplies it,
so the web-facing API is unchanged.

## Run in dev (against the local vite player)

```bash
# one-time: the wrapper jar/scripts aren't committed — generate them (or just open
# the folder in Android Studio, which does it on import):
cd apps/player/android-shell && gradle wrapper --gradle-version 8.11.1

# start the web player, then install the debug APK on an emulator/device:
pnpm --filter @signagewall/player dev            # serves http://localhost:5174
./gradlew :app:installDebug               # SIGNAGEWALL_PLAYER_URL defaults to http://10.0.2.2:5174
```

`10.0.2.2` is the host loopback from the Android emulator. On a real device pass
your machine's LAN URL: `./gradlew :app:installDebug -PsignagewallPlayerUrl=http://192.168.x.y:5174`.

Verify the bridge from the WebView console (`chrome://inspect` → the device):

```js
JSON.parse(window.AndroidBridge.invoke('get_device_id', '{}'))   // {ok:true,value:null} first boot
JSON.parse(window.AndroidBridge.invoke('shell_version', '{}'))   // {ok:true,value:"0.1.0"}

// And the guard, from a frame that is NOT the player origin — this is what a
// page embedded by the Web app can reach, and all it can reach:
window.__signagewallHost__.invoke('x', 'deactivate', '{}')       // {ok:false,error:"unauthorized"}
```

## Build a release APK

```bash
./gradlew :app:assembleRelease \
  -PsignagewallPlayerUrl="https://player.vecom.rs" \
  -PversionName=0.2.0 -PversionCode=200
# → app/build/outputs/apk/release/app-release.apk
```

Signing keystore comes from CI env (`ANDROID_KEYSTORE_FILE`/`_PASSWORD`,
`ANDROID_KEY_ALIAS`/`_PASSWORD`); a local release build without them stays unsigned.
CI publishes the APK + `signagewall-player/android/latest.json` to R2 (Phase D).

## Provisioning a device (skip this and the screen can never update itself)

Install the first APK so the app becomes its **own installer of record**:

```bash
adb install -r -i com.signagewall.player signagewall-player-<version>.apk
```

The `-i` is not optional. Android 12+ lets an app update *itself* without a prompt
(`USER_ACTION_NOT_REQUIRED`) only when it holds `UPDATE_PACKAGES_WITHOUT_USER_ACTION`
— auto-granted — **and** it is the installer of record. A plain `adb install` leaves
`installerPackageName=null`, and such a device can never install an update unattended:
every scheduled OTA stops at `needs-operator` and waits for somebody to walk to the
screen.

Verify:

```bash
adb shell dumpsys package com.signagewall.player | grep installerPackageName
# installerPackageName=com.signagewall.player
```

Measured on Android 14: `-i` works. `pm set-installer` throws and cannot repair a
device afterwards — but completing one prompted install *through the app* also earns
the installer of record, so a box flashed without `-i` is recoverable with a site
visit rather than a re-flash.

Device Owner is the stronger option (silent installs plus a kiosk lock that actually
holds), but it must be provisioned at factory-reset time and many TV boxes cannot do
it at all: without the `android.software.device_admin` feature a device can never be
Device Owner, and `hard` kiosk degrades to escapable screen pinning.

## Unit tests

```bash
./gradlew :app:testDebugUnitTest        # DeviceIdStore (UUID + round-trip), BridgeDispatcher (8-command shapes)
```

## On-device checklist

Walk this on each qualified box. The Tesla Android TV numbers are the baseline — a
stronger box should do at least as well.

**Before you start**

- `adb shell dumpsys package com.signagewall.player | grep -E 'versionName|installerPackageName'`
- `adb exec-out screencap -p > x.png` is **corrupted on some vendors** — this TV writes
  `Init wrapper sys mutex successful. Pid:NNNN` onto stdout and mangles the PNG. Use
  `adb shell screencap -p /sdcard/x.png` followed by `adb pull` instead.

**Kiosk**

- `pm list features | grep device_admin` — no output means Device Owner is impossible
  here, so `hard` kiosk will always degrade to escapable pinning. Correct behaviour,
  not a bug; the CMS reports it in the same words.
- With the lock off, five BACK presses exit to the launcher. Expected — the Activity
  only swallows BACK while locked.

**Autostart and recovery**

- Kick the player off screen and confirm `LaunchLadder` puts it back (baseline:
  detected in ~9s, restored at rung 0).
- Confirm the page-recovery ladder climbs 1 → 2 → 3 (process restart) → 4 (offline
  page) and logs `page healthy again` once the network returns.
- Replace the package and confirm `InstallReceiver: update installed` is followed by
  the player returning on its own (baseline ~18s).

**Shell check-in**

- Confirm a report every 5 minutes and that the CMS shows it. A screen whose page has
  never loaded has no credentials and correctly reports nothing at all.

**OTA**

- With `-i` in place, publish a release and confirm a fully unattended install:
  `cache/updates/signagewall-player-<code>.apk` parsed, `PackageInstallerSession …
  applied`, `InstallReceiver: update installed`, player back on screen, **no dialog**.
  Baseline: ~20s end to end.
- Without it, confirm the scheduled path reports `needs-operator` instead of throwing a
  dialog at an empty room.

**Power**

- Switch the panel off with the remote, then re-read `dumpsys netpolicy` for the app's
  uid. On this TV the app's network is blocked outright
  (`blocked_state … effective=LOW_POWER_STANDBY`) while `dumpsys power` reports
  `mWakefulness=Asleep` — so the shell can neither check in, nor read the update
  channel, nor receive a command until the panel is back on. Anything that looks like a
  DNS fault with the screen off is probably this: check `mLastSleepReason` before
  debugging the app. `adb shell` itself is a different uid and keeps working, which is
  exactly what makes this misleading.
- With the panel off, the log must go **quiet**: one `display off: standing down`
  line from each of `PageRecovery` and `WatchdogService`, then nothing. No recovery
  escalations, no `LaunchLadder` attempts. (Before this was added, an overnight
  switch-off produced a recovery escalation every few minutes and reached
  `attempt 10, rung 3` against a display nobody could see.)
- Switch it back on: expect the matching `display on: resuming` lines, then a pause
  before any escalation — the first tick after wake must not punish the page for a
  silence the OS imposed — and the recovery rung must be **unchanged** from before
  standby. Confirm video resumes and that the CMS "Recoveries" count did not move
  while the screen was off.

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
