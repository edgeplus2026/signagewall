# Edge Player — native shell (Tauri v2)

Fullscreen, unattended kiosk shell that wraps the **remote** web player, keeps it
alive on boot, and persists the device identity natively. Windows is the MVP
target (WebView2). This is the **Phase 1** scaffold: shell + kiosk window +
autostart + single-instance + identity/version commands. OTA updater,
watchdog/health-check, and CEC display-power come in later phases.

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
pnpm --filter @edge/player tauri:dev
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
- One-time icons: `pnpm --filter @edge/player tauri icon path/to/logo-1024.png`
  (see `icons/README.md`).

## Run in dev

```bash
# from the repo root — starts the vite player (:5174) and opens the shell window
pnpm --filter @edge/player tauri:dev
```

The shell loads `EDGE_PLAYER_URL` (defaults to `http://localhost:5174`).

## Build the Windows installer

```bash
# point the shell at the real player origin, then build
EDGE_PLAYER_URL="https://player.vecom.rs" \
pnpm --filter @edge/player tauri:build
# → src-tauri/target/release/bundle/nsis/Edge Player_<ver>_x64-setup.exe
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
apps/player/scripts/release/bump.sh 0.2.0   # bumps tauri.conf.json + tags player-v0.2.0
git push && git push origin player-v0.2.0    # push the tag -> full build + publish
```

Or run the workflow manually (`workflow_dispatch`) with a version to get a
**build-only** smoke test (no publish) — use this for the first dry run.

**One-time repo setup** (Settings → Secrets and variables → Actions):

| Kind     | Name                                 | Value                                             |
| -------- | ------------------------------------ | ------------------------------------------------- |
| Secret   | `TAURI_SIGNING_PRIVATE_KEY`          | contents of `~/.tauri/edge-player.key`            |
| Secret   | `R2_ACCOUNT_ID`                      | Cloudflare account id                             |
| Secret   | `R2_RELEASES_ACCESS_KEY_ID`          | R2 "Object Read & Write" access key               |
| Secret   | `R2_RELEASES_SECRET_ACCESS_KEY`      | R2 secret                                         |
| Variable | `EDGE_PLAYER_URL`                    | prod player origin (e.g. `https://player.vecom.rs`)|
| Variable | `R2_RELEASES_BUCKET`                 | e.g. `edge-releases`                              |
| Variable | `R2_RELEASES_PUBLIC_URL`             | the bucket's public domain (no trailing `/`)      |

The signing key was generated **without a passphrase**, so there is no
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secret — the workflow references it, but an
absent secret expands to the empty string, which Tauri reads as "no password".

The R2 bucket must be **publicly readable** (r2.dev managed domain or a custom
public domain) — the updater and every device download `latest.json` + installers
over anonymous HTTPS. CI injects `EDGE_PLAYER_URL`, the prod origin (replacing
`REPLACE_PROD_ORIGIN` in `capabilities/default.json`), and the R2 updater endpoint
at build time, so the committed config stays dev-only.

Windows Authenticode / macOS notarization are **not** wired yet (installers show
"unknown publisher"); only the minisign OTA signature is applied. Add the code
cert later.

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
`%APPDATA%\rs.futureforward.edge.player\device.json`, which survives a WebView2
storage wipe and shell updates. The web side (`apps/player/src/native/`) prefers
this over localStorage/URL — see `apps/player/src/native/bootstrap.ts`.
