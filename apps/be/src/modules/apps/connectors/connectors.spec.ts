import type { ConnectorContext, ResolvedConnection } from '@edge/apps-contract';

import { canvaConnector } from './canva.connector';
import { gcalConnector } from './gcal.connector';
import { weatherConnector } from './weather.connector';

const ctx: ConnectorContext = {
  organizationId: '',
  logger: {
    debug: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  },
};

function mockFetchSequence(
  responses: Array<{ ok?: boolean; body: unknown; text?: boolean }>,
) {
  const fn = jest.fn();
  for (const res of responses) {
    fn.mockResolvedValueOnce({
      ok: res.ok ?? true,
      status: res.ok === false ? 500 : 200,
      json: () => Promise.resolve(res.body),
      text: () => Promise.resolve(res.body),
    });
  }
  global.fetch = fn as never;
  return fn;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('cacheKey is coarse and shared', () => {
  it('weather: same city (any case/diacritics/units) → same key', () => {
    const a = weatherConnector.cacheKey!({
      location: 'Belgrade',
      units: 'metric',
    });
    const b = weatherConnector.cacheKey!({
      location: ' belgrade ',
      units: 'imperial',
    });
    expect(a).toBe('weather:belgrade');
    expect(a).toBe(b);
  });
});

describe('fetchData normalization', () => {
  it('weather geocodes then normalizes the forecast to °C', async () => {
    mockFetchSequence([
      {
        body: {
          results: [{ latitude: 44.8, longitude: 20.5, name: 'Belgrade' }],
        },
      },
      {
        body: {
          current: {
            temperature_2m: 21,
            weather_code: 1,
            wind_speed_10m: 9,
            time: '2024-03-01T12:00',
          },
          daily: {
            time: ['2024-03-01'],
            weather_code: [1],
            temperature_2m_max: [24],
            temperature_2m_min: [12],
          },
        },
      },
    ]);
    const result = await weatherConnector.fetchData(
      { location: 'Belgrade' },
      ctx,
    );
    expect(result.playerPayload).toMatchObject({
      location: 'Belgrade',
      temperatureC: 21,
      daily: [{ date: '2024-03-01', maxC: 24, minC: 12 }],
    });
  });

  it('throws on a non-ok upstream so the scheduler records the error', async () => {
    mockFetchSequence([{ ok: false, body: {} }]);
    await expect(
      weatherConnector.fetchData({ location: 'Belgrade' }, ctx),
    ).rejects.toThrow(/weather/);
  });
});

describe('gcal connector (connected)', () => {
  const connection: ResolvedConnection = {
    id: 'conn-1',
    provider: 'google',
    accountLabel: 'user@example.com',
    accessToken: 'tok-abc',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  };
  const connectedCtx: ConnectorContext = { ...ctx, connection };

  it('cacheKey is PER-CONNECTION (includes connection + calendar id)', () => {
    const a = gcalConnector.cacheKey!({
      connectionId: 'conn-1',
      calendarId: 'primary',
    });
    const b = gcalConnector.cacheKey!({
      connectionId: 'conn-2',
      calendarId: 'primary',
    });
    expect(a).toBe('gcal:conn-1:primary');
    // Different connections never share a cache entry (privacy).
    expect(a).not.toBe(b);
  });

  it('exposes a google OAuth descriptor with read-only scope', () => {
    expect(gcalConnector.oauth?.provider).toBe('google');
    expect(gcalConnector.oauth?.scopes).toContain(
      'https://www.googleapis.com/auth/calendar.readonly',
    );
  });

  it('fetches events with the connection bearer token and normalizes them', async () => {
    const fetchMock = mockFetchSequence([
      {
        body: {
          summary: 'Team',
          items: [
            {
              summary: 'Standup',
              start: { dateTime: '2024-03-01T09:00:00Z' },
              end: { dateTime: '2024-03-01T09:15:00Z' },
            },
            { summary: 'Holiday', start: { date: '2024-03-02' } },
          ],
        },
      },
    ]);

    const result = await gcalConnector.fetchData(
      { connectionId: 'conn-1', calendarId: 'primary' },
      connectedCtx,
    );

    // Authorization header carries the decrypted access token.
    const calls = fetchMock.mock.calls as unknown as Array<
      [string, { headers: Record<string, string> }]
    >;
    expect(calls[0][1].headers.authorization).toBe('Bearer tok-abc');
    expect(result.playerPayload!.calendarLabel).toBe('Team');
    expect(result.playerPayload!.events).toEqual([
      {
        title: 'Standup',
        start: '2024-03-01T09:00:00Z',
        end: '2024-03-01T09:15:00Z',
        allDay: false,
      },
      { title: 'Holiday', start: '2024-03-02', allDay: true },
    ]);
  });

  it('throws when no connection was resolved', async () => {
    await expect(
      gcalConnector.fetchData({ connectionId: 'conn-1' }, ctx),
    ).rejects.toThrow(/no connection/);
  });
});

describe('canva connector (connected)', () => {
  const connection: ResolvedConnection = {
    id: 'conn-1',
    provider: 'canva',
    accountLabel: 'user@example.com',
    accessToken: 'tok-canva',
    scopes: ['design:meta:read', 'design:content:read'],
  };
  const connectedCtx: ConnectorContext = { ...ctx, connection };

  it('cacheKey is PER-CONNECTION (includes connection + design id)', () => {
    const a = canvaConnector.cacheKey!({
      connectionId: 'conn-1',
      design: { id: 'design-1' },
    });
    const b = canvaConnector.cacheKey!({
      connectionId: 'conn-2',
      design: { id: 'design-1' },
    });
    expect(a).toBe('canva:conn-1:design-1');
    // A different account never shares the cached export (privacy).
    expect(a).not.toBe(b);
  });

  it('exposes a canva OAuth descriptor with design read + export scopes', () => {
    expect(canvaConnector.oauth?.provider).toBe('canva');
    expect(canvaConnector.oauth?.scopes).toEqual(
      expect.arrayContaining(['design:meta:read', 'design:content:read']),
    );
  });

  it('prefers mp4 when available and returns a looping video', async () => {
    const fetchMock = mockFetchSequence([
      // getCanvaDesign
      { body: { design: { title: 'Promo', updated_at: 1700000000 } } },
      // export-formats: mp4 wins the priority
      { body: { formats: { mp4: {}, jpg: {}, png: {} } } },
      // create export job
      { body: { job: { id: 'job-1', status: 'in_progress' } } },
      // poll export job → success
      {
        body: {
          job: { status: 'success', urls: ['https://export.canva/promo.mp4'] },
        },
      },
    ]);

    const result = await canvaConnector.fetchData(
      { connectionId: 'conn-1', design: { id: 'design-1', label: 'Promo' } },
      connectedCtx,
    );

    // The first call carries the decrypted access token.
    const calls = fetchMock.mock.calls as unknown as Array<
      [string, { headers: Record<string, string> }]
    >;
    expect(calls[0][1].headers.authorization).toBe('Bearer tok-canva');
    expect(result.playerPayload!.kind).toBe('video');
    expect(result.playerPayload!.slides).toEqual([
      'https://export.canva/promo.mp4',
    ]);
    // version keys on updated_at + chosen format (stable across re-exports).
    expect(result.version).toBe('1700000000:mp4');
  });

  it('exports every page as a slideshow when only images are available', async () => {
    mockFetchSequence([
      // getCanvaDesign (portrait thumbnail → vertical orientation)
      {
        body: {
          design: {
            title: 'Deck',
            updated_at: 1700000001,
            page_count: 3,
            thumbnail: { width: 720, height: 1280 },
          },
        },
      },
      // export-formats: no mp4, so jpg is chosen
      { body: { formats: { jpg: {}, png: {}, pdf: {} } } },
      // create export job
      { body: { job: { id: 'job-2', status: 'in_progress' } } },
      // poll → success with one URL per page
      {
        body: {
          job: {
            status: 'success',
            urls: [
              'https://export.canva/deck-1.jpg',
              'https://export.canva/deck-2.jpg',
              'https://export.canva/deck-3.jpg',
            ],
          },
        },
      },
    ]);

    const result = await canvaConnector.fetchData(
      { connectionId: 'conn-1', design: { id: 'design-2', label: 'Deck' } },
      connectedCtx,
    );

    expect(result.playerPayload!.kind).toBe('slideshow');
    expect(result.playerPayload!.slides).toHaveLength(3);
    expect(result.version).toBe('1700000001:jpg');
  });

  it('resumes an in-flight job: pending while the export still renders', async () => {
    const resumeCtx: ConnectorContext = {
      ...connectedCtx,
      secrets: {
        job: {
          id: 'job-9',
          format: 'mp4',
          designId: 'design-1',
          updatedAt: 1700000000,
        },
      },
    };
    // A single getExportJob call, still in progress.
    mockFetchSequence([{ body: { job: { status: 'in_progress' } } }]);

    const result = await canvaConnector.fetchData(
      { connectionId: 'conn-1', design: { id: 'design-1' } },
      resumeCtx,
    );

    expect(result.pending).toBe(true);
    expect(result.playerPayload).toBeUndefined();
    expect((result.secrets as { job: { id: string } }).job.id).toBe('job-9');
  });

  it('resumes an in-flight job: returns the payload when it succeeds', async () => {
    const resumeCtx: ConnectorContext = {
      ...connectedCtx,
      secrets: {
        job: {
          id: 'job-9',
          format: 'mp4',
          designId: 'design-1',
          updatedAt: 1700000000,
        },
      },
    };
    mockFetchSequence([
      {
        body: {
          job: { status: 'success', urls: ['https://export.canva/v.mp4'] },
        },
      },
    ]);

    const result = await canvaConnector.fetchData(
      { connectionId: 'conn-1', design: { id: 'design-1' } },
      resumeCtx,
    );

    expect(result.pending).toBeUndefined();
    expect(result.playerPayload!.kind).toBe('video');
    expect(result.playerPayload!.slides).toEqual([
      'https://export.canva/v.mp4',
    ]);
    expect(result.version).toBe('1700000000:mp4');
    // A final result clears the in-flight job (no secrets carried forward).
    expect(result.secrets).toBeUndefined();
  });

  it('keeps the created job when the inline poll errors (no wasted re-export)', async () => {
    mockFetchSequence([
      // getCanvaDesign
      { body: { design: { title: 'Deck', updated_at: 1700000002 } } },
      // export-formats → jpg
      { body: { formats: { jpg: {} } } },
      // create export job → id
      { body: { job: { id: 'job-7' } } },
      // brief poll's status check fails transiently (non-ok)
      { ok: false, body: {} },
    ]);

    const result = await canvaConnector.fetchData(
      { connectionId: 'conn-1', design: { id: 'design-3', label: 'Deck' } },
      connectedCtx,
    );

    // The freshly-created job is persisted (pending), not discarded.
    expect(result.pending).toBe(true);
    expect(result.playerPayload).toBeUndefined();
    const job = (result.secrets as { job: { id: string; designId: string } })
      .job;
    expect(job.id).toBe('job-7');
    expect(job.designId).toBe('design-3');
  });

  it('throws when no connection was resolved', async () => {
    await expect(
      canvaConnector.fetchData({ design: { id: 'design-1' } }, ctx),
    ).rejects.toThrow(/no connection/);
  });
});
