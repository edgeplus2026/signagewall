/**
 * Boot-time bridge between the ASYNC native stores and the SYNCHRONOUS identity
 * ladder in `device.ts`. Must run before anything reads the deviceId (i.e.
 * before `getDeviceId()`/`connectPlayer()` in `app.tsx`), so the id the socket
 * sends is the recovered native one, not a freshly-minted UUID.
 */
import { readLocalDeviceId, seedDeviceId } from '../device'
import { getUrlDeviceId } from '../recovery'
import { reportError } from '../sentry'
import { getShellVersion, loadShellVersion } from './runtime'
import { readNativeDeviceId, setNativeDeviceId } from './device-store'
import { hasNativeBridge } from './host'
import { checkForUpdate, loadUpdateState } from './updater'

/**
 * Minimum native shell version this web bundle assumes. The web app auto-updates
 * in seconds (PWA), while the shell updates slowly and can roll back — so the web
 * routinely runs ahead of the shell. Bump this in lockstep whenever you add a Rust
 * command the web calls: an older/rolled-back shell that lacks it would otherwise
 * no-op silently (`nativeInvoke` swallows the rejection to `undefined`), hiding
 * the skew across the whole fleet. A too-old shell is surfaced loudly instead.
 */
const MIN_SHELL_VERSION = '0.1.0'

/** Compares dotted numeric versions: <0 if a<b, 0 if equal/unparseable, >0 if a>b. */
function compareShellVersions(a: string, b: string): number {
  const pa = a.split('.')
  const pb = b.split('.')
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const da = Number.parseInt(pa[i] ?? '0', 10)
    const db = Number.parseInt(pb[i] ?? '0', 10)
    if (Number.isNaN(da) || Number.isNaN(db)) {
      return 0 // unparseable (e.g. a pre-release tag) — don't cry wolf
    }
    if (da !== db) {
      return da - db
    }
  }
  return 0
}

/**
 * Resolves the device identity through the durability ladder
 * (native store → localStorage → URL → mint) and seeds it into the sync ladder.
 * No-op in a browser, where localStorage + the URL already govern identity.
 *
 * The key case is the FIRST boot after wrapping an already-paired device in the
 * shell: the native store is empty but localStorage holds the real id, so we
 * PROMOTE it into the native store — the device keeps its identity and never
 * re-pairs. Thereafter native wins, so a later WebView wipe recovers from it.
 *
 * Durability guard: we only WRITE the native store when the read said the store
 * is provably `absent`. If the read merely FAILED (IO error, corrupt file, hung
 * IPC) the store may still hold the real id — minting a fresh one and overwriting
 * it would permanently strand the paired screen. On an unreadable store we seed
 * identity for this session from the rest of the ladder but leave the store
 * untouched, so a later healthy boot can still recover the real id.
 */
export async function bootstrapNativeIdentity(): Promise<void> {
  if (!hasNativeBridge()) {
    return
  }

  const read = await readNativeDeviceId()
  if (read.status === 'present') {
    seedDeviceId(read.id)
    return
  }

  const local = readLocalDeviceId()

  if (read.status === 'unreadable') {
    // Do NOT write — the store may hold the real id. Use the best available
    // anchor for this session only; a fresh mint here would be in-memory-only.
    seedDeviceId(local ?? getUrlDeviceId() ?? crypto.randomUUID())
    return
  }

  // read.status === 'absent': the store is provably empty — safe to persist.
  if (local) {
    await setNativeDeviceId(local)
    seedDeviceId(local)
    return
  }

  const id = getUrlDeviceId() ?? crypto.randomUUID()
  await setNativeDeviceId(id)
  seedDeviceId(id)
}

/**
 * Loads native runtime facts (shell version + any prior rollback/failed-update
 * outcome) so the first heartbeat carries them, then kicks off a one-shot OTA
 * detection check. The two reads are independent, so they run concurrently; the
 * detection check is intentionally detached (not awaited) — its result only needs
 * to reach a later heartbeat, so a slow/unreachable endpoint never delays connect.
 */
export async function bootstrapNativeRuntime(): Promise<void> {
  if (!hasNativeBridge()) {
    return
  }
  await Promise.all([loadShellVersion(), loadUpdateState()])

  // Surface a shell that's too old for this web bundle loudly, rather than
  // letting the commands it lacks fail silently to `undefined`.
  const shell = getShellVersion()
  if (shell && compareShellVersions(shell, MIN_SHELL_VERSION) < 0) {
    reportError(
      new Error(
        `native shell ${shell} is older than the ${MIN_SHELL_VERSION} this web bundle requires`,
      ),
      { shellVersion: shell, minShellVersion: MIN_SHELL_VERSION },
    )
  }

  void checkForUpdate()
}
