/**
 * Tauri-specific detection + transport. `isTauri()` answers "is this the Tauri
 * shell?" (used by `getPlatform()` to report the platform); `tauriTransport()`
 * is the Tauri leg of the host-agnostic IPC seam in `./host`. Both degrade to a
 * clean absence outside Tauri, so the same web bundle runs unchanged whether or
 * not it is wrapped by the shell.
 *
 * We reach IPC via the `window.__TAURI__` global (the shell sets
 * `withGlobalTauri: true`) rather than importing `@tauri-apps/api`, so the PWA
 * bundle never pulls in shell-only code. The `Window.__TAURI__` type is declared
 * in `../restart.ts`.
 */
import type { NativeTransport } from './host'

/**
 * True when running inside the Tauri shell. Detected directly off the window
 * globals (not via `getPlatform()`) so this module has no import back into
 * `device.ts` — keeping the native layer free of import cycles.
 *
 * Deliberately distinct from `host.hasNativeBridge()`, which is true for ANY
 * native shell (Tauri OR Android): this one stays Tauri-only so `getPlatform()`
 * keeps reporting the host honestly (an Android WebView must not report `tauri`).
 */
export function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  )
}

/**
 * The Tauri leg of the {@link NativeTransport} seam: reaches the Rust commands
 * through `window.__TAURI__.core.invoke`. Returns undefined when the global is
 * absent (plain browser, the CMS preview iframe, or a `__TAURI__` shell that
 * hasn't exposed `core.invoke`), so `host.getTransport()` falls through to the
 * next transport. Assumes `window` exists — `host.getTransport()` guards that.
 */
export function tauriTransport(): NativeTransport | undefined {
  const invoke = window.__TAURI__?.core?.invoke
  if (!invoke) {
    return undefined
  }
  return {
    invoke: <T>(cmd: string, args?: Record<string, unknown>) =>
      invoke<T>(cmd, args),
  }
}
