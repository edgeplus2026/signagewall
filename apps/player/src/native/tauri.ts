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
 *
 * `timeoutMs` bounds the call: a native command that never resolves (blocking
 * file IO on a failing config disk) would otherwise hang the awaiting caller
 * forever — on the boot path that means the device never reaches `connectPlayer`.
 * On timeout it resolves `undefined`, consistent with the "undefined on any
 * failure" contract.
 */
export async function nativeInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
  timeoutMs?: number,
): Promise<T | undefined> {
  if (!isTauri()) {
    return undefined
  }
  try {
    return await nativeInvokeStrict<T>(cmd, args, timeoutMs)
  } catch {
    return undefined
  }
}

/**
 * Like {@link nativeInvoke} but SURFACES failures (throws) instead of swallowing
 * them to `undefined`. Callers that must tell "the command failed" apart from "it
 * returned nothing" — e.g. the identity read, where the difference decides
 * whether it is safe to overwrite the durable store — use this. Honors the same
 * `timeoutMs` (a hang rejects rather than hanging the caller).
 */
export async function nativeInvokeStrict<T>(
  cmd: string,
  args?: Record<string, unknown>,
  timeoutMs?: number,
): Promise<T> {
  const invoke = window.__TAURI__?.core?.invoke
  if (!invoke) {
    throw new Error('native bridge unavailable')
  }
  const call = invoke<T>(cmd, args)
  if (timeoutMs === undefined) {
    return await call
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      call,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${cmd} timed out`)),
          timeoutMs,
        )
      }),
    ])
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  }
}
