/**
 * Bounds a diagnostics report before it is stored.
 *
 * The report is deliberately schemaless: it is written by a player that may be
 * several versions ahead of this backend, and a strict shape would drop exactly
 * the field that explains a new kind of fault. But "we do not know the shape" is
 * not the same as "we accept anything" — without a ceiling, one player build with
 * a runaway string writes it into a device document on every request, and the
 * failure lands on the database rather than on the build that caused it.
 *
 * So: unknown fields survive, but only as bounded scalars, and only so many. The
 * shape is the device's business; the size is ours.
 *
 * A pure function, separate from the service, because this is the one piece of
 * that flow with rules worth testing — and the service around it needs a whole
 * mock harness to instantiate.
 */

/** Entries kept from the shell's log. The device already trims; this does not trust that. */
export const MAX_LOG_LINES = 200;
/** Characters per log line — long enough for a stack frame, short of a payload. */
export const MAX_LINE_CHARS = 500;
/** Characters for any other string in the report. */
export const MAX_STRING_CHARS = 500;
/**
 * Fields beyond the ones this backend knows about. Enough for a newer player to
 * carry a few new readings, far short of it dumping a structure.
 */
export const MAX_EXTRA_FIELDS = 20;

/** Field names this backend understands; everything else counts as an extra. */
const KNOWN_FIELDS = new Set([
  // Shell-channel fields — the same bounding applies, because the same rule does:
  // the shape is the device's business, the size is ours.
  'shellVersion',
  'pageAlive',
  'cachedMedia',
  'totalMedia',
  'cacheComplete',
  'freeDiskBytes',
  'serviceWorkerControlled',
  'recoveries',
  'lastCrash',
  'lastCrashAt',
  'log',
  'at',
]);

type Scalar = string | number | boolean;

/**
 * One value, bounded. Objects and arrays-of-objects are dropped rather than
 * walked: a nested structure is the shape that grows without limit, and nothing
 * in a diagnostics report needs one.
 */
function boundValue(value: unknown): Scalar | string[] | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  // Rejects NaN and Infinity, which serialise to null and read as a missing
  // measurement rather than as the broken one they are.
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    return value.slice(0, MAX_STRING_CHARS);
  }
  if (Array.isArray(value)) {
    return value
      .slice(-MAX_LOG_LINES)
      .filter((entry): entry is Scalar => typeof entry !== 'object')
      .map((entry) => String(entry).slice(0, MAX_LINE_CHARS));
  }
  return undefined;
}

/**
 * Returns the report as it should be stored: known fields bounded, a limited
 * number of unknown ones carried through, everything else dropped.
 */
export function boundDiagnosticsReport(
  report: Record<string, unknown>,
): Record<string, unknown> {
  const bounded: Record<string, unknown> = {};
  let extras = 0;

  for (const [key, value] of Object.entries(report)) {
    const known = KNOWN_FIELDS.has(key);
    if (!known) {
      if (extras >= MAX_EXTRA_FIELDS) {
        continue;
      }
      extras += 1;
    }

    const safe = boundValue(value);
    if (safe !== undefined) {
      bounded[key] = safe;
    }
  }

  return bounded;
}
