# SignageWall Player — native shell (Tauri v2)

Fullscreen, unattended kiosk shell that wraps the **remote** web player, keeps it
alive on boot, and persists the device identity natively. Windows is the MVP
target (WebView2). Implemented: shell + kiosk window + autostart + single-instance
+ identity/version commands, the OTA updater with a post-update health-check +
rollback, and an out-of-process **keep-alive supervisor** (`signagewall-watchdog`) that
restarts the player on crash **or hang**. CEC display-power comes later.

### Keep-alive supervisor (`signagewall-watchdog`)

A second small binary (same crate; `src/bin/signagewall-watchdog.rs`) bundled beside the
shell via `bundle.externalBin`. It reconciles toward "exactly one healthy player
running": it respawns the player on crash and kills+respawns it on a **hang**
(process alive but the web-JS liveness beat — `report_liveness` → `watchdog/liveness.json`
— goes stale). It defers during an OTA install via the timestamped `updates/updating.json`
sentinel so it never relaunches a stale binary mid-update. The OS keeps the
*watchdog* alive (macOS launchd `KeepAlive`; Windows a Scheduled Task with
restart-on-failure — registered in the shell's release `setup()`); the player's
own legacy login item is removed on upgrade. The sidecar is built + staged by
`scripts/prepare-watchdog.mjs` (wired into before{Dev,Build}Command), so a plain
`tauri dev` / `tauri build` "just works"; CI cross-stages it per matrix leg via
`WATCHDOG_TARGET`. NOTE: `externalBin` makes tauri-build fail any cargo build
until the sidecar is staged — run `node scripts/prepare-watchdog.mjs` first if you
invoke `cargo` directly.

> ⚠️ Tauri does **not** cross-compile. The **Windows installer** must be built on a
> Windows host (or the `windows-latest` CI runner). But you can fully **run and
> test the shell on macOS** (it builds the mac target locally) — see below.

## Test on macOS (no Windows needed)

The shell code is platform-agnostic, so you can run it on a Mac to verify the
kiosk window, native deviceId persistence, and the remote-IPC spike:

```bash
# one-time: Rust toolchain + Xcode command-line tools
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
xcode-select --install   # if not already installed

# then, from the repo root — starts the vite player and opens the shell window
pnpm --filter @signagewall/player tauri:dev
```

In a **debug** build the window is a plain 1280×720 resizable window (not the
fullscreen/always-on-top kiosk — that only applies to release builds), so it's
easy to work with. macOS uses **WKWebView** (not WebView2), so this also verifies
the player renders on Apple's engine.

## Prerequisites (on the build host)

- **Rust** (stable, ≥ 1.77): https://rustup.rs
- **Node ≥ 20** + **pnpm 11.8** (repo root: `pnpm install`)
- **Windows only:** WebView2 runtime (preinstalled on Win 11; auto-fetched by the
  installer on Win 10) and the MSVC build tools (Visual Studio C++ workload).
- One-time icons: `pnpm --filter @signagewall/player tauri icon path/to/logo-1024.png`
  (see `icons/README.md`).

## Run in dev

```bash
# from the repo root — starts the vite player (:5174) and opens the shell window
pnpm --filter @signagewall/player tauri:dev
```

The shell loads `SIGNAGEWALL_PLAYER_URL` (defaults to `http://localhost:5174`).

## Build the Windows installer

```bash
# point the shell at the real player origin, then build
SIGNAGEWALL_PLAYER_URL="https://player.vecom.rs" \
pnpm --filter @signagewall/player tauri:build
# → src-tauri/target/release/bundle/nsis/SignageWall Player_<ver>_x64-setup.exe
```

Also add `https://player.vecom.rs` to `capabilities/default.json` → `remote.urls`
(replace `REPLACE_PROD_ORIGIN`) so IPC reaches the remote page.

The NSIS installer uses `installMode: currentUser` (per-user install → silent
updates without a UAC prompt on an unattended box).

## Release via CI (OTA) — Phase 3

Releases are cut by GitHub Actions
([`.github/workflows/player-release.yml`](../../../.github/workflows/player-release.yml)),
NOT by hand — the local build above is for dev/testing. The workflow builds +
minisign-signs the Windows and macOS installers on OS-matrix runners, assembles
the updater `latest.json`, and publishes everything to a **public** Cloudflare R2
bucket that `plugins.updater.endpoints` fetches over HTTPS.

**Cut a release** (the git tag is the single source of truth for the version):

```bash
apps/player/scripts/release/bump.sh 0.2.0            # bumps tauri.conf.json + tags player-desktop-v0.2.0
git push && git push origin player-desktop-v0.2.0    # push the tag -> full build + publish
```

Desktop and Android answer to **different tag prefixes** — `player-desktop-v*`
here, `player-v*` for the APK. They carry separate artifacts signed with separate
keys, so one tag driving both meant neither could ship until the other's signing
secrets were in place.

Or run the workflow manually (`workflow_dispatch`) with a version to get a
**build-only** smoke test (no publish) — use this for the first dry run.

**One-time repo setup** (Settings → Secrets and variables → Actions):

| Kind     | Name                                 | Value                                             |
| -------- | ------------------------------------ | ------------------------------------------------- |
| Secret   | `TAURI_SIGNING_PRIVATE_KEY`          | contents of `~/.tauri/signagewall-player.key`            |
| Secret   | `R2_ACCOUNT_ID`                      | Cloudflare account id                             |
| Secret   | `R2_RELEASES_ACCESS_KEY_ID`          | R2 "Object Read & Write" access key               |
| Secret   | `R2_RELEASES_SECRET_ACCESS_KEY`      | R2 secret                                         |
| Variable | `SIGNAGEWALL_PLAYER_URL`                    | prod player origin (e.g. `https://player.vecom.rs`)|
| Variable | `R2_RELEASES_BUCKET`                 | e.g. `edge-releases`                              |
| Variable | `R2_RELEASES_PUBLIC_URL`             | the bucket's public domain (no trailing `/`)      |

The signing key was generated **without a passphrase**, so there is no
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secret — the workflow references it, but an
absent secret expands to the empty string, which Tauri reads as "no password".

The R2 bucket must be **publicly readable** (r2.dev managed domain or a custom
public domain) — the updater and every device download `latest.json` + installers
over anonymous HTTPS. CI injects `SIGNAGEWALL_PLAYER_URL`, the prod origin (replacing
`REPLACE_PROD_ORIGIN` in `capabilities/default.json`), and the R2 updater endpoint
at build time, so the committed config stays dev-only.

Windows Authenticode / macOS notarization are **not** wired yet (installers show
"unknown publisher"); only the minisign OTA signature is applied. Add the code
cert later.

## Verifying the OTA loop end-to-end (two-version harness)

Unit tests cover the state machine (`cargo test`) and the web policy (`vitest`),
but nothing above them proves a real installer is produced, signed, fetched,
installed, and health-gated. Run this once per meaningful updater change — it is
the only thing that catches a signature/manifest/naming mismatch before 500
devices do.

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/signagewall-player.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""

# 1. Build the OLD version and install it (macOS: open the .app from the bundle).
apps/player/scripts/release/bump.sh 0.1.0
pnpm turbo run build --filter=@signagewall/player^...
pnpm --filter @signagewall/player tauri build --target aarch64-apple-darwin --bundles app

# 2. Build the NEW version (this is what the device must pull).
apps/player/scripts/release/bump.sh 0.2.0
pnpm --filter @signagewall/player tauri build --target aarch64-apple-darwin --bundles app

# 3. Serve it as a real update channel (reuse the CI generator so the manifest is
#    byte-identical to what ships).
mkdir -p /tmp/ota/release-darwin-aarch64 && cd /tmp/ota
cp ".../bundle/macos/SignageWall Player.app.tar.gz"     release-darwin-aarch64/signagewall-player.app.tar.gz
cp ".../bundle/macos/SignageWall Player.app.tar.gz.sig" release-darwin-aarch64/signagewall-player.app.tar.gz.sig
node <repo>/apps/player/scripts/release/build-latest-json.mjs \
  --version 0.2.0 --artifacts . --public-base http://localhost:9099 --out latest.json
python3 -m http.server 9099
```

Point `plugins.updater.endpoints` at `http://localhost:9099/latest.json` (add
`"dangerousInsecureTransportProtocol": true` for the plain-HTTP test), run the
installed 0.1.0, and drive it from the window's console:

```js
await window.__TAURI__.core.invoke('run_update')
```

**What must be true:** it downloads, verifies the signature, installs, relaunches
into **0.2.0**; `report_healthy` then promotes 0.2.0 to last-known-good in
`~/Library/Application Support/com.signagewall.player/updates/state.json`
and prunes the old cached installer. To exercise the **watchdog**, block
`report_healthy` (comment out the call in `app.tsx`) and confirm that after 90 s
the state flips to `unhealthy`.

> The Windows rollback (silent NSIS reinstall + relaunch after the process exits)
> is the one path this harness cannot cover — it needs a real Windows kiosk. It is
> marked `verify-pending` in `updater.rs`.

## ⚠️ Spike to verify before relying on this (top risk)

Remote content calling Tauri commands is gated by the capability `remote.urls`.
Before building further phases on it, confirm end-to-end:

1. `tauri:dev`, then in the loaded player's console:
   `await window.__TAURI__.core.invoke('shell_version')` → returns the version.
2. Confirm `get_device_id` / `set_device_id` round-trip from the remote page.

If the ACL blocks app commands from the remote origin in your Tauri version, wrap
them in a small in-repo Tauri plugin (plugins get first-class permissions).

## Identity persistence

`get_device_id` / `set_device_id` read/write
`%APPDATA%\com.signagewall.player\device.json`, which survives a WebView2
storage wipe and shell updates. The web side (`apps/player/src/native/`) prefers
this over localStorage/URL — see `apps/player/src/native/bootstrap.ts`.
