; NSIS installer hooks for the EdgeRize Player (Tauri v2 `bundle.windows.nsis.installerHooks`).
;
; On uninstall, tear down the keep-alive supervision so the uninstaller isn't
; fighting a watchdog that keeps respawning the player: remove the Scheduled Task
; and stop the watchdog process. Best-effort — a missing task / process is fine.
!macro NSIS_HOOK_PREUNINSTALL
  nsExec::Exec 'schtasks /Delete /TN "EdgeRizePlayerWatchdog" /F'
  nsExec::Exec 'taskkill /F /IM edge-watchdog.exe'
!macroend
