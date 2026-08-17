import * as Sentry from '@sentry/browser'

import { config } from './config'
import { readLocalDeviceId } from './device'

/**
 * Share of screens that report errors at all.
 *
 * A fault in the player is almost never one screen's fault — a bad web deploy, a
 * broken clip, an unreachable CDN hits the whole fleet within a minute, and every
 * device sends the same stack. At a thousand screens that is a thousand identical
 * events for one bug, which buries the rare single-screen fault that actually
 * needs a human and burns the quota that would have caught it.
 *
 * The choice is made ONCE PER DEVICE (see {@link deviceSampled}) rather than per
 * event: a screen that reports is a screen whose whole story is legible, instead
 * of every screen contributing a tenth of a narrative each.
 *
 * It defaults to 1 — report everything — because the right rate depends on how
 * many screens there are, and no build knows that. A handful of screens must not
 * silently lose nine tenths of their faults; a fleet of thousands turns
 * `VITE_SENTRY_SAMPLE_RATE` down when the duplicates start costing more than they
 * tell.
 */
const ERROR_SAMPLE_RATE = ((): number => {
  const raw = Number(import.meta.env.VITE_SENTRY_SAMPLE_RATE)
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 1
})()

/**
 * Whether THIS device is in the reporting sample — stable for the life of the
 * install, derived from the device id so it needs no storage and no coordination,
 * and so the same screens keep reporting across reloads.
 *
 * Deliberately reads the persisted id WITHOUT minting one. `getDeviceId()` would
 * create and store a fresh UUID when localStorage is empty, and this runs before
 * the native bootstrap — so it would beat the native store and the `?device=`
 * URL to the punch and quietly disable identity recovery on exactly the devices
 * that need it. A device with no id yet reports unconditionally: it is a first
 * boot, which is when a fault is most worth hearing about.
 */
function deviceSampled(): boolean {
  if (ERROR_SAMPLE_RATE >= 1) {
    return true
  }
  const id = readLocalDeviceId()
  if (!id) {
    return true
  }
  let hash = 0
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return (hash % 1000) / 1000 < ERROR_SAMPLE_RATE
}

/**
 * Memoized sampling decision. Evaluated on the FIRST report rather than at init,
 * because init runs before the identity ladder has settled — by the time anything
 * has an error to report, `bootstrapNativeIdentity` has seeded the real id.
 */
let sampled: boolean | undefined

function sampledIn(): boolean {
  sampled ??= deviceSampled()
  return sampled
}

/**
 * Crash/exception visibility for screens we can't physically inspect. No-op
 * unless a DSN is configured, so local/dev runs stay quiet.
 */
export function initSentry(): void {
  if (!config.sentryDsn) {
    return
  }

  // Init unconditionally: it opens no connection until an event is captured, and
  // the sampling decision cannot be made yet (see `sampledIn`). `reportError` is
  // the gate.
  Sentry.init({
    dsn: config.sentryDsn,
    release: `signagewall-player@${config.appVersion}`,
    tracesSampleRate: 0,
  })
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (config.sentryDsn && sampledIn()) {
    Sentry.captureException(error, context ? { extra: context } : undefined)
  } else {
    // Not sampled in (or no DSN): the console still carries it, which is what a
    // technician on `chrome://inspect` reads, and what the shell's own log picks
    // up. Nothing is lost locally — only the fleet-wide duplicate is.
    console.error('[player]', error, context)
  }
}
