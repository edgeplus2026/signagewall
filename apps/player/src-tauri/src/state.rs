//! On-disk state types + atomic IO shared by the player shell and the standalone
//! `edge-watchdog` supervisor.
//!
//! Everything here is pure `std` + `serde` — NO Tauri — so the watchdog binary
//! can include this file via `#[path = "../state.rs"] mod state;` without linking
//! the Tauri runtime. The two processes share only the on-disk JSON contract
//! (never live instances): the player writes, the watchdog reads.
//!
//! Writers must stay disciplined: `state.json` and the updating sentinel are
//! written ONLY by `updater.rs` (single-writer + a `decided` CAS); the watchdog
//! treats them as read-only. The liveness/player-info files are written by the
//! player shell and read by the watchdog.

use std::fs;
use std::io::Write as _;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

/// Milliseconds since the Unix epoch. `0` if the clock is before the epoch
/// (never, in practice) — callers only ever compare two such stamps for staleness.
pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Persisted updater state (`app_config_dir/updates/state.json`). Moved here from
/// `updater.rs` so the watchdog can read `pendingVersion` without a Tauri handle.
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
    /// offline device — but rolls back once it crosses `MAX_OFFLINE_DEFERS`, so
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

/// Reads `state.json`, defaulting on absent/corrupt (matches the old
/// `updater::read_state` behaviour, minus the AppHandle).
pub fn read_state_at(path: &Path) -> UpdaterState {
    match fs::read_to_string(path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        Err(_) => UpdaterState::default(),
    }
}

/// Writes `state.json` atomically (pretty JSON to match the existing on-disk shape).
pub fn write_state_at(path: &Path, state: &UpdaterState) -> std::io::Result<()> {
    let raw = serde_json::to_string_pretty(state)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    write_atomic(path, raw.as_bytes())
}

/// Timestamped "an OTA install is in progress" sentinel (`updates/updating.json`).
///
/// Written by `run_update` right before the process is force-exited/restarted for
/// the install, and best-effort cleared once the new build reports healthy. The
/// watchdog reads it to distinguish an intentional updater restart from a crash:
/// while it is present AND fresh (`started_at_ms` within the watchdog's grace
/// window) the watchdog must not treat a vanished player as a crash. It is
/// **timestamped** so it self-expires — a missed clear can only defer recovery by
/// the grace window, never disable it forever.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct UpdatingSentinel {
    #[serde(rename = "startedAtMs")]
    pub started_at_ms: u64,
    pub version: String,
}

pub fn read_sentinel(path: &Path) -> Option<UpdatingSentinel> {
    serde_json::from_str(&fs::read_to_string(path).ok()?).ok()
}

pub fn write_sentinel(path: &Path, sentinel: &UpdatingSentinel) -> std::io::Result<()> {
    let raw = serde_json::to_string_pretty(sentinel)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    write_atomic(path, raw.as_bytes())
}

/// Best-effort remove — the sentinel self-expires by timestamp, so a failed
/// delete is not fatal.
pub fn clear_sentinel(path: &Path) {
    let _ = fs::remove_file(path);
}

/// Web-JS liveness beat (`watchdog/liveness.json`). The player rewrites it every
/// few seconds FROM the web layer, so a frozen WebView (process alive, JS stalled)
/// stops advancing it — the signal the watchdog uses to detect a hang. Carries the
/// PID so the watchdog can kill an externally-relaunched player it has no `Child`
/// handle for.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct LivenessRecord {
    pub pid: u32,
    #[serde(rename = "ts")]
    pub ts_ms: u64,
}

pub fn read_liveness(path: &Path) -> Option<LivenessRecord> {
    serde_json::from_str(&fs::read_to_string(path).ok()?).ok()
}

pub fn write_liveness(path: &Path, rec: &LivenessRecord) -> std::io::Result<()> {
    let raw = serde_json::to_string(rec)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    write_atomic(path, raw.as_bytes())
}

/// What the player reported about itself (`watchdog/player.json`), written once at
/// startup. Lets the watchdog spawn/kill exactly the on-disk binary the player is,
/// instead of hardcoding an install-name that only Windows can confirm.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct PlayerInfo {
    #[serde(rename = "exePath")]
    pub exe_path: String,
    #[serde(rename = "imageName")]
    pub image_name: String,
}

pub fn read_player_info(path: &Path) -> Option<PlayerInfo> {
    serde_json::from_str(&fs::read_to_string(path).ok()?).ok()
}

pub fn write_player_info(path: &Path, info: &PlayerInfo) -> std::io::Result<()> {
    let raw = serde_json::to_string_pretty(info)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    write_atomic(path, raw.as_bytes())
}

/// Writes atomically: temp file in the same dir → fsync → rename. A plain
/// `fs::write` truncates in place, so a power cut mid-write (routine on these
/// devices) would leave a torn file that silently parses back as defaults —
/// losing the rollback target, or worse, the durable deviceId.
pub fn write_atomic(path: &Path, data: &[u8]) -> std::io::Result<()> {
    // Unique temp name per writer. A fixed `foo.tmp` breaks under concurrency: the
    // OTA install path, the health-watchdog thread and `report_healthy` can all
    // write the same state file, and two writers sharing one temp would truncate
    // each other's in-flight file — the second `rename` then hits ENOENT, or the
    // survivor holds interleaved bytes, voiding the very atomicity this exists for.
    use std::sync::atomic::{AtomicU64, Ordering};
    static NONCE: AtomicU64 = AtomicU64::new(0);
    let nonce = NONCE.fetch_add(1, Ordering::Relaxed);
    let name = path
        .file_name()
        .map(|f| f.to_string_lossy().into_owned())
        .unwrap_or_else(|| "state".into());
    let tmp = path.with_file_name(format!(".{name}.tmp.{}.{nonce}", std::process::id()));

    // On any failure after create, remove the temp so a partial write never leaks
    // (unique names don't self-heal by being reused the way the old fixed name did).
    if let Err(e) = write_tmp_then_rename(&tmp, path, data) {
        let _ = fs::remove_file(&tmp);
        return Err(e);
    }

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

/// Temp-file body of [`write_atomic`]: write + fsync the data into `tmp`, then
/// rename it over `path`. Split out so the caller can delete `tmp` on any error.
fn write_tmp_then_rename(tmp: &Path, path: &Path, data: &[u8]) -> std::io::Result<()> {
    {
        let mut file = fs::File::create(tmp)?;
        file.write_all(data)?;
        file.sync_all()?;
    }
    fs::rename(tmp, path)
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn sentinel_round_trips() {
        let s = UpdatingSentinel {
            started_at_ms: 1_700_000_000_000,
            version: "0.2.0".into(),
        };
        let raw = serde_json::to_string(&s).unwrap();
        assert!(raw.contains("startedAtMs"), "camelCase: {raw}");
        assert_eq!(read_sentinel_from_str(&raw), Some(s));
    }

    // Small helper so the round-trip test doesn't need a temp file.
    fn read_sentinel_from_str(raw: &str) -> Option<UpdatingSentinel> {
        serde_json::from_str(raw).ok()
    }

    #[test]
    fn liveness_and_player_info_round_trip() {
        let lv = LivenessRecord {
            pid: 4321,
            ts_ms: 1_700_000_000_000,
        };
        let back: LivenessRecord =
            serde_json::from_str(&serde_json::to_string(&lv).unwrap()).unwrap();
        assert_eq!(lv, back);

        let pi = PlayerInfo {
            exe_path: "/Applications/EdgeRize Player.app/edge-player".into(),
            image_name: "edge-player".into(),
        };
        let raw = serde_json::to_string(&pi).unwrap();
        assert!(
            raw.contains("exePath") && raw.contains("imageName"),
            "camelCase: {raw}"
        );
        let back: PlayerInfo = serde_json::from_str(&raw).unwrap();
        assert_eq!(pi, back);
    }

    #[test]
    fn write_atomic_replaces_the_target_in_place() {
        // PID-suffixed: this file is also `#[path]`-included by the watchdog bin,
        // so its tests run in a second test process — a shared dir name would race.
        let dir =
            std::env::temp_dir().join(format!("edge-player-atomic-test-{}", std::process::id()));
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

    #[test]
    fn read_and_write_state_at_round_trip() {
        let dir =
            std::env::temp_dir().join(format!("edge-player-state-at-test-{}", std::process::id()));
        let _ = fs::create_dir_all(&dir);
        let target = dir.join("state.json");
        let state = UpdaterState {
            pending_version: Some("0.3.0".into()),
            last_result: Some("installing".into()),
            ..Default::default()
        };
        write_state_at(&target, &state).unwrap();
        assert_eq!(read_state_at(&target), state);
        // Absent file → default.
        assert_eq!(
            read_state_at(&dir.join("nope.json")),
            UpdaterState::default()
        );
        let _ = fs::remove_dir_all(&dir);
    }
}
