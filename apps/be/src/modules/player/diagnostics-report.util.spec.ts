import {
  boundDiagnosticsReport,
  MAX_EXTRA_FIELDS,
  MAX_LINE_CHARS,
  MAX_LOG_LINES,
  MAX_STRING_CHARS,
} from './diagnostics-report.util';

describe('boundDiagnosticsReport', () => {
  it('keeps the readings a report is for', () => {
    expect(
      boundDiagnosticsReport({
        cachedMedia: 18,
        totalMedia: 20,
        cacheComplete: false,
        freeDiskBytes: 1_812_912_000,
        serviceWorkerControlled: true,
        at: '2026-08-17T01:02:03.000Z',
      }),
    ).toEqual({
      cachedMedia: 18,
      totalMedia: 20,
      cacheComplete: false,
      freeDiskBytes: 1_812_912_000,
      serviceWorkerControlled: true,
      at: '2026-08-17T01:02:03.000Z',
    });
  });

  it('keeps the NEWEST log entries and trims each one', () => {
    // Marker FIRST: truncation cuts the tail, so a marker at the end would be
    // invisible to the assertion and the test would prove nothing.
    const log = Array.from({ length: 500 }, (_, i) => `${i} ${'x'.repeat(900)}`);

    const bounded = boundDiagnosticsReport({ log }) as { log: string[] };

    expect(bounded.log).toHaveLength(MAX_LOG_LINES);
    expect(bounded.log[0]?.length).toBe(MAX_LINE_CHARS);
    // Dropping the old end, not the new: the last thing that happened is the
    // reason anyone asked for the log at all.
    expect(bounded.log.at(-1)?.startsWith('499 ')).toBe(true);
    expect(bounded.log[0]?.startsWith('300 ')).toBe(true);
  });

  it('carries a newer player’s unknown fields, up to a limit', () => {
    const report: Record<string, unknown> = { cachedMedia: 1 };
    for (let i = 0; i < MAX_EXTRA_FIELDS + 15; i += 1) {
      report[`future${String(i)}`] = i;
    }

    const bounded = boundDiagnosticsReport(report);
    const extras = Object.keys(bounded).filter((k) => k.startsWith('future'));

    // A field this backend has never heard of is exactly what explains a new
    // kind of fault, so some survive — but not an unbounded number.
    expect(extras.length).toBe(MAX_EXTRA_FIELDS);
    expect(bounded.cachedMedia).toBe(1);
  });

  it('truncates a runaway string in any field, known or not', () => {
    const bounded = boundDiagnosticsReport({
      lastCrash: 'e'.repeat(10_000),
      somethingNew: 'f'.repeat(10_000),
    });

    expect((bounded.lastCrash as string).length).toBe(MAX_STRING_CHARS);
    expect((bounded.somethingNew as string).length).toBe(MAX_STRING_CHARS);
  });

  it('drops nested structures rather than walking them', () => {
    // The shape that grows without limit, and the one thing a diagnostics
    // report never needs.
    const bounded = boundDiagnosticsReport({
      cachedMedia: 2,
      nested: { deep: { deeper: Array.from({ length: 1000 }, () => 'x') } },
      listOfObjects: [{ a: 1 }, { b: 2 }],
    });

    expect(bounded).toEqual({ cachedMedia: 2, listOfObjects: [] });
  });

  it('drops a non-finite number instead of storing null', () => {
    // NaN and Infinity serialise to null, which reads as "the device did not
    // measure this" — the opposite of what a broken reading means.
    const bounded = boundDiagnosticsReport({
      freeDiskBytes: Number.NaN,
      cachedMedia: Number.POSITIVE_INFINITY,
      totalMedia: 20,
    });

    expect(bounded).toEqual({ totalMedia: 20 });
  });

  it('returns an empty report rather than throwing on an empty one', () => {
    expect(boundDiagnosticsReport({})).toEqual({});
  });
});
