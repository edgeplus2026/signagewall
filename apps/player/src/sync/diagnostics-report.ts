/**
 * Assembles the on-demand diagnostics report — the remote equivalent of walking up
 * to a screen and opening its service menu.
 *
 * Sent only when the CMS asks. The shell's event log is kilobytes and almost
 * always uninteresting; pushing it on every heartbeat would cost a fleet real
 * bandwidth to say "nothing happened" several times a minute.
 *
 * The sender is registered by the socket layer rather than imported from it, for
 * the same reason `playback-bus` exists: the command handler and the socket would
 * otherwise import each other. A report assembled before the socket registers has
 * nowhere to go and is quietly dropped, which is correct — there is no connection
 * to answer on.
 */
import { collectDiagnostics } from '../diagnostics'
import { readShellLog } from '../native/service'
import type { DiagnosticsReport } from '../types'

type Sender = (report: DiagnosticsReport) => void

let send: Sender | null = null

export function registerDiagnosticsSender(next: Sender): () => void {
  send = next
  return () => {
    if (send === next) {
      send = null
    }
  }
}

/**
 * The log is capped here rather than at the shell, because this is the boundary
 * where the size starts to matter: past this point it is stored per device and
 * rendered in a browser. The shell keeps far more for a technician standing at
 * the screen with the whole file in front of them.
 */
const MAX_LOG_LINES = 200

export async function reportDiagnostics(): Promise<void> {
  const [diagnostics, log] = await Promise.all([
    collectDiagnostics(),
    readShellLog(),
  ])
  send?.({
    ...diagnostics,
    ...(log.length > 0 ? { log: log.slice(-MAX_LOG_LINES) } : {}),
    at: new Date().toISOString(),
  })
}
