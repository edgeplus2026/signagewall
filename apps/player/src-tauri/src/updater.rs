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
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};

// `UpdaterState`, the updating sentinel, and the atomic-write primitives live in
// `state.rs` (pure std + serde, no Tauri) so the standalone `edge-watchdog`
// binary can read the same files. This module keeps the AppHandle-based wrappers.
use crate::state::{
    clear_sentinel, now_ms, read_state_at, write_atomic, write_sentinel, write_state_at,
    UpdaterState, UpdatingSentinel,
};

/// SHA-256 (hex, lowercase) of a file, or `None` if it can't be read. Used to
/// verify the cached rollback installer hasn't been swapped since we promoted it.
fn file_sha256(path: &Path) -> Option<String> {
    let bytes = fs::read(path).ok()?;
    let digest = Sha256::digest(&bytes);
    Some(digest.iter().map(|b| format!("{b:02x}")).collect())
}

/// How long after a post-update boot we wait for the web layer to report healthy
/// before rolling back. Generous enough for shell + WebView + remote page load.
const HEALTH_TIMEOUT: Duration = Duration::from_secs(90);

/// How many consecutive offline post-update boots (the page never loaded, so we
/// can't tell a bad build from a dead link) to DEFER a rollback before giving up
/// and rolling back anyway. A rollback can't help an offline device, so we wait
/// for connectivity; but a build that never runs JS at all is eventually rolled
/// back rather than looping forever.
const MAX_OFFLINE_DEFERS: u32 = 3;

/// Upper bound on the update check and on the download. A signage mini-PC on a
/// flaky link can otherwise leave a half-open transfer hanging forever, silently
/// wedging the update path with no error surfaced. Also used by `lib.rs`
/// `check_update`, so its boot-time detection is bounded the same way.
pub(crate) const UPDATE_TIMEOUT: Duration = Duration::from_secs(15 * 60);

/// Prefix of every cached installer file; also what [`prune_installers`] matches
/// so it can never delete `state.json`.
const INSTALLER_PREFIX: &str = "edge-player-";

/// Cross-thread update flags, registered as Tauri managed state.
#[derive(Default)]
pub struct UpdateGuards {
    /// Set by `report_alive`: the web JS booted, proving the WebView loaded the
    /// remote page. Distinct from `healthy` so the watchdog can tell "the update
    /// broke the running app" (alive, never healthy) from "the device is offline
    /// so the remote page never loaded" (not alive) — the latter must not trigger
    /// a rollback to a shell that loads the same unreachable URL.
    pub alive: Arc<AtomicBool>,
    /// Set by `report_healthy`: the web layer booted AND reached a confirmed
    /// working state (connected + first content rendered, or a legit idle view).
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

/// The terminal shape of a `run_update` invocation. A typed enum (kebab-cased to
/// the exact wire strings the web `RunResult['kind']` union expects) rather than a
/// bare `String`, so a typo can't compile and silently land in the web's `error`
/// branch. (`error` isn't produced here — an install failure returns `Err`.)
#[derive(Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum RunKind {
    Updating,
    UpToDate,
    Busy,
}

/// Result of a `run_update` invocation, reported back to the web layer.
#[derive(Serialize)]
pub struct RunResult {
    kind: RunKind,
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
    next.post_update_attempts = 0;
    next
}

/// Only files we wrote are prunable — never `state.json`.
pub fn is_installer_name(name: &str) -> bool {
    name.starts_with(INSTALLER_PREFIX)
}

/// True when `version` already failed its health check on this device and must
/// never be auto-installed again (see [`UpdaterState::poisoned_versions`]).
pub fn is_poisoned(state: &UpdaterState, version: &str) -> bool {
    state.poisoned_versions.iter().any(|v| v == version)
}

/// Marks `version` as failed-health so the update path stops re-attempting it.
/// Idempotent; keeps the list bounded (a device only ever sees a handful of bad
/// versions before a fix ships).
pub fn poison(state: &mut UpdaterState, version: &str) {
    if !is_poisoned(state, version) {
        state.poisoned_versions.push(version.to_string());
    }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

// `write_atomic` moved to `state.rs` (shared with the watchdog); imported above.

fn updates_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join(crate::paths::UPDATES_SUBDIR);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn state_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(updates_dir(app)?.join(crate::paths::STATE_FILE))
}

/// AppHandle wrapper over [`crate::state::read_state_at`] — resolves the path via
/// Tauri's `app_config_dir()`, then delegates to the shared reader.
fn read_state(app: &AppHandle) -> UpdaterState {
    match state_path(app) {
        Ok(path) => read_state_at(&path),
        Err(_) => UpdaterState::default(),
    }
}

/// AppHandle wrapper over [`crate::state::write_state_at`].
fn write_state(app: &AppHandle, state: &UpdaterState) -> Result<(), String> {
    write_state_at(&state_path(app)?, state).map_err(|e| e.to_string())
}

/// Path to the timestamped "OTA install in progress" sentinel the keep-alive
/// watchdog reads to tell an intentional updater restart from a crash.
fn sentinel_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(updates_dir(app)?.join(crate::paths::SENTINEL_FILE))
}

/// Writes the updating sentinel (best-effort) right before an install cycles the
/// process. Timestamped → self-expiring, so a missed clear can never wedge
/// recovery. Only the desktop install path calls it; defined unconditionally so
/// the shared imports stay used on every target.
#[cfg_attr(not(desktop), allow(dead_code))]
fn write_updating_sentinel(app: &AppHandle, version: &str) {
    if let Ok(path) = sentinel_path(app) {
        let _ = write_sentinel(
            &path,
            &UpdatingSentinel {
                started_at_ms: now_ms(),
                version: version.to_string(),
            },
        );
    }
}

/// Clears the updating sentinel once a post-update boot resolves (healthy, rolled
/// back, or reconciled). Best-effort — the sentinel self-expires regardless.
fn clear_updating_sentinel(app: &AppHandle) {
    if let Ok(path) = sentinel_path(app) {
        clear_sentinel(&path);
    }
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
// Manifest authentication (closes the signed-downgrade gap)
// ---------------------------------------------------------------------------

/// Reads the updater endpoint + minisign pubkey from the SAME `tauri.conf.json`
/// the plugin uses (embedded at compile time — CI stamps the prod endpoint before
/// building, so this and the plugin can't disagree). Returns `(endpoint, pubkey)`.
#[cfg(desktop)]
fn updater_config() -> Result<(String, String), String> {
    let conf: serde_json::Value =
        serde_json::from_str(include_str!("../tauri.conf.json")).map_err(|e| e.to_string())?;
    let updater = &conf["plugins"]["updater"];
    let endpoint = updater["endpoints"][0]
        .as_str()
        .ok_or("no updater endpoint in tauri.conf.json")?
        .to_string();
    let pubkey = updater["pubkey"]
        .as_str()
        .ok_or("no updater pubkey in tauri.conf.json")?
        .to_string();
    Ok((endpoint, pubkey))
}

/// Parses Tauri's `pubkey` (base64 of the whole minisign public-key FILE) into a
/// verifier. `minisign_verify::PublicKey::from_base64` wants only the raw key
/// line, so we decode the file text and pull the `RW…` line out of the two-line
/// `untrusted comment: …\nRW…` format.
#[cfg(desktop)]
fn parse_pubkey(pubkey_b64: &str) -> Result<minisign_verify::PublicKey, String> {
    use base64::Engine as _;
    let file_bytes = base64::engine::general_purpose::STANDARD
        .decode(pubkey_b64.trim())
        .map_err(|e| e.to_string())?;
    let file_text = String::from_utf8(file_bytes).map_err(|e| e.to_string())?;
    let key_line = file_text
        .lines()
        .map(str::trim)
        .find(|l| !l.is_empty() && !l.starts_with("untrusted comment"))
        .ok_or("no key line in updater pubkey")?;
    minisign_verify::PublicKey::from_base64(key_line).map_err(|e| e.to_string())
}

/// Authenticates the update manifest before its `(version, url)` is trusted. The
/// plugin verifies only the installer BYTES, so an attacker with R2 write (or a
/// TLS-MITM) could otherwise publish a high-version manifest pointing at an old,
/// genuinely-signed, vulnerable installer — a signed-downgrade. We fetch
/// `latest.json` + its detached `.sig` and verify the manifest against the same
/// minisign pubkey; the caller aborts on failure (fail closed). Skipped for the
/// plain-HTTP dev/test endpoint (prod is always https — CI enforces exactly one
/// https URL), so the local two-version harness needs no manifest signature.
///
/// Residual: the plugin re-fetches the manifest after this — a small TOCTOU
/// window an attacker would have to time a swap into, on top of holding R2 write.
/// Closing it fully would mean owning the download too (reimplementing the plugin).
#[cfg(desktop)]
async fn verify_manifest_signature() -> Result<(), String> {
    let (endpoint, pubkey_b64) = updater_config()?;
    if !endpoint.starts_with("https://") {
        return Ok(()); // dev/test http harness; prod is always https
    }
    let client = reqwest::Client::new();
    let manifest = tokio::time::timeout(UPDATE_TIMEOUT, async {
        client.get(&endpoint).send().await?.bytes().await
    })
    .await
    .map_err(|_| "manifest fetch timed out".to_string())?
    .map_err(|e| e.to_string())?;
    let sig_text = tokio::time::timeout(UPDATE_TIMEOUT, async {
        client
            .get(format!("{endpoint}.sig"))
            .send()
            .await?
            .text()
            .await
    })
    .await
    .map_err(|_| "manifest signature fetch timed out".to_string())?
    .map_err(|e| e.to_string())?;

    verify_manifest(&manifest, &sig_text, &pubkey_b64)
}

/// Verifies manifest bytes against Tauri's detached `.sig` using the configured
/// pubkey. Pure (no IO), so it is unit-testable against a real `tauri signer sign`
/// artifact — the http-endpoint skip in the caller otherwise leaves this path
/// untested, which is exactly how the "sig never base64-decoded" regression shipped.
///
/// Tauri wraps BOTH the pubkey and the signature as base64 of the whole minisign
/// FILE (the config pubkey `dW50cnVzdGVk…` base64-decodes to `untrusted comment:
/// …`). `parse_pubkey` already decodes the key; the signature needs the identical
/// decode before `Signature::decode`, or the parser is handed base64 gibberish and
/// verification fails closed on every device — silently disabling OTA fleet-wide.
#[cfg(desktop)]
fn verify_manifest(manifest: &[u8], sig_text: &str, pubkey_b64: &str) -> Result<(), String> {
    use base64::Engine as _;
    let pubkey = parse_pubkey(pubkey_b64)?;
    let sig_file = base64::engine::general_purpose::STANDARD
        .decode(sig_text.trim())
        .map_err(|e| format!("manifest signature not base64: {e}"))
        .and_then(|bytes| String::from_utf8(bytes).map_err(|e| e.to_string()))?;
    let sig = minisign_verify::Signature::decode(&sig_file)
        .map_err(|e| format!("malformed manifest signature: {e}"))?;
    pubkey
        .verify(manifest, &sig, false)
        .map_err(|e| format!("manifest signature verification failed: {e}"))
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
            kind: RunKind::Busy,
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
            kind: RunKind::UpToDate,
            version: None,
        });
    };

    let version = update.version.clone();

    // Authenticate the manifest that produced this update BEFORE downloading its
    // (attacker-influenceable) url — closes the signed-downgrade gap. Fail closed:
    // a manifest we can't verify never installs.
    verify_manifest_signature().await?;

    // Never auto-install a version that already failed its health check here — a
    // rolled-back build is still "available" on the channel, so without this the
    // device would re-download, re-install and re-roll-it-back every off-hours
    // window forever. A genuine fix ships under a new version and is not poisoned.
    if is_poisoned(&read_state(&app), &version) {
        return Ok(RunResult {
            kind: RunKind::UpToDate,
            version: None,
        });
    }

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
    state.post_update_attempts = 0; // fresh install — reset the offline-defer counter
    write_state(&app, &state)?;

    // Mark an install in progress so the keep-alive watchdog treats the imminent
    // process exit (Windows force-exit / macOS restart) as an intentional update,
    // not a crash — it must not relaunch the stale binary mid-install.
    write_updating_sentinel(&app, &version);

    // If the install fails (AV quarantine, file lock, no privileges) the process
    // keeps running the OLD version. Clear the pending marker so we don't sit on
    // `installing` forever and the next boot reports a clean error — and delete
    // the installer we just cached, or a device stuck unable to install would
    // accumulate one 10-100 MB file per released version until the disk fills
    // (prune otherwise only runs on the healthy-promote path).
    if let Err(err) = update.install(&bytes) {
        let _ = fs::remove_file(&installer);
        let mut failed = read_state(&app);
        failed.pending_version = None;
        failed.last_result = Some("error".into());
        let _ = write_state(&app, &failed);
        clear_updating_sentinel(&app); // the install never happened — nothing in flight
        return Err(err.to_string());
    }

    app.restart();

    // Unreachable on a real device: `install` force-exits on Windows and
    // `app.restart()` diverges on macOS, so the awaited IPC promise dies with the
    // process. Kept so the command's contract stays total.
    #[allow(unreachable_code)]
    Ok(RunResult {
        kind: RunKind::Updating,
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
        kind: RunKind::UpToDate,
        version: None,
    })
}

/// Called by the web layer the instant its JS boots — before it has connected or
/// rendered — proving the WebView loaded the remote page. See [`UpdateGuards::alive`].
#[tauri::command]
pub fn report_alive(guards: tauri::State<'_, UpdateGuards>) {
    guards.alive.store(true, Ordering::SeqCst);
}

/// Called by the web layer once it has booted AND reached a confirmed working
/// state (connected + first content rendered, or a legitimate idle view). Clears
/// the watchdog and, if this is a post-update boot, promotes the just-installed
/// version to last-known-good so it becomes the rollback target for the next update.
#[tauri::command]
pub fn report_healthy(app: AppHandle, guards: tauri::State<'_, UpdateGuards>) {
    guards.healthy.store(true, Ordering::SeqCst);

    // The player booted and is rendering, so no install is in progress — clear the
    // watchdog's updating sentinel. Covers the normal post-update-success path and
    // sweeps a stale sentinel left by an earlier interrupted update.
    clear_updating_sentinel(&app);

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
    let mut promoted = promote(&state, &current, installer.as_deref());
    // Record the healthy installer's hash so the rollback can prove the cached
    // file is the same bytes we ran, not a locally-planted swap.
    promoted.last_good_sha256 = installer.as_deref().and_then(file_sha256);
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
    // Re-verify the cached installer before executing it. It lives in a
    // user-writable dir with no OS code signature (currentUser install, no
    // Authenticode), and minisign only guarded the original DOWNLOAD — never this
    // cached exec. A local attacker who swapped the file would otherwise get their
    // payload run, silently, as the kiosk user. Refuse anything whose bytes don't
    // match the hash recorded when we promoted this installer healthy.
    let integrity_ok = match (&state.last_good_sha256, file_sha256(Path::new(installer))) {
        (Some(expected), Some(actual)) => *expected == actual,
        _ => false, // no recorded hash or unreadable file — don't trust it
    };
    if !integrity_ok {
        flag_unhealthy(app, state); // no trustworthy rollback target — flag, don't run it
        return;
    }

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
        clear_updating_sentinel(&app);
        return;
    }

    if !is_post_update_boot(&state, &current) {
        return; // not a post-update boot — nothing to watch
    }

    let alive = guards.alive.clone();
    let healthy = guards.healthy.clone();
    let decided = guards.decided.clone();
    std::thread::spawn(move || {
        std::thread::sleep(HEALTH_TIMEOUT);
        if healthy.load(Ordering::SeqCst) {
            return; // web reported healthy; report_healthy owns the promotion
        }

        let mut state = read_state(&app);

        // The page never loaded (no `report_alive`): the device is offline / the
        // remote origin is unreachable, NOT necessarily a bad build. A rollback
        // can't help — the previous shell loads the same URL and would fail
        // identically — and a failed rollback only makes it worse. Defer, leaving
        // the pending marker so a later (online) boot can confirm health or roll
        // back with real evidence. Give up only after MAX_OFFLINE_DEFERS boots, so
        // a build that genuinely never runs JS is still eventually recovered from.
        //
        // A deferral is NOT terminal, so it must NOT consume the `decided` token —
        // otherwise a later (online) `report_healthy` can never win the CAS and
        // promote this build, stranding `pending`/`installing` and the rollback
        // target until the next reboot (weeks, on 24/7 signage).
        if !alive.load(Ordering::SeqCst) {
            state.post_update_attempts += 1;
            if state.post_update_attempts < MAX_OFFLINE_DEFERS {
                if healthy.load(Ordering::SeqCst) {
                    return; // a promotion is racing in at the wire; don't clobber it
                }
                let _ = write_state(&app, &state); // keep pending; record the attempt
                return;
            }
            // Deferred too many times — fall through to a terminal rollback.
        }

        // Terminal decision (roll back / flag unhealthy): exactly one of this thread
        // and `report_healthy` may act on the pending update.
        if decided
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return; // report_healthy won the race under the wire
        }
        // Re-check under the decision: report_healthy may have stored healthy=true
        // after our load but before we won the CAS. Don't roll back a build that
        // just reported healthy at the wire.
        if healthy.load(Ordering::SeqCst) {
            return;
        }

        // Either the page loaded but never got healthy (the update broke the
        // running app) or we've deferred too many times — roll back.
        poison(&mut state, &current);
        // The update is being abandoned — clear the sentinel before rolling back
        // (Windows `rollback_to` may `exit(0)` before returning).
        clear_updating_sentinel(&app);
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

    // `UpdaterState` JSON round-trip / back-compat / `write_atomic` tests moved to
    // `state.rs` alongside the code they cover.

    #[cfg(desktop)]
    #[test]
    fn committed_updater_config_and_pubkey_parse() {
        // The pubkey format wrangling (base64-of-file → key line → verifier) is the
        // riskiest part of manifest auth; pin it against the real committed pubkey.
        let (endpoint, pubkey_b64) = updater_config().expect("config must read");
        assert!(!endpoint.is_empty(), "endpoint present");
        parse_pubkey(&pubkey_b64).expect("committed pubkey must parse into a verifier");
    }

    #[cfg(desktop)]
    #[test]
    fn verify_manifest_accepts_a_real_signature_and_rejects_tampering() {
        // Fixtures from the exact prod path: `tauri signer generate` + `tauri signer
        // sign`. Both the pubkey and the `.sig` are base64-of-the-minisign-FILE, so
        // `verify_manifest` MUST base64-decode the sig before parsing. Omitting that
        // decode (the shipped regression) made every prod install fail closed — and
        // was invisible because the dev endpoint is http, so the caller skips this
        // path entirely. This test exercises it directly.
        const PUBKEY: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDUyNzM0RENBOTdDNDU0OEIKUldTTFZNU1h5azF6VXU5MDZ0VTZ5RW9ZcEp4TUFzeDVyaFlyS2VTeE5hSlBGMHlQb29OalhVRTUK";
        const SIG: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVTTFZNU1h5azF6VXNnZ1VxcjdsTmU3TGs3QkxhS1BSekVvdXQvem10MW5mVTJFeUQrSFF5Ky91VVVOUGt1RFpKalhWUUFWcWV1cnZWM09KL3h1TGRDb1lBSGdyaWIveUFvPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzg1MTA5MDUwCWZpbGU6bGF0ZXN0Lmpzb24KK1FBTThPMTcybFFEdFRkN2JFclpxTmRMNTJrTVF4MXNDWVRZaVp3K1Q4cTZ4R3lQNnRDN05keFFJTS92di9EM2FZdkJLSFdERmphZG5wc3VkYjN2QWc9PQo=";
        const MANIFEST: &[u8] = br#"{"version":"9.9.9"}"#;

        // The genuine (manifest, sig, key) triplet must verify.
        verify_manifest(MANIFEST, SIG, PUBKEY).expect("a real tauri signature must verify");

        // A tampered manifest must fail — this is the signed-downgrade / R2-MITM
        // defense the whole function exists for.
        assert!(
            verify_manifest(br#"{"version":"9.9.99"}"#, SIG, PUBKEY).is_err(),
            "tampered manifest must not verify"
        );

        // Malformed inputs fail cleanly (no panic on the unattended path).
        assert!(verify_manifest(MANIFEST, "not-base64-!!!", PUBKEY).is_err());
    }

    #[test]
    fn poison_is_idempotent_and_blocks_reinstall() {
        let mut state = UpdaterState::default();
        assert!(!is_poisoned(&state, "0.2.0"));
        poison(&mut state, "0.2.0");
        poison(&mut state, "0.2.0"); // idempotent
        assert!(is_poisoned(&state, "0.2.0"));
        assert_eq!(state.poisoned_versions, vec!["0.2.0".to_string()]);
        // A genuine fix under a new version is not blocked.
        assert!(!is_poisoned(&state, "0.3.0"));
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
}
