/**
 * Host-agnostic native bridge. The same web bundle runs unchanged in a plain
 * browser, the Tauri desktop shell, or the Android WebView shell — this module
 * selects the right IPC transport (or none) and exposes the invoke helpers the
 * `native/*` modules use. Those modules speak only the 9 command strings; they
 * never know which host answered, and in a browser every call cleanly no-ops.
 *
 * Two transports today, both reaching the same command contract:
 *  - Tauri: `window.__TAURI__.core.invoke(cmd, args)` — see {@link tauriTransport}.
 *  - Android: `window.AndroidBridge.invoke(cmd, JSON.stringify(args))`, which
 *    returns a JSON envelope string `{ ok, value?, error? }`. The Kotlin
 *    `@JavascriptInterface` is synchronous, so we wrap the call in a Promise to
 *    match the Tauri transport's async contract (and honor the same timeout).
 *
 * This is the IPC parallel to `restart.ts`, which already selects a per-host
 * restart mechanism the same way.
 */
import { tauriTransport } from './tauri'

/** A native IPC transport: dispatch a command to the host shell. */
export interface NativeTransport {
  invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>
}

/** Envelope the Android bridge wraps every result in (mirrors Rust Ok/Err). */
interface AndroidEnvelope<T> {
  ok: boolean
  value?: T
  error?: string
}

/**
 * The Android transport: bridges the SYNCHRONOUS `@JavascriptInterface`
 * `invoke(cmd, argsJson): string` into the async {@link NativeTransport}. A
 * malformed envelope or an `ok:false` result rejects, so it flows through the
 * strict/lenient handling identically to a rejected Tauri command — crucially,
 * this keeps `get_device_id`'s "unreadable (reject) vs absent (value:null)"
 * distinction intact on Android too.
 */
function androidTransport(): NativeTransport | undefined {
  const bridge = window.AndroidBridge
  if (!bridge?.invoke) {
    return undefined
  }
  const invoke = bridge.invoke
  return {
    invoke: async <T>(
      cmd: string,
      args?: Record<string, unknown>,
    ): Promise<T> => {
      const raw = invoke(cmd, JSON.stringify(args ?? {}))
      const env = JSON.parse(raw) as AndroidEnvelope<T>
      if (!env.ok) {
        throw new Error(env.error ?? `${cmd} failed`)
      }
      return env.value as T
    },
  }
}

/**
 * The active native transport, or undefined in a plain browser. Tauri wins if
 * both somehow appear (they never do on one device). Read live off `window` on
 * every call so the transport stays stubbable in tests and reflects a shell that
 * injected its bridge after module load.
 */
export function getTransport(): NativeTransport | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  return tauriTransport() ?? androidTransport()
}

/** True when a native shell (Tauri OR Android) is servicing commands. */
export function hasNativeBridge(): boolean {
  return getTransport() !== undefined
}

/**
 * Invokes a native command. Returns `undefined` outside a native shell or on any
 * error (missing bridge, rejected command, malformed Android envelope), so
 * callers never have to guard the environment themselves.
 *
 * `timeoutMs` bounds the call: a native command that never resolves (blocking
 * file IO on a failing disk) would otherwise hang the awaiting caller forever —
 * on the boot path that means the device never reaches `connectPlayer`. On
 * timeout it resolves `undefined`, consistent with the "undefined on any
 * failure" contract.
 */
export async function nativeInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
  timeoutMs?: number,
): Promise<T | undefined> {
  const transport = getTransport()
  if (!transport) {
    return undefined
  }
  try {
    return await raceInvoke<T>(transport, cmd, args, timeoutMs)
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
  const transport = getTransport()
  if (!transport) {
    throw new Error('native bridge unavailable')
  }
  return raceInvoke<T>(transport, cmd, args, timeoutMs)
}

/**
 * Shared invoke-with-timeout, resolving the transport ONCE per call (callers pass
 * it in). NOTE: the timeout meaningfully bounds the async Tauri transport; the
 * Android bridge is a SYNCHRONOUS `@JavascriptInterface` that blocks the JS thread
 * for the call's duration, so the timer cannot interrupt a hung Android command —
 * Android relies on each handler being sub-millisecond (`DeviceIdStore` caches its
 * read so `get_device_id` never re-touches disk on the JS thread).
 */
async function raceInvoke<T>(
  transport: NativeTransport,
  cmd: string,
  args?: Record<string, unknown>,
  timeoutMs?: number,
): Promise<T> {
  const call = transport.invoke<T>(cmd, args)
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
