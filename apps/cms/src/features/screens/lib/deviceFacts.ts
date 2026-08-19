import type { ScreenDevice } from '@/features/screens/types/screen.types'

/**
 * Where a displayed number actually came from.
 *
 * The same fact reaches the CMS by up to three routes, and the backend keeps them
 * deliberately unmerged (`player.service.ts`: "Deliberately alongside `profile`,
 * never merged into it") because their disagreement is itself diagnostic. The
 * display may merge them — but it has to say which one it picked, or an operator
 * reading "0 recoveries" cannot tell a healthy screen from a silent one.
 */
export type FactSource =
  /** The player page's heartbeat. Freshest while the page is alive; stale the moment it is not. */
  | 'page'
  /** The shell's own five-minute check-in. The only route that still answers when the page is dead. */
  | 'shell'
  /** The last on-demand diagnostics report, which the CMS asked for explicitly. */
  | 'report'

export interface Fact<T> {
  value: T
  source: FactSource
}

/**
 * Merges the REST snapshot with live socket presence.
 *
 * The subtlety that used to be a bug: `profile` is a whole object, so spreading
 * presence over the snapshot replaced it wholesale. Presence entries are rebuilt
 * from socket pushes carrying only `appVersion`, `shellVersion` and
 * `updateStatus.lastResult`, and the presence map is re-seeded only when the socket
 * (re)connects — so every other telemetry field silently froze at whatever the page
 * held on first load, and refetching the device query could not move it. Merging
 * field-wise is what makes a refetch mean anything; do not "fix" the staleness by
 * adding a refetch interval, that was never the problem.
 */
export function mergeDeviceSnapshot(
  snapshot: ScreenDevice | null | undefined,
  presence: ScreenDevice | null | undefined,
): ScreenDevice | undefined {
  const base = presence ?? snapshot
  if (!base) return undefined
  const merged = {
    ...snapshot,
    ...presence,
    paired: base.paired,
    online: base.online,
  }
  const profile = mergeOptional(snapshot?.profile, presence?.profile)
  if (!profile) return merged
  return {
    ...merged,
    profile: {
      ...profile,
      // Taken WHOLE from whichever source has it, never field-merged like the rest.
      // `lastResult` and `availableVersion` describe one moment, and merging them let
      // a version from an older state survive under a newer outcome — the "Up to
      // date -> 0.1.7" seen on a screen actually running 0.1.8. Presence wins when
      // it is there, being the fresher of the two.
      ...withOptional(
        'updateStatus',
        presence?.profile?.updateStatus ?? snapshot?.profile?.updateStatus,
      ),
      // Diagnostics DO merge field-wise: they are independent readings that arrive
      // on different channels, not one indivisible statement.
      ...withOptional(
        'diagnostics',
        mergeOptional(snapshot?.profile?.diagnostics, presence?.profile?.diagnostics),
      ),
    },
  }
}

/**
 * Merges two optional objects, and stays `undefined` when both are.
 *
 * Materialising an empty object instead would quietly turn every `!device.profile`
 * test in the app into a permanent false — "reported nothing" and "reported an empty
 * report" are not the same claim about a screen.
 */
function mergeOptional<T extends object>(a: T | undefined, b: T | undefined): T | undefined {
  if (!a) return b
  if (!b) return a
  return { ...a, ...b }
}

/** Spreads a key only when there is something to put in it. */
function withOptional<K extends string, T>(key: K, value: T | undefined): Partial<Record<K, T>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, T>)
}

/**
 * Whether the shell's copy of a fact should be trusted over the page's.
 *
 * True exactly when the page is not talking: its numbers then describe whatever
 * was true before it stopped, which is the situation an operator is most likely to
 * be investigating and least served by a stale answer.
 */
function preferShell(device: ScreenDevice | undefined): boolean {
  return !device?.online || device.shellStatus?.pageAlive === false
}

function pick<T>(
  device: ScreenDevice | undefined,
  page: T | undefined,
  shell: T | undefined,
  report: T | undefined,
): Fact<T> | undefined {
  const order: [T | undefined, FactSource][] = preferShell(device)
    ? [
        [shell, 'shell'],
        [page, 'page'],
        [report, 'report'],
      ]
    : [
        [page, 'page'],
        [shell, 'shell'],
        [report, 'report'],
      ]
  for (const [value, source] of order) {
    if (value !== undefined && value !== null) return { value, source }
  }
  return undefined
}

/**
 * The native shell's version, from whichever channel can still speak.
 *
 * Three sources existed and two were never rendered. It mattered most in the one
 * case the shell channel was built for: with the page dead, the page-reported
 * version is frozen at whatever ran before the failure — so the CMS showed a
 * version the device had already moved off.
 */
export function shellVersionOf(device: ScreenDevice | undefined): Fact<string> | undefined {
  return pick(
    device,
    // Both page-sourced, so they share the 'page' provenance: `updateStatus`
    // travels on the same heartbeat, and captioning it "from the last report" —
    // which means the on-demand diagnostics report — named the wrong channel.
    device?.profile?.shellVersion ?? device?.profile?.updateStatus?.currentVersion ?? undefined,
    device?.shellStatus?.shellVersion,
    undefined,
  )
}

/**
 * The other shell version, when the two channels disagree.
 *
 * A disagreement is not noise: it means the page has not reloaded since the shell
 * updated itself, which is a real fault worth naming rather than hiding behind
 * whichever value happened to win.
 */
export function shellVersionDisagreement(device: ScreenDevice | undefined): string | undefined {
  const page = device?.profile?.shellVersion
  const shell = device?.shellStatus?.shellVersion
  if (!page || !shell || page === shell) return undefined
  return preferShell(device) ? page : shell
}

/**
 * Free bytes, with the shell's "unknown" sentinel filtered out.
 *
 * `PlayerApp.freeDiskBytes()` answers `-1` when `StatFs` refused to measure, and the
 * web layer's own `freeDiskBytes()` has always dropped it for exactly that reason.
 * The shell-channel copy arrives raw, so without the same guard `formatFreeSpace(-1)`
 * renders "0 MB" — a device nobody could measure would be reported as one with
 * nothing left. Worst of all, the shell is the PREFERRED source precisely when the
 * page is offline and there is no second opinion available.
 */
export function freeDiskOf(device: ScreenDevice | undefined): Fact<number> | undefined {
  const known = (bytes: number | undefined) =>
    bytes !== undefined && bytes >= 0 ? bytes : undefined
  return pick(
    device,
    known(device?.profile?.diagnostics?.freeDiskBytes),
    known(device?.shellStatus?.freeDiskBytes),
    known(device?.diagnostics?.freeDiskBytes),
  )
}

export function recoveriesOf(device: ScreenDevice | undefined): Fact<number> | undefined {
  return pick(
    device,
    device?.profile?.diagnostics?.recoveries,
    device?.shellStatus?.recoveries,
    device?.diagnostics?.recoveries,
  )
}

export interface CrashFact {
  message: string
  at?: number | undefined
}

export function lastCrashOf(device: ScreenDevice | undefined): Fact<CrashFact> | undefined {
  const page = device?.profile?.diagnostics
  const shell = device?.shellStatus
  const report = device?.diagnostics
  return pick<CrashFact>(
    device,
    page?.lastCrash ? { message: page.lastCrash, at: page.lastCrashAt } : undefined,
    shell?.lastCrash ? { message: shell.lastCrash, at: shell.lastCrashAt } : undefined,
    report?.lastCrash ? { message: report.lastCrash, at: report.lastCrashAt } : undefined,
  )
}

/**
 * "1.8 GB free" — gigabytes above a gigabyte, megabytes below it. A signage box
 * down to its last few hundred megabytes is exactly when the difference between
 * 0.4 and 0.04 GB decides whether someone drives out, and a rounded "0.4 GB"
 * hides it.
 */
export function formatFreeSpace(bytes: number): string {
  const gb = bytes / 1024 ** 3
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${String(Math.round(bytes / 1024 ** 2))} MB`
}
