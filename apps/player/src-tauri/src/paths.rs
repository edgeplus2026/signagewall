//! Filesystem paths shared by the player shell and the standalone `edge-watchdog`
//! supervisor.
//!
//! The watchdog has no Tauri runtime, so it cannot call `app.path().app_config_dir()`.
//! It resolves the very same locations here from `dirs::config_dir()` + the app
//! identifier — which is exactly how Tauri v2 computes `app_config_dir()`. The
//! player's `setup()` pins this parity with a `debug_assert_eq!`, so any future
//! divergence fails loudly in dev/CI on every platform rather than silently
//! pointing the two processes at different files.
//!
//! Leaf file/dir names live here as single-sourced constants so the writer (the
//! player, via an AppHandle-derived dir) and the reader (the watchdog, via
//! [`config_root`]) can never disagree on a filename.

use std::path::PathBuf;

/// The Tauri app identifier (`tauri.conf.json` → `identifier`). `app_config_dir()`
/// is `dirs::config_dir()/<identifier>`, so this must match the config verbatim.
pub const APP_IDENTIFIER: &str = "com.edgerize.player";

/// Updater subdir + files (owned by `updater.rs`; the watchdog only reads them).
pub const UPDATES_SUBDIR: &str = "updates";
pub const STATE_FILE: &str = "state.json";
/// Timestamped "an OTA install is in progress" sentinel (see `state::UpdatingSentinel`).
pub const SENTINEL_FILE: &str = "updating.json";

/// Watchdog subdir + files (the liveness/player handshake between the two processes).
pub const WATCHDOG_SUBDIR: &str = "watchdog";
pub const LIVENESS_FILE: &str = "liveness.json";
pub const PLAYER_INFO_FILE: &str = "player.json";
pub const LOCK_FILE: &str = "watchdog.lock";
pub const LOG_FILE: &str = "watchdog.log";

/// `dirs::config_dir()/<identifier>` — byte-identical to Tauri v2 `app_config_dir()`.
/// `None` only if the OS config dir can't be resolved (no `$HOME`, etc.).
pub fn config_root() -> Option<PathBuf> {
    Some(dirs::config_dir()?.join(APP_IDENTIFIER))
}

pub fn updates_dir() -> Option<PathBuf> {
    Some(config_root()?.join(UPDATES_SUBDIR))
}

pub fn state_path() -> Option<PathBuf> {
    Some(updates_dir()?.join(STATE_FILE))
}

pub fn updating_sentinel_path() -> Option<PathBuf> {
    Some(updates_dir()?.join(SENTINEL_FILE))
}

pub fn watchdog_dir() -> Option<PathBuf> {
    Some(config_root()?.join(WATCHDOG_SUBDIR))
}

pub fn liveness_path() -> Option<PathBuf> {
    Some(watchdog_dir()?.join(LIVENESS_FILE))
}

pub fn player_info_path() -> Option<PathBuf> {
    Some(watchdog_dir()?.join(PLAYER_INFO_FILE))
}

pub fn watchdog_lock_path() -> Option<PathBuf> {
    Some(watchdog_dir()?.join(LOCK_FILE))
}

pub fn watchdog_log_path() -> Option<PathBuf> {
    Some(watchdog_dir()?.join(LOG_FILE))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_path_hangs_under_config_root() {
        // If the OS gives us a config dir at all, every derived path must be a
        // descendant of it — the invariant the watchdog relies on to find the
        // exact files the player wrote.
        let Some(root) = config_root() else {
            return; // no config dir on this host (e.g. no $HOME in CI sandbox)
        };
        for p in [
            updates_dir().unwrap(),
            state_path().unwrap(),
            updating_sentinel_path().unwrap(),
            watchdog_dir().unwrap(),
            liveness_path().unwrap(),
            player_info_path().unwrap(),
            watchdog_lock_path().unwrap(),
            watchdog_log_path().unwrap(),
        ] {
            assert!(p.starts_with(&root), "{p:?} must hang under {root:?}");
        }
    }

    #[test]
    fn config_root_ends_with_the_identifier() {
        if let Some(root) = config_root() {
            assert!(root.ends_with(APP_IDENTIFIER));
        }
    }
}
