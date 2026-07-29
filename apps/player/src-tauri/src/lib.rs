//! SignageWall Player native shell (Tauri v2).
//!
//! Wraps the REMOTE web player in a fullscreen, unattended kiosk window and
//! persists the stable `deviceId` in the OS app-config dir (surviving a WebView2
//! storage wipe). The web player reaches these commands over `window.__TAURI__`
//! (the config sets `withGlobalTauri: true`); see `apps/player/src/native/`.
//!
//! Includes the kiosk window + autostart + single-instance + identity/version
//! commands, the OTA updater (check/download/install) and a post-update
//! health-check watchdog with rollback (see `updater.rs`). CEC display-power is
//! a later phase.

pub mod paths;
pub mod state;
mod updater;

use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/// Fallback player origin for local dev. Production is baked in at build time via
/// `SIGNAGEWALL_PLAYER_URL` (CI sets it); it must also be listed in
/// `capabilities/default.json` `remote.urls` for IPC to reach the remote page.
const DEFAULT_PLAYER_URL: &str = "http://localhost:5174";

/// Persisted device identity. Stored as JSON in `app_config_dir/device.json`.
#[derive(Serialize, Deserialize, Default)]
struct DeviceRecord {
    #[serde(rename = "deviceId")]
    device_id: Option<String>,
}

fn device_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("device.json"))
}

/// Reads the persisted deviceId. `Ok(None)` means the store is provably ABSENT
/// (no file); a read/parse failure is `Err`, deliberately NOT `Ok(None)`. The web
/// boot bootstrap relies on that distinction: it only overwrites the store when
/// the read said "absent", so a transient IO error or a corrupt file can't be
/// mistaken for "empty" and clobbered with a freshly-minted id (which would
/// permanently strand the paired screen).
#[tauri::command]
fn get_device_id(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = device_file(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    // A corrupt file is not "absent" — surface it as an error so the caller keeps
    // the (unreadable) store rather than overwriting a possibly-recoverable id.
    let record: DeviceRecord = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    Ok(record.device_id)
}

/// A canonical **lowercase** UUID — the only shape we accept as a device identity.
/// The command is reachable from the (remote) player page, so we refuse to write
/// anything that isn't a UUID rather than let an injected script rebind the
/// durable identity to arbitrary content. Lowercase-only matches the web side
/// (`crypto.randomUUID()` and `recovery.ts`'s lowercased URL id), so the native
/// store can never hold a case variant that mismatches the id used everywhere
/// else on a case-sensitive comparison.
fn is_uuid(id: &str) -> bool {
    let groups = [8usize, 4, 4, 4, 12];
    let mut parts = id.split('-');
    for len in groups {
        match parts.next() {
            Some(part)
                if part.len() == len
                    && part.bytes().all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f')) => {}
            _ => return false,
        }
    }
    parts.next().is_none()
}

/// Persists the deviceId to the native store (durable across WebView wipes +
/// updates). Written atomically — a torn write here would silently reset the
/// device to a fresh identity on the next boot, which is exactly the failure the
/// native store exists to prevent.
#[tauri::command]
fn set_device_id(app: tauri::AppHandle, id: String) -> Result<(), String> {
    if !is_uuid(&id) {
        return Err("deviceId must be a UUID".into());
    }
    let path = device_file(&app)?;
    let record = DeviceRecord {
        device_id: Some(id),
    };
    let raw = serde_json::to_string_pretty(&record).map_err(|e| e.to_string())?;
    state::write_atomic(&path, raw.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

/// The `watchdog/` subdir under the app-config dir (created on demand). Shared by
/// the liveness beat and the player-info handshake the supervisor reads.
fn watchdog_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join(paths::WATCHDOG_SUBDIR);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Records which on-disk binary this player is, so the watchdog can spawn/kill it
/// by its real path/name instead of a hardcoded install-name (only confirmable on
/// Windows). Written once at startup; best-effort — a failure just falls the
/// watchdog back to scanning the install dir.
fn write_player_info(app: &tauri::AppHandle) {
    let Ok(dir) = watchdog_dir(app) else {
        return;
    };
    let Ok(exe) = std::env::current_exe() else {
        return;
    };
    let info = state::PlayerInfo {
        exe_path: exe.to_string_lossy().into_owned(),
        image_name: exe
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default(),
    };
    let _ = state::write_player_info(&dir.join(paths::PLAYER_INFO_FILE), &info);
}

/// Liveness beat from the web layer, proving the WebView is running JS right now.
/// The supervisor reads this file's freshness to tell a healthy player from a
/// frozen one (process alive but JS stalled → gray screen). Best-effort: a dropped
/// beat just looks briefly stale and the web side beats again a few seconds later.
#[tauri::command]
fn report_liveness(app: tauri::AppHandle) {
    let Ok(dir) = watchdog_dir(&app) else {
        return;
    };
    let rec = state::LivenessRecord {
        pid: std::process::id(),
        ts_ms: state::now_ms(),
    };
    let _ = state::write_liveness(&dir.join(paths::LIVENESS_FILE), &rec);
}

// --- Keep-alive supervision registration (release only) ---------------------
// The watchdog is the process the OS autostarts AND keeps alive; it restarts the
// player on crash/hang. macOS uses a launchd LaunchAgent with KeepAlive; Windows
// a Scheduled Task with restart-on-failure. Windows is the fleet, macOS is
// dev/test. Everything below is best-effort and idempotent (safe every boot).

/// The bundled watchdog binary, installed next to us (Tauri `externalBin` strips
/// the target-triple suffix and drops it beside the main exe).
#[cfg(not(debug_assertions))]
fn watchdog_exe_path() -> Option<PathBuf> {
    let dir = std::env::current_exe().ok()?.parent()?.to_path_buf();
    let name = if cfg!(windows) {
        "signagewall-watchdog.exe"
    } else {
        "signagewall-watchdog"
    };
    let exe = dir.join(name);
    exe.exists().then_some(exe)
}

/// macOS: a launchd LaunchAgent with `RunAtLoad` + `KeepAlive` — starts the
/// watchdog at login and restarts it if it ever dies. Idempotent: overwrites the
/// plist and re-kickstarts.
#[cfg(all(not(debug_assertions), target_os = "macos"))]
fn ensure_watchdog_supervision(watchdog: &std::path::Path) {
    let label = "com.signagewall.player.watchdog";
    let Some(home) = dirs::home_dir() else {
        return;
    };
    let plist_path = home
        .join("Library/LaunchAgents")
        .join(format!("{label}.plist"));
    let plist = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key><string>{label}</string>
    <key>ProgramArguments</key><array><string>{exe}</string></array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
  </dict>
</plist>
"#,
        exe = watchdog.display()
    );
    if let Some(parent) = plist_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if fs::write(&plist_path, plist).is_err() {
        return;
    }
    // Load + (re)start now; at next login `RunAtLoad` handles it regardless.
    if let Ok(out) = std::process::Command::new("id").arg("-u").output() {
        let uid = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if !uid.is_empty() {
            let target = format!("gui/{uid}");
            let _ = std::process::Command::new("launchctl")
                .args(["bootstrap", &target, &plist_path.to_string_lossy()])
                .status();
            let _ = std::process::Command::new("launchctl")
                .args(["kickstart", "-k", &format!("{target}/{label}")])
                .status();
        }
    }
}

/// Windows (the fleet): a Scheduled Task with an at-logon trigger and
/// restart-on-failure — the closest equivalent to launchd KeepAlive (Task
/// Scheduler restarts a FAILED run; the watchdog never exits cleanly, so a crash
/// is a non-zero exit it catches). currentUser / LeastPrivilege to keep the
/// no-UAC model. VERIFY-ON-WINDOWS: schtasks XML encoding + logon-trigger
/// principal behaviour can only be confirmed on a real box.
#[cfg(all(not(debug_assertions), windows))]
fn ensure_watchdog_supervision(watchdog: &std::path::Path) {
    let task = "SignageWallPlayerWatchdog";
    let xml = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>SignageWall Player keep-alive supervisor</Description></RegistrationInfo>
  <Triggers><LogonTrigger><Enabled>true</Enabled></LogonTrigger></Triggers>
  <Principals><Principal id="Author"><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <RestartOnFailure><Interval>PT1M</Interval><Count>999</Count></RestartOnFailure>
  </Settings>
  <Actions Context="Author"><Exec><Command>{exe}</Command></Exec></Actions>
</Task>"#,
        exe = watchdog.display()
    );
    let tmp = std::env::temp_dir().join("signagewall-watchdog-task.xml");
    if fs::write(&tmp, xml).is_err() {
        return;
    }
    let _ = std::process::Command::new("schtasks")
        .args(["/Create", "/TN", task, "/XML", &tmp.to_string_lossy(), "/F"])
        .status();
    let _ = std::process::Command::new("schtasks")
        .args(["/Run", "/TN", task])
        .status();
    let _ = fs::remove_file(&tmp);
}

/// Other targets (Linux is not a fleet target): no OS supervisor wired yet.
#[cfg(all(not(debug_assertions), not(any(target_os = "macos", windows))))]
fn ensure_watchdog_supervision(_watchdog: &std::path::Path) {}

/// The native shell version (distinct from the web bundle's `appVersion`).
#[tauri::command]
fn shell_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

/// Result of a (read-only) update check, reported to the web layer which folds
/// it into the heartbeat profile. Detection only — applying an update is
/// `updater::run_update`. camelCase to match the web `DeviceUpdateStatus` shape.
#[derive(Serialize)]
struct UpdateCheck {
    available: bool,
    #[serde(rename = "currentVersion")]
    current_version: String,
    #[serde(rename = "availableVersion")]
    available_version: Option<String>,
}

/// Checks the update endpoint (`plugins.updater.endpoints`) for a newer signed
/// build WITHOUT downloading or installing it. The web `checkForUpdate()` calls
/// this at boot and maps the result into the reported update status. Errors
/// (unreachable endpoint, malformed manifest) surface as `Err` → the web side
/// records `lastResult: 'error'` and the device stays on the current version.
#[cfg(desktop)]
#[tauri::command]
async fn check_update(app: tauri::AppHandle) -> Result<UpdateCheck, String> {
    use tauri_plugin_updater::UpdaterExt;

    let current_version = app.package_info().version.to_string();
    let updater = app.updater().map_err(|e| e.to_string())?;
    // Bound the check exactly as `run_update` does: a flaky signage uplink that
    // accepts the TCP connection but never responds would otherwise hang this
    // future forever, pinning the reported status on `checking` for the whole
    // session (the web `checkForUpdate` never resolves).
    let checked = tokio::time::timeout(updater::UPDATE_TIMEOUT, updater.check())
        .await
        .map_err(|_| "update check timed out".to_string())?
        .map_err(|e| e.to_string())?;
    match checked {
        Some(update) => Ok(UpdateCheck {
            available: true,
            current_version,
            available_version: Some(update.version),
        }),
        None => Ok(UpdateCheck {
            available: false,
            current_version,
            available_version: None,
        }),
    }
}

/// Mobile stub: the updater crate is desktop-only (installer-based OTA), so on a
/// future mobile build this keeps the command in the handler list resolvable and
/// reports "no update" — mobile updates through its own store channel.
#[cfg(not(desktop))]
#[tauri::command]
async fn check_update(app: tauri::AppHandle) -> Result<UpdateCheck, String> {
    Ok(UpdateCheck {
        available: false,
        current_version: app.package_info().version.to_string(),
        available_version: None,
    })
}

pub fn run() {
    tauri::Builder::default()
        // Only one shell per machine; focus the existing window on a second launch.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        // `window.__TAURI__.process.relaunch()` — used by the web `restart.ts`.
        .plugin(tauri_plugin_process::init())
        // Launch on boot so a rebooted mini-PC comes back to the player unattended.
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            get_device_id,
            set_device_id,
            shell_version,
            report_liveness,
            check_update,
            updater::run_update,
            updater::report_alive,
            updater::report_healthy,
            updater::get_update_state
        ])
        .setup(|app| {
            // Path parity: the standalone watchdog resolves state/liveness paths
            // from `paths::config_root()` (dirs + identifier) with no AppHandle.
            // Pin it against Tauri's own `app_config_dir()` so a divergence fails
            // loudly in dev/CI on each platform instead of silently splitting the
            // two processes across different files.
            #[cfg(debug_assertions)]
            if let (Ok(tauri_dir), Some(ours)) =
                (app.path().app_config_dir(), crate::paths::config_root())
            {
                debug_assert_eq!(
                    tauri_dir, ours,
                    "paths::config_root() must equal Tauri app_config_dir()"
                );
            }

            // Tell the keep-alive supervisor which binary we are (path + image
            // name), so it can restart exactly this player without a hardcoded
            // install-name. Harmless in dev; the watchdog only acts in release.
            write_player_info(app.handle());

            // OTA updater (desktop only): register the plugin at runtime so the
            // `check_update` command — and the later download/install path — can
            // reach `app.updater()`. Registering here (vs the builder chain) is
            // the plugin's documented pattern and keeps the chain cfg-free.
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            // Cross-thread update flags: `healthy` (web → watchdog), `decided`
            // (exactly one of report_healthy / watchdog acts on a pending update)
            // and `running` (run_update re-entrancy). See `updater.rs`.
            let guards = updater::UpdateGuards::default();
            updater::spawn_health_watchdog(app.handle().clone(), &guards);
            app.manage(guards);

            // Keep-alive supervision (release only). The standalone watchdog is now
            // what the OS autostarts AND keeps alive (launchd KeepAlive / Task
            // Scheduler restart-on-failure); it in turn restarts the player on
            // crash/hang — the gap the old autostart-on-boot could not cover. Also
            // drop the player's OWN legacy login item so, on a box upgraded from an
            // older build, the two don't both claim autostart.
            #[cfg(not(debug_assertions))]
            {
                use tauri_plugin_autostart::ManagerExt;
                let _ = app.autolaunch().disable();
                if let Some(watchdog) = watchdog_exe_path() {
                    ensure_watchdog_supervision(&watchdog);
                }
            }

            // Build the window pointing at the (remote) player. The URL is baked
            // in per-environment via `SIGNAGEWALL_PLAYER_URL` (CI sets it for prod).
            let url = option_env!("SIGNAGEWALL_PLAYER_URL").unwrap_or(DEFAULT_PLAYER_URL);
            let target = url
                .parse()
                .map_err(|_| format!("invalid SIGNAGEWALL_PLAYER_URL: {url}"))?;

            let builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(target))
                .title("SignageWall Player");

            // Kiosk only in release; a plain resizable window in dev so it's easy
            // to work with (not fullscreen / always-on-top on the dev machine).
            #[cfg(not(debug_assertions))]
            let builder = builder
                .fullscreen(true)
                .decorations(false)
                .always_on_top(true)
                .resizable(false)
                .skip_taskbar(true);

            #[cfg(debug_assertions)]
            let builder = builder.inner_size(1280.0, 720.0);

            let window = builder.build()?;

            // Unattended kiosk: refuse to close. Alt+F4 / Ctrl+W would otherwise
            // leave the screen dark until the next OS boot (autostart), with
            // nobody on site to reopen it. Release only — dev must stay closable.
            //
            // NOTE: we deliberately do NOT pin navigation with `on_navigation`.
            // The IPC surface is already origin-gated by `capabilities` (a page
            // from another origin gets no commands), and a URL-level allowlist
            // risks breaking the YouTube/Canva/Web iframe embeds, which we cannot
            // verify against WebView2 without a real Windows device.
            #[cfg(not(debug_assertions))]
            {
                let kiosk = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = kiosk.set_focus();
                    }
                });
            }

            // In dev, open devtools so console/network (e.g. socket) errors are visible.
            #[cfg(debug_assertions)]
            window.open_devtools();
            #[cfg(not(debug_assertions))]
            let _ = window;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running SignageWall Player shell");
}

#[cfg(test)]
mod tests {
    use super::is_uuid;

    #[test]
    fn accepts_a_canonical_lowercase_uuid() {
        assert!(is_uuid("11111111-2222-4333-8444-555566667777"));
        assert!(is_uuid("abcdef01-2345-6789-abcd-ef0123456789"));
    }

    #[test]
    fn rejects_uppercase_so_the_stored_form_matches_the_web() {
        // The web only ever produces lowercase (crypto.randomUUID / lowercased
        // URL id); accepting uppercase would let an injected script persist a case
        // variant that mismatches everywhere else on a case-sensitive compare.
        assert!(!is_uuid("ABCDEF01-2345-6789-ABCD-EF0123456789"));
        assert!(!is_uuid("11111111-2222-4333-8444-55556666AAAA"));
    }

    #[test]
    fn rejects_malformed_shapes() {
        assert!(!is_uuid(""));
        assert!(!is_uuid("not-a-uuid"));
        assert!(!is_uuid("11111111-2222-4333-8444-555566667777-extra"));
        assert!(!is_uuid("11111111-2222-4333-8444-55556666777")); // 11-char tail
        assert!(!is_uuid("1111111g-2222-4333-8444-555566667777")); // non-hex
    }
}
