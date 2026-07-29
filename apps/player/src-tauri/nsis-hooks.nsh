; NSIS installer hooks for the SignageWall Player (Tauri v2 `bundle.windows.nsis.installerHooks`).
;
; The sidecar was called `edge-watchdog.exe` up to 0.1.0. Both names appear below
; on purpose: a box updating off an older build still has the old process running
; and the old file sitting in the install dir. Leaving that file behind is not
; cosmetic — the watchdog's last-resort player lookup picks "the one executable
; next to me", and a stale sidecar is exactly that. Drop these two lines once no
; install older than the rename can still be in the field.
!macro NSIS_HOOK_PREINSTALL
  nsExec::Exec 'taskkill /F /IM edge-watchdog.exe'
  nsExec::Exec 'taskkill /F /IM signagewall-watchdog.exe'
  Delete "$INSTDIR\edge-watchdog.exe"
!macroend

; On uninstall, tear down the keep-alive supervision so the uninstaller isn't
; fighting a watchdog that keeps respawning the player: remove the Scheduled Task
; and stop the watchdog process. Best-effort — a missing task / process is fine.
!macro NSIS_HOOK_PREUNINSTALL
  nsExec::Exec 'schtasks /Delete /TN "SignageWallPlayerWatchdog" /F'
  nsExec::Exec 'taskkill /F /IM signagewall-watchdog.exe'
  nsExec::Exec 'taskkill /F /IM edge-watchdog.exe'
!macroend
