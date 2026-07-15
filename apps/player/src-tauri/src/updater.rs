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
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};

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
    /// SHA-256 (hex) of `last_good_installer` at the moment it was promoted
    /// healthy. Re-checked before the rollback executes that cached file, so a
    /// locally-swapped payload is refused rather than run as the kiosk user.
    #[serde(rename = "lastGoodSha256", default)]
    pub last_good_sha256: Option<String>,
    /// Version just installed and awaiting a health confirmation on next boot.
    #[serde(rename = "pendingVersion")]
    pub pending_version: Option<String>,
    /// Last reported outcome, surfaced to the CMS via `get_update_state`.
    #[serde(rename = "lastResult")]
    pub last_result: Option<String>,
    /// Whether the last boot rolled back a failed update.
    #[serde(rename = "rolledBack")]
    pub rolled_back: Option<bool>,
    /// Count of consecutive post-update boots that could not confirm health
    /// because the WebView never even loaded the remote page (device offline).
    /// The watchdog defers rollback while this is small — a rollback can't help an
    /// offline device — but rolls back once it crosses [`MAX_OFFLINE_DEFERS`], so
    /// a build that never runs JS is still eventually recovered from.
    #[serde(rename = "postUpdateAttempts", default)]
    pub post_update_attempts: u32,
    /// Versions that already failed their health check on THIS device. Never
    /// auto-installed again: without this a rolled-back build is re-detected,
    /// re-downloaded, re-installed and re-rolled-back every off-hours window
    /// forever (flapping the screen, burning fleet-wide R2 bandwidth). A genuine
    /// fix ships under a new, un-poisoned version and still installs.
    #[serde(rename = "poisonedVersions", default)]
    pub poisoned_versions: Vec<String>,
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
    fs::rename(&tmp, path)?;
    // Make the rename itself durable. Without fsyncing the directory the entry
    // update can be lost on a power cut even though `rename` already returned —
    // losing the just-written rollback state or the durable deviceId, the exact
    // "torn write" this function exists to prevent. Best-effort and platform
    // gated: a directory handle can't be fsynced this way on Windows (where NTFS
    // journals metadata anyway); macOS (dev/test) and Linux get the guarantee.
    #[cfg(unix)]
    if let Some(parent) = path.parent() {
        if let Ok(dir) = fs::File::open(parent) {
            let _ = dir.sync_all();
        }
    }
    Ok(())
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

    let pubkey = parse_pubkey(&pubkey_b64)?;
    let sig = minisign_verify::Signature::decode(&sig_text)
        .map_err(|e| format!("malformed manifest signature: {e}"))?;
    pubkey
        .verify(&manifest, &sig, false)
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
        if decided
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return; // report_healthy won the race under the wire
        }
        // Re-check under the decision: report_healthy may have stored healthy=true
        // after our initial load but before we won the CAS. Don't roll back a
        // build that just reported healthy at the wire.
        if healthy.load(Ordering::SeqCst) {
            return;
        }

        let mut state = read_state(&app);

        // The page never loaded (no `report_alive`): the device is offline / the
        // remote origin is unreachable, NOT necessarily a bad build. A rollback
        // can't help — the previous shell loads the same URL and would fail
        // identically — and a failed rollback only makes it worse. Defer, leaving
        // the pending marker so a later (online) boot can confirm health or roll
        // back with real evidence. Give up only after MAX_OFFLINE_DEFERS boots, so
        // a build that genuinely never runs JS is still eventually recovered from.
        if !alive.load(Ordering::SeqCst) {
            state.post_update_attempts += 1;
            if state.post_update_attempts < MAX_OFFLINE_DEFERS {
                let _ = write_state(&app, &state); // keep pending; just record the attempt
                return;
            }
        }

        // Either the page loaded but never got healthy (the update broke the
        // running app) or we've deferred too many times — roll back.
        poison(&mut state, &current);
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
            last_good_sha256: Some("deadbeef".into()),
            pending_version: Some("0.2.0".into()),
            last_result: Some("installing".into()),
            rolled_back: Some(false),
            post_update_attempts: 2,
            poisoned_versions: vec!["0.2.0".into()],
        };
        let raw = serde_json::to_string(&state).unwrap();
        assert!(raw.contains("lastGoodVersion"), "camelCase keys: {raw}");
        assert!(raw.contains("poisonedVersions"), "camelCase keys: {raw}");
        let back: UpdaterState = serde_json::from_str(&raw).unwrap();
        assert_eq!(state, back);
    }

    #[cfg(desktop)]
    #[test]
    fn committed_updater_config_and_pubkey_parse() {
        // The pubkey format wrangling (base64-of-file → key line → verifier) is the
        // riskiest part of manifest auth; pin it against the real committed pubkey.
        let (endpoint, pubkey_b64) = updater_config().expect("config must read");
        assert!(!endpoint.is_empty(), "endpoint present");
        parse_pubkey(&pubkey_b64).expect("committed pubkey must parse into a verifier");
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
    fn missing_poisoned_field_deserializes_to_empty() {
        // Older state.json written before the field existed must still load.
        let back: UpdaterState = serde_json::from_str(r#"{"pendingVersion":"0.2.0"}"#).unwrap();
        assert!(back.poisoned_versions.is_empty());
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
