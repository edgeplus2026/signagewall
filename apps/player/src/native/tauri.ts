/**
 * Thin bridge to the Tauri native shell. Everything here degrades to a clean
 * no-op in a plain browser (or the CMS preview iframe), so the same web bundle
 * runs unchanged whether or not it is wrapped by the shell.
 *
 * We reach the IPC via the `window.__TAURI__` global (the shell sets
 * `withGlobalTauri: true`) rather than importing `@tauri-apps/api`, so the PWA
 * bundle never pulls in shell-only code. The `Window.__TAURI__` type is declared
 * in `../restart.ts`.
 */

/**
 * True when running inside the Tauri shell. Detected directly off the window
 * globals (not via `getPlatform()`) so this module has no import back into
 * `device.ts` — keeping the native layer free of import cycles.
 */
export function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  )
}

/**
 * Invokes a Rust command over the Tauri IPC. Returns `undefined` outside Tauri
 * or on any error (missing bridge, rejected command), so callers never have to
 * guard the environment themselves.
 */
export async function nativeInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T | undefined> {
  if (!isTauri()) {
    return undefined
  }
  try {
    const invoke = window.__TAURI__?.core?.invoke
    if (!invoke) {
      return undefined
    }
    return await invoke<T>(cmd, args)
  } catch {
    return undefined
  }
}
