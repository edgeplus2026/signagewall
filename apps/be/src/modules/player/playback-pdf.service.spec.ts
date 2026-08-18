import type { ConfigService } from '@nestjs/config';

import {
  PlaybackPdfService,
  verifyUrl,
  type DocumentFigures,
} from './playback-pdf.service';
import type {
  CoverageReport,
  PlaybackItemsReport,
} from './playback-report.service';

function buildService(
  key: string | undefined = 'signing-key',
  config: Record<string, string | undefined> = {},
) {
  return new PlaybackPdfService({
    get: (name: string) => (name in config ? config[name] : key),
  } as unknown as ConfigService);
}

function report(
  overrides: Partial<PlaybackItemsReport> = {},
): PlaybackItemsReport {
  return {
    from: '2026-08-01',
    to: '2026-08-17',
    items: [
      {
        contentId: 'c1',
        name: 'Letnja akcija',
        plays: 120,
        airtimeMs: 1_800_000,
        screens: 2,
        screenNames: ['Lobby', 'Izlog'],
        share: 50,
      },
    ],
    totals: { plays: 240, airtimeMs: 3_600_000 },
    truncated: false,
    ...overrides,
  };
}

function coverage(overrides: Partial<CoverageReport> = {}): CoverageReport {
  return {
    day: '2026-08-17',
    coverage: 0,
    screens: [],
    exceptions: [
      {
        screenId: 's1',
        screenName: 'Android TV',
        kind: 'off',
        fromHour: 0,
        toHour: 24,
        durationMs: 86_400_000,
      },
    ],
    totals: { plays: 0, airtimeMs: 0, screens: 2 },
    truncated: false,
    ...overrides,
  };
}

function figures(overrides: Partial<DocumentFigures> = {}): DocumentFigures {
  return { organizationName: 'Vecom', items: report(), ...overrides };
}

describe('PlaybackPdfService', () => {
  it('produces a PDF', async () => {
    const { bytes } = await buildService().render({
      organizationName: 'Vecom',
      items: report(),
    });

    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });

  it('renders Serbian names instead of failing on them', async () => {
    // The standard PDF fonts cannot encode č/ć/š/ž/đ and pdf-lib throws on the
    // first one — which would mean the export failing for exactly the customers
    // this was built for.
    await expect(
      buildService().render({
        organizationName: 'Šećerana d.o.o.',
        items: report({
          items: [
            {
              contentId: 'c1',
              name: 'Đačka užina — čokolada',
              plays: 3,
              airtimeMs: 1000,
              screens: 1,
              screenNames: ['Kasa'],
              share: 100,
            },
          ],
        }),
      }),
    ).resolves.toBeDefined();
  });

  it('signs the same numbers the same way every time', async () => {
    const first = await buildService().render({
      organizationName: 'Vecom',
      items: report(),
    });
    const second = await buildService().render({
      organizationName: 'Vecom',
      items: report(),
    });

    // A document re-issued from the same data has to verify against the copy the
    // client already holds.
    expect(second.digest).toBe(first.digest);
    expect(second.signature).toBe(first.signature);
  });

  it('ignores presentation and row order when digesting', () => {
    const service = buildService();
    const rows = report().items;
    const reversed = report({
      items: [
        ...rows,
        {
          contentId: 'c0',
          name: 'Second',
          plays: 1,
          airtimeMs: 1,
          screens: 1,
          screenNames: [],
          share: 0,
        },
      ],
    });
    const sameDataOtherOrder = report({
      items: [reversed.items[1], reversed.items[0]],
    });

    expect(service.digest(figures({ items: sameDataOtherOrder }))).toBe(
      service.digest(figures({ items: reversed })),
    );
  });

  it('stops matching when a number is changed', () => {
    const service = buildService();
    const original = service.digest(figures());
    const edited = service.digest(
      figures({
        items: report({ totals: { plays: 999_999, airtimeMs: 3_600_000 } }),
      }),
    );

    expect(edited).not.toBe(original);
    // The signature travels with the document, so an altered figure fails the
    // check even though the signature itself was copied across intact.
    expect(service.verify(edited, service.sign(original))).toBe(false);
  });

  it('accepts only signatures made with its own key', () => {
    const ours = buildService();
    const theirs = buildService('someone-elses-key');
    const digest = ours.digest(figures());

    expect(ours.verify(digest, ours.sign(digest))).toBe(true);
    expect(ours.verify(digest, theirs.sign(digest))).toBe(false);
  });

  it('still signs when no key is configured, and says so', () => {
    const warn = jest
      .spyOn(
        (buildService() as unknown as { logger: { warn: jest.Mock } }).logger,
        'warn',
      )
      .mockImplementation(() => undefined);
    const service = buildService(undefined);
    const digest = service.digest(figures());

    // Working out of the box matters more than refusing; being loud about it in
    // the log is what keeps an unsigned installation from going unnoticed.
    expect(service.verify(digest, service.sign(digest))).toBe(true);
    warn.mockRestore();
  });

  it('covers the coverage headline, not just the table', () => {
    // The percentage, the screen count and the exception list are all printed
    // as findings of fact, and the foot of the page promises that an altered
    // figure stops matching. A digest built from `items` alone left every one of
    // them editable with the signature still checking out.
    const service = buildService();
    const base = service.digest(figures({ coverage: coverage() }));

    expect(
      service.digest(figures({ coverage: coverage({ coverage: 98 }) })),
    ).not.toBe(base);
    expect(
      service.digest(
        figures({
          coverage: coverage({
            totals: { plays: 0, airtimeMs: 0, screens: 9 },
          }),
        }),
      ),
    ).not.toBe(base);
    expect(
      service.digest(figures({ coverage: coverage({ exceptions: [] }) })),
    ).not.toBe(base);
    // A report with no coverage block is not the same document as one whose
    // coverage happens to be zero.
    expect(service.digest(figures())).not.toBe(base);
  });

  it('covers whose report it is', () => {
    const service = buildService();

    expect(service.digest(figures({ organizationName: 'Edge+' }))).not.toBe(
      service.digest(figures({ organizationName: 'Someone Else' })),
    );
  });

  it('does not depend on the order exceptions come back in', () => {
    const service = buildService();
    const a = {
      screenId: 's1',
      screenName: 'Android TV',
      kind: 'off' as const,
      fromHour: 0,
      toHour: 24,
      durationMs: 1000,
    };
    const b = { ...a, screenId: 's2', screenName: 'web' };

    expect(
      service.digest(figures({ coverage: coverage({ exceptions: [a, b] }) })),
    ).toBe(
      service.digest(figures({ coverage: coverage({ exceptions: [b, a] }) })),
    );
  });

  it('prints an address the recipient can actually open', () => {
    // The reader is an advertiser holding a PDF, not somebody who can guess an
    // API prefix — and the route sits behind one.
    expect(verifyUrl('https://api.signagewall.com/', 'api')).toBe(
      'https://api.signagewall.com/api/v1/playback/verify',
    );
  });

  it('falls back to a path rather than a URL that goes nowhere', () => {
    expect(verifyUrl(undefined, 'api')).toBe('/api/v1/playback/verify');
    expect(verifyUrl(undefined, undefined)).toBe('/api/v1/playback/verify');
  });

  it('pre-fills the check so the printed link is not a bare endpoint', () => {
    // Opened without the two values the endpoint answers `valid: false`, which
    // reads to the recipient as the document failing its own check.
    expect(
      verifyUrl('https://api.signagewall.com', 'api', {
        digest: 'a'.repeat(64),
        signature: 'b'.repeat(64),
      }),
    ).toBe(
      `https://api.signagewall.com/api/v1/playback/verify?digest=${'a'.repeat(64)}&signature=${'b'.repeat(64)}`,
    );
  });

  it('renders a report with no plays without looking broken', async () => {
    // A bare table header over nothing reads as a failed export rather than as
    // a day on which nothing ran.
    const { bytes } = await buildService().render({
      organizationName: 'Edge+',
      items: report({
        items: [],
        totals: { plays: 0, airtimeMs: 0 },
      }),
      coverage: coverage(),
    });

    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
  });
});
