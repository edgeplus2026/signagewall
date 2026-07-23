import { getPlatform } from './device'

/**
 * Optional native bridges a host shell may expose to restart the whole process
 * (a plain `location.reload()` only reloads the web view, not the native app).
 * They are optional: on the web none exist and we fall back to a reload.
 */
declare global {
  interface Window {
    /**
     * Android WebView JS interface — the Kotlin shell's `@JavascriptInterface`
     * host, exposed on `window` at document-start. `restart` relaunches the app;
     * `invoke` is the synchronous IPC transport (returns a JSON envelope string,
     * bridged to a Promise in `native/host.ts`); `setKioskLock` drives the native
     * lockdown mode. All optional so the same bundle runs in a plain browser.
     */
    AndroidBridge?: {
      restart?: () => void
      invoke?: (cmd: string, argsJson: string) => string
      setKioskLock?: (mode: string) => void
    }
    /** Electron preload-exposed API. */
    electronAPI?: { restart?: () => void }
    /**
     * Tauri runtime globals (exposed because the shell sets
     * `withGlobalTauri: true`). Declared here as the single home for the
     * `__TAURI__` shape; the native layer (`native/*`) reaches IPC through it.
     */
    __TAURI__?: {
      process?: { relaunch?: () => void | Promise<void> }
      core?: {
        invoke?: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
      }
      app?: { getVersion?: () => Promise<string> }
    }
  }
}

/**
 * Restarts the player using the mechanism appropriate to the host platform,
 * always falling back to a web reload. Detection is best-effort: if a native
 * bridge is advertised but its call throws, we still reload so the player never
 * gets stuck on a stale page.
 */
export function restartPlayer(): void {
  const platform = getPlatform()

  try {
    switch (platform) {
      case 'android-webview':
        if (window.AndroidBridge?.restart) {
          window.AndroidBridge.restart()
          return
        }
        break
      case 'electron':
        if (window.electronAPI?.restart) {
          window.electronAPI.restart()
          return
        }
        break
      case 'tauri':
        if (window.__TAURI__?.process?.relaunch) {
          void window.__TAURI__.process.relaunch()
          return
        }
        break
      default:
        break
    }
  } catch {
    // Native bridge failed — fall through to a plain reload.
  }

  reload()
}

/** Hard reload of the current page (extracted so tests can spy on it). */
function reload(): void {
  window.location.reload()
}
