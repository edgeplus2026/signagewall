import type { Response } from 'express';

import type { OrganizationsRepository } from '../organizations/organizations.repository';
import { PlaybackController } from './playback.controller';
import { PlaybackPdfService } from './playback-pdf.service';
import type { ReportScheduleService } from './report-schedule.service';
import type {
  PlaybackItemRow,
  PlaybackReportService,
} from './playback-report.service';

function buildController(items: Partial<PlaybackItemRow>[]) {
  const reports = {
    items: jest.fn().mockResolvedValue({
      from: '2026-08-01',
      to: '2026-08-17',
      items: items.map((item) => ({
        contentId: 'c1',
        name: 'Item',
        plays: 1,
        airtimeMs: 3_723_000,
        screens: 1,
        screenNames: ['Lobby'],
        share: 100,
        ...item,
      })),
      totals: { plays: 1, airtimeMs: 3_723_000 },
      truncated: false,
    }),
  } as unknown as PlaybackReportService;

  const headers: Record<string, string> = {};
  let body = '';
  const response = {
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    send: (value: string) => {
      body = value;
    },
  } as unknown as Response;

  return {
    controller: new PlaybackController(
      reports,
      new PlaybackPdfService({
        get: () => 'test-signing-key',
      } as never),
      {
        findById: jest.fn().mockResolvedValue({ name: 'Vecom' }),
      } as unknown as OrganizationsRepository,
      {
        get: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      } as unknown as ReportScheduleService,
    ),
    response,
    headers,
    csv: () => body,
  };
}

const QUERY = { from: '2026-08-01', to: '2026-08-17' };

describe('PlaybackController CSV', () => {
  it('sends a downloadable file rather than the JSON envelope', async () => {
    const { controller, response, headers, csv } = buildController([{}]);

    await controller.itemsCsv('org-1', QUERY, response);

    expect(headers['Content-Type']).toContain('text/csv');
    expect(headers['Content-Disposition']).toContain(
      'playback-2026-08-01_2026-08-17.csv',
    );
    expect(csv().split('\r\n')[0]).toContain('content_id');
  });

  it('leads with a BOM so Excel reads the names as UTF-8', async () => {
    const { controller, response, csv } = buildController([{ name: 'Žurka' }]);
    await controller.itemsCsv('org-1', QUERY, response);

    // Without it Excel applies the system codepage and every accented screen
    // name in the file arrives as mojibake.
    expect(csv().charCodeAt(0)).toBe(0xfeff);
    expect(csv()).toContain('Žurka');
  });

  it('gives airtime both as milliseconds and as a readable duration', async () => {
    const { controller, response, csv } = buildController([{}]);
    await controller.itemsCsv('org-1', QUERY, response);

    expect(csv()).toContain('3723000');
    expect(csv()).toContain('1:02:03');
  });

  it('quotes a field that would otherwise split the row', async () => {
    const { controller, response, csv } = buildController([
      { name: 'Akcija, "velika"' },
    ]);
    await controller.itemsCsv('org-1', QUERY, response);

    expect(csv()).toContain('"Akcija, ""velika"""');
  });

  it('defuses a name a spreadsheet would run as a formula', async () => {
    const { controller, response, csv } = buildController([
      { name: '=HYPERLINK("http://x","click")' },
    ]);
    await controller.itemsCsv('org-1', QUERY, response);

    // These names are typed by operators and the file is opened by their
    // clients; a leading `=` is executed, not displayed.
    expect(csv()).toContain(`"'=HYPERLINK`);
  });
});
