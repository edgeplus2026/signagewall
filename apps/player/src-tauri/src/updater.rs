//! OTA update state machine.
//!
//! `run_update` is invoked by the web layer at the nightly off-hours window and
//! whenever the screen is in standby: it checks the update endpoint, downloads
//! the signature-verified installer, caches it, and installs it — then the shell
//! restarts into the new version.
//!
//! A health-check watchdog guards against a bad update bricking an unattended
//! device: after a post-update boot, if the web layer doesn't call
//! `report_healthy` within [`HEALTH_TIMEOUT`], we roll back to the previous
//! (cached) installer on Windows, or flag `unhealthy` otherwise. The minisign
//! signature is verified automatically by the updater plugin, so a tampered or
//! unsigned artifact never installs in the first place.
//!
//! Durability notes: every state write is atomic (temp + fsync + rename) because
//! these devices lose power without warning, and exactly one of `report_healthy`
//! / the watchdog may act on a pending update (a `decided` CAS picks the winner).

use std::fs;
use std::io::Write as _;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

/// How long after a post-update boot we wait for the web layer to report healthy
/// before rolling back. Generous enough for shell + WebView + remote page load.
const HEALTH_TIMEOUT: Duration = Duration::from_secs(90);

/// Upper bound on the update check and on the download. A signage mini-PC on a
/// flaky link can otherwise leave a half-open transfer hanging forever, silently
/// wedging the update path with no error surfaced.
const UPDATE_TIMEOUT: Duration = Duration::from_secs(15 * 60);

/// Prefix of every cached installer file; also what [`prune_installers`] matches
/// so it can never delete `state.json`.
const INSTALLER_PREFIX: &str = "edge-player-";

/// Cross-thread update flags, registered as Tauri managed state.
#[derive(Default)]
pub struct UpdateGuards {
    /// Set by `report_healthy`: the web layer booted and rendered this run.
    pub healthy: Arc<AtomicBool>,
    /// Whoever CASes this first owns the pending-update decision — so
    /// `report_healthy` and the watchdog can never both act (promote + roll back).
    pub decided: Arc<AtomicBool>,
    /// Process-wide re-entrancy guard: the nightly window and the standby
    /// catch-up can both fire, and a second concurrent run would double-download
    /// and race the state file.
    pub running: Arc<AtomicBool>,
}

/// Clears the in-flight flag on every exit path out of `run_update`.
struct RunGuard(Arc<AtomicBool>);
impl Drop for RunGuard {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

/// Persisted updater state (`app_config_dir/updates/state.json`).
#[derive(Serialize, Deserialize, Default, Clone, Debug, PartialEq)]
pub struct UpdaterState {
    /// Last version confirmed healthy after an OTA install.
    #[serde(rename = "lastGoodVersion")]
    pub last_good_version: Option<String>,
    /// Path to the cached installer that produced `last_good_version` — the
    /// rollback target for the next update.
    #[serde(rename = "lastGoodInstaller")]
    pub last_good_installer: Option<String>,
    /// Version just installed and awaiting a health confirmation on next boot.
    #[serde(rename = "pendingVersion")]
    pub pending_version: Option<String>,
    /// Last reported outcome, surfaced to the CMS via `get_update_state`.
    #[serde(rename = "lastResult")]
    pub last_result: Option<String>,
    /// Whether the last boot rolled back a failed update.
    #[serde(rename = "rolledBack")]
    pub rolled_back: Option<bool>,
}

/// Result of a `run_update` invocation, reported back to the web layer.
#[derive(Serialize)]
pub struct RunResult {
    /// `"updating"`, `"up-to-date"`, `"busy"`, or `"error"`.
    kind: String,
    version: Option<String>,
}

/// Updater state reported to the web on boot so it can reflect a rollback /
/// unhealthy outcome into the heartbeat profile.
#[derive(Serialize)]
pub struct UpdateStateReport {
    #[serde(rename = "pendingVersion")]
    pending_version: Option<String>,
    #[serde(rename = "lastResult")]
    last_result: Option<String>,
    #[serde(rename = "rolledBack")]
    rolled_back: Option<bool>,
    #[serde(rename = "currentVersion")]
    current_version: String,
}

// ---------------------------------------------------------------------------
// Pure decision helpers (unit-tested below — they carry the brick-a-fleet logic)
// ---------------------------------------------------------------------------

/// True when this boot is running the version we just installed, i.e. the update
/// took effect and is awaiting a health confirmation.
pub fn is_post_update_boot(state: &UpdaterState, current: &str) -> bool {
    state.pending_version.as_deref() == Some(current)
}

/// A pending version that is NOT the one we are running means the install never
/// took effect (it failed, was interrupted, or we rolled back). Returns the
/// cleaned state so we never sit on `installing` forever, and so the watchdog
/// doesn't mistake a healthy old version for a post-update boot.
pub fn reconcile(state: &UpdaterState, current: &str) -> Option<UpdaterState> {
    match state.pending_version.as_deref() {
        Some(pending) if pending != current => {
            let mut next = state.clone();
            next.pending_version = None;
            next.last_result = Some("error".into());
            Some(next)
        }
        _ => None,
    }
}

/// Records the running version as last-known-good — it becomes the rollback
/// target for the next update.
pub fn promote(state: &UpdaterState, current: &str, installer: Option<&Path>) -> UpdaterState {
    let mut next = state.clone();
    next.last_good_version = Some(current.to_string());
    next.last_good_installer = installer.and_then(|p| p.to_str()).map(String::from);
    next.pending_version = None;
    next.last_result = Some("up-to-date".into());
    next.rolled_back = Some(false);
    next
}

/// Only files we wrote are prunable — never `state.json`.
pub fn is_installer_name(name: &str) -> bool {
    name.starts_with(INSTALLER_PREFIX)
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/// Writes atomically: temp file in the same dir → fsync → rename. A plain
/// `fs::write` truncates in place, so a power cut mid-write (routine on these
/// devices) would leave a torn file that silently parses back as defaults —
/// losing the rollback target, or worse, the durable deviceId.
pub fn write_atomic(path: &Path, data: &[u8]) -> std::io::Result<()> {
    let tmp = path.with_extension("tmp");
    {
        let mut file = fs::File::create(&tmp)?;
        file.write_all(data)?;
        file.sync_all()?;
    }
    fs::rename(&tmp, path)
}

fn updates_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("updates");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn state_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(updates_dir(app)?.join("state.json"))
}

fn read_state(app: &AppHandle) -> UpdaterState {
    let Ok(path) = state_path(app) else {
        return UpdaterState::default();
    };
    match fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        Err(_) => UpdaterState::default(),
    }
}

fn write_state(app: &AppHandle, state: &UpdaterState) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    write_atomic(&state_path(app)?, raw.as_bytes()).map_err(|e| e.to_string())
}

/// The updater artifact extension per platform (Windows NSIS installer vs the
/// macOS updater tarball).
fn installer_ext() -> &'static str {
    if cfg!(windows) {
        "exe"
    } else {
        "app.tar.gz"
    }
}

fn cached_installer(app: &AppHandle, version: &str) -> Result<PathBuf, String> {
    Ok(updates_dir(app)?.join(format!("{INSTALLER_PREFIX}{version}.{}", installer_ext())))
}

/// Deletes every cached installer except `keep`.
fn prune_installers(app: &AppHandle, keep: &Path) {
    let Ok(dir) = updates_dir(app) else { return };
    let Ok(entries) = fs::read_dir(&dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let prunable = path
            .file_name()
            .map(|n| is_installer_name(&n.to_string_lossy()))
            .unwrap_or(false);
        if prunable && path != keep {
            let _ = fs::remove_file(path);
        }
    }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/// Checks for, downloads, and installs a newer signed build, then restarts into
/// it. Called at the nightly off-hours window and on standby. On Windows
/// `install` force-exits the process; on macOS we restart explicitly.
#[cfg(desktop)]
#[tauri::command]
pub async fn run_update(
    app: AppHandle,
    guards: tauri::State<'_, UpdateGuards>,
) -> Result<RunResult, String> {
    use tauri_plugin_updater::UpdaterExt;

    // Serialize at the Rust boundary: the nightly window and the standby
    // catch-up are independent triggers and can overlap.
    if guards
        .running
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Ok(RunResult {
            kind: "busy".into(),
            version: None,
        });
    }
    let _in_flight = RunGuard(guards.running.clone());

    let updater = app.updater().map_err(|e| e.to_string())?;

    let checked = tokio::time::timeout(UPDATE_TIMEOUT, updater.check())
        .await
        .map_err(|_| "update check timed out".to_string())?
        .map_err(|e| e.to_string())?;

    let Some(update) = checked else {
        return Ok(RunResult {
            kind: "up-to-date".into(),
            version: None,
        });
    };

    let version = update.version.clone();

    // Signature-verified download (the plugin rejects a bad signature itself).
    let bytes = tokio::time::timeout(UPDATE_TIMEOUT, update.download(|_chunk, _total| {}, || {}))
        .await
        .map_err(|_| "update download timed out".to_string())?
        .map_err(|e| e.to_string())?;

    // Cache the installer (rollback target for the NEXT update) and record this
    // version as pending health confirmation across the imminent restart.
    let installer = cached_installer(&app, &version)?;
    write_atomic(&installer, &bytes).map_err(|e| e.to_string())?;

    let mut state = read_state(&app);
    state.pending_version = Some(version.clone());
    state.last_result = Some("installing".into());
    state.rolled_back = Some(false);
    write_state(&app, &state)?;

    // If the install fails (AV quarantine, file lock, no privileges) the process
    // keeps running the OLD version. Clear the pending marker so we don't sit on
    // `installing` forever and the next boot reports a clean error.
    if let Err(err) = update.install(&bytes) {
        let mut failed = read_state(&app);
        failed.pending_version = None;
        failed.last_result = Some("error".into());
        let _ = write_state(&app, &failed);
        return Err(err.to_string());
    }

    app.restart();

    // Unreachable on a real device: `install` force-exits on Windows and
    // `app.restart()` diverges on macOS, so the awaited IPC promise dies with the
    // process. Kept so the command's contract stays total.
    #[allow(unreachable_code)]
    Ok(RunResult {
        kind: "updating".into(),
        version: Some(version),
    })
}

/// Mobile stub — desktop-only OTA (installer based). Mobile updates via its store.
#[cfg(not(desktop))]
#[tauri::command]
pub async fn run_update(
    _app: AppHandle,
    _guards: tauri::State<'_, UpdateGuards>,
) -> Result<RunResult, String> {
    Ok(RunResult {
        kind: "up-to-date".into(),
        version: None,
    })
}

/// Called by the web layer once it has booted and rendered. Clears the watchdog
/// and, if this is a post-update boot, promotes the just-installed version to
/// last-known-good so it becomes the rollback target for the next update.
#[tauri::command]
pub fn report_healthy(app: AppHandle, guards: tauri::State<'_, UpdateGuards>) {
    guards.healthy.store(true, Ordering::SeqCst);

    let state = read_state(&app);
    let current = app.package_info().version.to_string();
    if !is_post_update_boot(&state, &current) {
        return; // normal boot, nothing to promote
    }

    // Exactly one of report_healthy / the watchdog may act on the pending update.
    if guards
        .decided
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return; // the watchdog already decided
    }

    let installer = cached_installer(&app, &current).ok();
    let promoted = promote(&state, &current, installer.as_deref());
    let _ = write_state(&app, &promoted);

    if let Some(good) = installer.as_deref() {
        prune_installers(&app, good);
    }
}

/// Reports the persisted updater state so the web layer can reflect a rollback /
/// unhealthy outcome into the heartbeat on boot.
#[tauri::command]
pub fn get_update_state(app: AppHandle) -> UpdateStateReport {
    let state = read_state(&app);
    UpdateStateReport {
        pending_version: state.pending_version,
        last_result: state.last_result,
        rolled_back: state.rolled_back,
        current_version: app.package_info().version.to_string(),
    }
}

// ---------------------------------------------------------------------------
// Watchdog + rollback
// ---------------------------------------------------------------------------

/// Windows rollback: hand off to the previous installer and EXIT.
///
/// We must not `restart()` here: the running (bad) executable is file-locked, so
/// a silent reinstall cannot overwrite it, and restarting would just bring the
/// bad version back up. Exiting unlocks the binary and lets the installer own the
/// replace-and-relaunch.
///
/// verify-pending: confirm on a real Windows kiosk that the NSIS installer
/// relaunches the app after a silent reinstall. If it does not, `autostart`
/// brings the shell back on the next OS boot.
#[cfg(windows)]
fn rollback_to(app: &AppHandle, state: &mut UpdaterState, installer: &str) {
    let spawned = std::process::Command::new(installer).arg("/S").spawn();
    state.pending_version = None;
    state.rolled_back = Some(spawned.is_ok());
    state.last_result = Some("unhealthy".into());
    let _ = write_state(app, state);

    if spawned.is_ok() {
        app.exit(0);
    }
}

/// Non-Windows rollback is status-only (macOS is dev/test): flag `unhealthy` for
/// the operator instead of reinstalling in place.
#[cfg(not(windows))]
fn rollback_to(app: &AppHandle, state: &mut UpdaterState, _installer: &str) {
    flag_unhealthy(app, state);
}

fn flag_unhealthy(app: &AppHandle, state: &mut UpdaterState) {
    state.pending_version = None;
    state.rolled_back = Some(false);
    state.last_result = Some("unhealthy".into());
    let _ = write_state(app, state);
}

/// Reconciles a stale pending version, then — if this boot really is a
/// post-update boot — spawns the health watchdog. If `report_healthy` is not
/// called within [`HEALTH_TIMEOUT`], rolls back to the last-known-good installer
/// (Windows) or flags `unhealthy` (no target / non-Windows).
pub fn spawn_health_watchdog(app: AppHandle, guards: &UpdateGuards) {
    let current = app.package_info().version.to_string();
    let state = read_state(&app);

    // The install never took effect (failed / interrupted): clear it and stop.
    if let Some(reconciled) = reconcile(&state, &current) {
        let _ = write_state(&app, &reconciled);
        return;
    }

    if !is_post_update_boot(&state, &current) {
        return; // not a post-update boot — nothing to watch
    }

    let healthy = guards.healthy.clone();
    let decided = guards.decided.clone();
    std::thread::spawn(move || {
        std::thread::sleep(HEALTH_TIMEOUT);
        if healthy.load(Ordering::SeqCst) {
            return; // web reported healthy; report_healthy owns the promotion
        }
        if decided
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return; // report_healthy won the race under the wire
        }

        let mut state = read_state(&app);
        match state.last_good_installer.clone() {
            Some(installer) => rollback_to(&app, &mut state, &installer),
            None => flag_unhealthy(&app, &mut state), // first-ever update: no target
        }
    });
}

// ---------------------------------------------------------------------------
// Tests — the decision logic that can brick a fleet
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn state_with(pending: Option<&str>) -> UpdaterState {
        UpdaterState {
            pending_version: pending.map(String::from),
            last_result: Some("installing".into()),
            ..Default::default()
        }
    }

    #[test]
    fn state_round_trips_through_json() {
        let state = UpdaterState {
            last_good_version: Some("0.1.0".into()),
            last_good_installer: Some("/tmp/edge-player-0.1.0.exe".into()),
            pending_version: Some("0.2.0".into()),
            last_result: Some("installing".into()),
            rolled_back: Some(false),
        };
        let raw = serde_json::to_string(&state).unwrap();
        assert!(raw.contains("lastGoodVersion"), "camelCase keys: {raw}");
        let back: UpdaterState = serde_json::from_str(&raw).unwrap();
        assert_eq!(state, back);
    }

    #[test]
    fn unknown_or_corrupt_state_falls_back_to_default() {
        let back: UpdaterState = serde_json::from_str("{}").unwrap();
        assert_eq!(back, UpdaterState::default());
    }

    #[test]
    fn post_update_boot_only_when_pending_matches_running() {
        assert!(is_post_update_boot(&state_with(Some("0.2.0")), "0.2.0"));
        assert!(!is_post_update_boot(&state_with(Some("0.2.0")), "0.1.0"));
        assert!(!is_post_update_boot(&state_with(None), "0.1.0"));
    }

    #[test]
    fn reconcile_clears_a_pending_version_we_are_not_running() {
        // Install failed / was interrupted: we're still on 0.1.0.
        let cleaned = reconcile(&state_with(Some("0.2.0")), "0.1.0").expect("should reconcile");
        assert_eq!(cleaned.pending_version, None);
        assert_eq!(cleaned.last_result.as_deref(), Some("error"));
    }

    #[test]
    fn reconcile_leaves_a_real_post_update_boot_alone() {
        assert!(reconcile(&state_with(Some("0.2.0")), "0.2.0").is_none());
        assert!(reconcile(&state_with(None), "0.2.0").is_none());
    }

    #[test]
    fn promote_records_last_known_good_and_clears_pending() {
        let installer = PathBuf::from("/tmp/edge-player-0.2.0.exe");
        let next = promote(&state_with(Some("0.2.0")), "0.2.0", Some(&installer));
        assert_eq!(next.last_good_version.as_deref(), Some("0.2.0"));
        assert_eq!(
            next.last_good_installer.as_deref(),
            Some("/tmp/edge-player-0.2.0.exe")
        );
        assert_eq!(next.pending_version, None);
        assert_eq!(next.last_result.as_deref(), Some("up-to-date"));
        assert_eq!(next.rolled_back, Some(false));
    }

    #[test]
    fn prune_never_matches_the_state_file() {
        assert!(is_installer_name("edge-player-0.2.0.exe"));
        assert!(is_installer_name("edge-player-0.2.0.app.tar.gz"));
        assert!(!is_installer_name("state.json"));
        assert!(!is_installer_name("state.json.tmp"));
    }

    #[test]
    fn write_atomic_replaces_the_target_in_place() {
        let dir = std::env::temp_dir().join("edge-player-atomic-test");
        let _ = fs::create_dir_all(&dir);
        let target = dir.join("state.json");
        write_atomic(&target, b"{\"lastResult\":\"one\"}").unwrap();
        write_atomic(&target, b"{\"lastResult\":\"two\"}").unwrap();
        let raw = fs::read_to_string(&target).unwrap();
        assert!(raw.contains("two"), "second write must replace the first");
        // The temp file must not survive a successful write.
        assert!(!dir.join("state.tmp").exists());
        let _ = fs::remove_dir_all(&dir);
    }
}
