//! `signagewall-watchdog` — out-of-process keep-alive supervisor for the desktop player.
//!
//! The player shell can crash, be killed, or HANG (WebView frozen: process alive,
//! gray/white screen). The in-process "refuse to close" guard covers none of
//! these, and autostart only recovers on the next boot. This tiny separate process
//! closes that gap: it keeps exactly one healthy player running, restarting it fast
//! on a crash and killing+respawning it on a hang — while deferring during an OTA
//! self-update so it never relaunches a stale binary mid-install.
//!
//! It is a RECONCILER, not a spawn-and-wait babysitter: each tick it reads the
//! shared on-disk signals (the player's liveness beat, the updater's state +
//! sentinel) and drives toward the invariant. That absorbs the two things a naive
//! supervisor gets wrong — the OTA installer relaunching the player out-of-band,
//! and the single-instance plugin bouncing a redundant spawn.
//!
//! It shares `paths.rs`/`state.rs` with the player via `#[path]` include (NOT the
//! Tauri lib), so it links no Tauri runtime and resolves the exact same files.
//! `#[allow(dead_code)]` on the includes: each process uses only a subset of the
//! shared helpers.

#[path = "../paths.rs"]
#[allow(dead_code)]
mod paths;
#[path = "../state.rs"]
#[allow(dead_code)]
mod state;

use std::fs;
use std::io::Write as _;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::thread::sleep;
use std::time::{Duration, Instant};

// --- Tunables (all env-overridable for on-device tuning) --------------------
const DEFAULT_CHECK_INTERVAL_SECS: u64 = 3;
/// Liveness older than this (with the process still alive) = a hang. Must be well
/// above the web beat interval (5s) so a GC pause / big image decode never trips it.
const DEFAULT_HANG_TIMEOUT_SECS: u64 = 30;
/// After we spawn, suppress hang-kill this long so the new page can boot and emit
/// its first beat (the liveness file is stale from the prior instance right after).
const DEFAULT_STARTUP_GRACE_SECS: u64 = 60;
/// While the updating sentinel is this fresh, defer: the installer owns the
/// process lifecycle (force-exit → replace → relaunch).
const DEFAULT_UPDATE_GRACE_SECS: u64 = 120;
/// Past this, a lingering sentinel is treated as stale and normal supervision
/// resumes — a missed clear can only cost this much, never disable recovery.
const DEFAULT_UPDATE_HANG_CAP_SECS: u64 = 360;
/// Cap on the rapid-failure backoff so a broken build can't spin at the tick rate.
const MAX_BACKOFF_SECS: u64 = 60;
/// A per-tick forward wall-clock step larger than this (beyond the monotonic elapsed
/// since the last tick) is treated as an NTP/RTC correction, not a hang — for that
/// one tick the liveness beat's age is spuriously large. Absorbs the "RTC-less box
/// boots with a wrong clock, NTP steps it forward" false-positive kill.
const CLOCK_JUMP_THRESHOLD_MS: u64 = 10_000;

struct Config {
    check_interval: Duration,
    hang_timeout_ms: u64,
    startup_grace_ms: u64,
    update_grace_ms: u64,
    update_hang_cap_ms: u64,
}

fn env_secs(key: &str, default: u64) -> u64 {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

impl Config {
    fn from_env() -> Self {
        Config {
            check_interval: Duration::from_secs(env_secs(
                "SIGNAGEWALL_WATCHDOG_CHECK_INTERVAL_SECS",
                DEFAULT_CHECK_INTERVAL_SECS,
            )),
            hang_timeout_ms: env_secs("SIGNAGEWALL_WATCHDOG_HANG_TIMEOUT_SECS", DEFAULT_HANG_TIMEOUT_SECS)
                * 1000,
            startup_grace_ms: env_secs(
                "SIGNAGEWALL_WATCHDOG_STARTUP_GRACE_SECS",
                DEFAULT_STARTUP_GRACE_SECS,
            ) * 1000,
            update_grace_ms: env_secs("SIGNAGEWALL_WATCHDOG_UPDATE_GRACE_SECS", DEFAULT_UPDATE_GRACE_SECS)
                * 1000,
            update_hang_cap_ms: env_secs(
                "SIGNAGEWALL_WATCHDOG_UPDATE_HANG_CAP_SECS",
                DEFAULT_UPDATE_HANG_CAP_SECS,
            ) * 1000,
        }
    }
}

// --- The pure decision (unit-tested — this is the brains) -------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Action {
    /// Everything is fine (or the updater owns the lifecycle) — do nothing.
    Nothing,
    /// No player is running — start one (crash/kill respawn, or verify-pending).
    Spawn,
    /// A player is running but hung — kill it, then start a fresh one.
    KillAndRespawn,
}

#[derive(Debug, Clone, Copy)]
struct Inputs {
    /// An OTA install is in its defer window (sentinel present and fresh).
    updating: bool,
    /// The sentinel is present but past the grace window (installer should have
    /// relaunched by now) and within the hard cap — the verify-pending window.
    update_grace_elapsed: bool,
    /// A player process is running (our child, a fresh beat, or a live PID).
    player_present: bool,
    /// The liveness beat is within `HANG_TIMEOUT` — the player is rendering.
    liveness_fresh: bool,
    /// We spawned a player recently; suppress hang-kill until it can beat.
    within_startup_grace: bool,
}

fn decide(i: Inputs) -> Action {
    if i.updating {
        // The installer/OTA path is deliberately cycling the process. Never kill
        // on staleness here (don't fight the OTA health-watchdog/rollback).
        if i.player_present {
            return Action::Nothing;
        }
        // No player during an update: wait for the installer to relaunch; only
        // once the grace window elapses do we launch it ourselves — the
        // verify-pending recovery that closes the Windows "installer reinstalled
        // but never relaunched" gap.
        return if i.update_grace_elapsed {
            Action::Spawn
        } else {
            Action::Nothing
        };
    }

    if !i.player_present {
        return Action::Spawn; // crash/kill respawn
    }
    if i.liveness_fresh {
        return Action::Nothing; // healthy (covers a player we didn't spawn)
    }
    if i.within_startup_grace {
        return Action::Nothing; // still booting; first beat not sent yet
    }
    Action::KillAndRespawn // process alive but not beating → hang
}

// --- Process + IO helpers ---------------------------------------------------

/// Best-effort append to `watchdog.log`, plus stderr (captured by launchd / the
/// Scheduled Task). Never panics.
fn log(msg: &str) {
    let line = format!("[{}] {msg}\n", state::now_ms());
    eprint!("{line}");
    if let Some(path) = paths::watchdog_log_path() {
        if let Some(dir) = path.parent() {
            let _ = fs::create_dir_all(dir);
        }
        if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(&path) {
            let _ = f.write_all(line.as_bytes());
        }
    }
}

/// True if a process with this PID is alive. Cheap and dependency-free: it only
/// runs when the liveness beat is stale (rare), so a small process spawn is fine.
#[cfg(unix)]
fn is_pid_alive(pid: u32) -> bool {
    // `kill -0` sends no signal; it succeeds iff the process exists and we may
    // signal it. Good enough to tell "alive" from "gone" for our own children.
    Command::new("kill")
        .arg("-0")
        .arg(pid.to_string())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

#[cfg(windows)]
fn is_pid_alive(pid: u32) -> bool {
    match Command::new("tasklist")
        .args(["/FI", &format!("PID eq {pid}"), "/NH", "/FO", "CSV"])
        .output()
    {
        Ok(out) => String::from_utf8_lossy(&out.stdout).contains(&pid.to_string()),
        Err(_) => false,
    }
}

/// Force-kills an externally-running player (installer-relaunched or manually
/// started) that we have no `Child` handle for. Image-name is a fallback for PID
/// reuse.
#[cfg(unix)]
fn kill_pid(pid: u32, _image: &str) {
    let _ = Command::new("kill").arg("-9").arg(pid.to_string()).status();
}

#[cfg(windows)]
fn kill_pid(pid: u32, image: &str) {
    if Command::new("taskkill")
        .args(["/F", "/PID", &pid.to_string()])
        .status()
        .map(|s| !s.success())
        .unwrap_or(true)
        && !image.is_empty()
    {
        let _ = Command::new("taskkill").args(["/F", "/IM", image]).status();
    }
}

/// Resolves the player executable to supervise:
///  1. `SIGNAGEWALL_WATCHDOG_PLAYER_EXE` (test/override escape hatch),
///  2. `watchdog/player.json` written by the player at startup (the real path),
///  3. fallback: the sole other executable next to us in the install dir.
fn resolve_player_exe() -> Option<PathBuf> {
    if let Ok(over) = std::env::var("SIGNAGEWALL_WATCHDOG_PLAYER_EXE") {
        let p = PathBuf::from(over);
        if p.exists() {
            return Some(p);
        }
    }
    if let Some(info) = paths::player_info_path().and_then(|p| state::read_player_info(&p)) {
        let exe = PathBuf::from(&info.exe_path);
        if exe.exists() {
            return Some(exe);
        }
    }
    fallback_scan_install_dir()
}

/// Last resort before the player has ever written `player.json`: the one
/// executable next to the watchdog in the install dir that isn't the watchdog.
fn fallback_scan_install_dir() -> Option<PathBuf> {
    let me = std::env::current_exe().ok()?;
    let dir = me.parent()?;
    for entry in fs::read_dir(dir).ok()?.flatten() {
        let path = entry.path();
        if path == me || !path.is_file() {
            continue;
        }
        if is_executable(&path) {
            return Some(path);
        }
    }
    None
}

#[cfg(unix)]
fn is_executable(path: &std::path::Path) -> bool {
    use std::os::unix::fs::PermissionsExt as _;
    fs::metadata(path)
        .map(|m| m.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

#[cfg(windows)]
fn is_executable(path: &std::path::Path) -> bool {
    path.extension().map(|e| e == "exe").unwrap_or(false)
}

fn spawn_player(exe: &std::path::Path) -> Option<Child> {
    match Command::new(exe).spawn() {
        Ok(child) => {
            log(&format!(
                "spawned player pid={} ({})",
                child.id(),
                exe.display()
            ));
            Some(child)
        }
        Err(e) => {
            log(&format!("spawn failed ({}): {e}", exe.display()));
            None
        }
    }
}

/// Best-effort single-instance lock: if a live watchdog already owns the lock,
/// exit. The OS supervisor (launchd label / one Scheduled Task) is the primary
/// guarantee; this just avoids two managers fighting if both somehow start.
fn acquire_lock() {
    let Some(path) = paths::watchdog_lock_path() else {
        return;
    };
    if let Some(dir) = path.parent() {
        let _ = fs::create_dir_all(dir);
    }
    if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(pid) = raw.trim().parse::<u32>() {
            if pid != std::process::id() && is_pid_alive(pid) {
                log(&format!("another watchdog is live (pid={pid}); exiting"));
                std::process::exit(0);
            }
        }
    }
    let _ = state::write_atomic(&path, std::process::id().to_string().as_bytes());
}

// --- Main reconcile loop ----------------------------------------------------

fn main() {
    let cfg = Config::from_env();
    acquire_lock();
    log("signagewall-watchdog started");

    let mut child: Option<Child> = None;
    // Grace + backoff timing is MONOTONIC (Instant), immune to wall-clock/NTP steps
    // that would otherwise make a healthy player look hung or the first launch look
    // like a crash loop. `started` covers the pre-first-spawn grace for whatever was
    // already running; `last_spawn` is Some only after we actually launch a player.
    let started = Instant::now();
    let mut last_spawn: Option<Instant> = None;
    // Verify-pending is one-shot per update cycle (re-armed when the sentinel's
    // timestamp changes, or when our launched player exits), so a broken post-update
    // boot doesn't spin-spawn.
    let mut verify_pending_done_for: Option<u64> = None;
    let mut consecutive_failures: u32 = 0;
    // Detect forward wall-clock steps by comparing wall vs monotonic per tick.
    let mut prev_wall = state::now_ms();
    let mut prev_mono = Instant::now();

    loop {
        let tick_mono = Instant::now();
        let now = state::now_ms();

        // Forward wall-clock step (RTC-less box + NTP): if wall advanced far more
        // than the monotonic clock since the last tick, the liveness beat's age is
        // spuriously large — grant a one-tick hang-kill grace so a healthy player
        // survives. Self-clears on the next beat (written with the corrected clock).
        let mono_delta = tick_mono.saturating_duration_since(prev_mono).as_millis() as u64;
        let clock_jumped =
            now.saturating_sub(prev_wall) > mono_delta.saturating_add(CLOCK_JUMP_THRESHOLD_MS);
        prev_wall = now;
        prev_mono = tick_mono;

        // Reap our child if it exited, so `child_alive` is accurate.
        let child_alive = match child.as_mut() {
            Some(c) => matches!(c.try_wait(), Ok(None)),
            None => false,
        };
        if !child_alive {
            if child.is_some() {
                // A player WE launched has exited — re-arm one-shot verify-pending so
                // a crashed post-update launch is retried (under backoff) instead of
                // sitting dark until the sentinel hits the hard cap.
                verify_pending_done_for = None;
            }
            child = None;
        }

        let liveness = paths::liveness_path().and_then(|p| state::read_liveness(&p));
        let liveness_fresh = liveness
            .as_ref()
            .map(|l| now.saturating_sub(l.ts_ms) < cfg.hang_timeout_ms)
            .unwrap_or(false);
        // Presence vs freshness are distinct. Freshness alone can't prove a player
        // is HERE — a just-crashed process leaves a recent but orphaned beat. So a
        // player is present iff we own a live child, or the beat's PID is actually
        // alive (an external / installer-relaunched player). This makes a crash
        // respawn immediate instead of waiting out the hang timeout, while a hang
        // is still caught (present + stale) and a live external player is adopted.
        // The PID probe only runs when we don't own a live child (off steady state).
        let player_present = if child_alive {
            true
        } else {
            liveness
                .as_ref()
                .map(|l| is_pid_alive(l.pid))
                .unwrap_or(false)
        };

        // OTA window from the timestamped sentinel (self-expiring).
        let sentinel = paths::updating_sentinel_path().and_then(|p| state::read_sentinel(&p));
        let (updating, update_grace_elapsed) = match &sentinel {
            Some(s) => {
                let age = now.saturating_sub(s.started_at_ms);
                if age < cfg.update_grace_ms {
                    (true, false)
                } else if age < cfg.update_hang_cap_ms {
                    (true, true) // verify-pending window
                } else {
                    (false, false) // stale sentinel — resume normal supervision
                }
            }
            None => (false, false),
        };

        // One-shot verify-pending: suppress a repeat launch for the same sentinel.
        let sentinel_started = sentinel.as_ref().map(|s| s.started_at_ms);
        let verify_pending_suppressed =
            update_grace_elapsed && verify_pending_done_for == sentinel_started;

        // Monotonic grace (falls back to process start before the first spawn), plus
        // the one-tick clock-jump grace so an NTP step never reads as a hang.
        let grace_elapsed_ms = last_spawn
            .map(|t| t.elapsed())
            .unwrap_or_else(|| started.elapsed())
            .as_millis() as u64;
        let within_startup_grace = clock_jumped || grace_elapsed_ms < cfg.startup_grace_ms;

        let action = decide(Inputs {
            updating,
            update_grace_elapsed: update_grace_elapsed && !verify_pending_suppressed,
            player_present,
            liveness_fresh,
            within_startup_grace,
        });

        let mut sleep_for = cfg.check_interval;
        match action {
            Action::Nothing => {
                if player_present && liveness_fresh {
                    consecutive_failures = 0; // healthy — reset the backoff
                }
            }
            Action::Spawn | Action::KillAndRespawn => {
                if action == Action::KillAndRespawn {
                    log("player hung (process alive, liveness stale) — killing");
                    if let Some(mut c) = child.take() {
                        let _ = c.kill();
                        let _ = c.wait();
                    } else if let Some(l) = &liveness {
                        let image = paths::player_info_path()
                            .and_then(|p| state::read_player_info(&p))
                            .map(|i| i.image_name)
                            .unwrap_or_default();
                        kill_pid(l.pid, &image);
                    }
                }

                match resolve_player_exe() {
                    Some(exe) => {
                        // Rapid-failure backoff: only a REAL prior spawn that died
                        // within startup grace counts as a crash loop — the first
                        // launch (last_spawn == None) never backs off.
                        if let Some(t) = last_spawn {
                            if (t.elapsed().as_millis() as u64) < cfg.startup_grace_ms {
                                consecutive_failures = consecutive_failures.saturating_add(1);
                                let backoff = (cfg.check_interval.as_secs()
                                    * 2u64.saturating_pow(consecutive_failures.min(6)))
                                .min(MAX_BACKOFF_SECS);
                                sleep_for =
                                    Duration::from_secs(backoff.max(cfg.check_interval.as_secs()));
                                log(&format!(
                                    "rapid restart #{consecutive_failures}; backing off {}s",
                                    sleep_for.as_secs()
                                ));
                            }
                        }
                        child = spawn_player(&exe);
                        last_spawn = Some(Instant::now());
                        if update_grace_elapsed {
                            verify_pending_done_for = sentinel_started;
                            log("verify-pending: launched player after update grace");
                        }
                    }
                    None => log("cannot resolve player exe (no player.json / override / sibling)"),
                }
            }
        }

        sleep(sleep_for);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> Inputs {
        Inputs {
            updating: false,
            update_grace_elapsed: false,
            player_present: true,
            liveness_fresh: true,
            within_startup_grace: false,
        }
    }

    #[test]
    fn healthy_player_is_left_alone() {
        assert_eq!(decide(base()), Action::Nothing);
    }

    #[test]
    fn no_player_respawns() {
        let i = Inputs {
            player_present: false,
            liveness_fresh: false,
            ..base()
        };
        assert_eq!(decide(i), Action::Spawn);
    }

    #[test]
    fn hung_player_is_killed_and_respawned() {
        let i = Inputs {
            liveness_fresh: false,
            within_startup_grace: false,
            ..base()
        };
        assert_eq!(decide(i), Action::KillAndRespawn);
    }

    #[test]
    fn stale_liveness_within_startup_grace_waits() {
        let i = Inputs {
            liveness_fresh: false,
            within_startup_grace: true,
            ..base()
        };
        assert_eq!(decide(i), Action::Nothing);
    }

    #[test]
    fn updating_with_player_never_touches_it() {
        // Even a hung-looking player is left alone during the OTA window.
        let i = Inputs {
            updating: true,
            liveness_fresh: false,
            within_startup_grace: false,
            ..base()
        };
        assert_eq!(decide(i), Action::Nothing);
    }

    #[test]
    fn updating_no_player_within_grace_waits_for_installer() {
        let i = Inputs {
            updating: true,
            update_grace_elapsed: false,
            player_present: false,
            liveness_fresh: false,
            ..base()
        };
        assert_eq!(decide(i), Action::Nothing);
    }

    #[test]
    fn updating_no_player_after_grace_does_verify_pending_launch() {
        let i = Inputs {
            updating: true,
            update_grace_elapsed: true,
            player_present: false,
            liveness_fresh: false,
            ..base()
        };
        assert_eq!(decide(i), Action::Spawn);
    }
}
