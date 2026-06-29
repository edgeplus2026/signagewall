import type { ConnectorContext, ResolvedConnection } from '@edge/apps-contract';

// RSS fetches an operator-supplied URL through the SSRF-guarded helper, which
// resolves the host before connecting. Stub DNS so the test feed host looks
// like a public address (the guard is exercised in safe-fetch.util.spec.ts).
jest.mock('node:dns/promises', () => ({
  lookup: jest
    .fn()
    .mockResolvedValue([{ address: '93.184.216.34', family: 4 }]),
}));

import { exchangeRateConnector } from './exchange-rate.connector';
import { gcalConnector } from './gcal.connector';
import { rssConnector } from './rss.connector';
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

  it('fx: same base (any case), regardless of quotes → same key', () => {
    const a = exchangeRateConnector.cacheKey!({
      base: 'EUR',
      quotes: 'USD,GBP',
    });
    const b = exchangeRateConnector.cacheKey!({ base: 'eur', quotes: 'CHF' });
    expect(a).toBe('fx:eur');
    expect(a).toBe(b);
  });

  it('rss: same url → same hashed key; different url → different key', () => {
    const a = rssConnector.cacheKey!({ url: 'https://a.example/feed' });
    const b = rssConnector.cacheKey!({ url: 'https://a.example/feed' });
    const c = rssConnector.cacheKey!({ url: 'https://b.example/feed' });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith('rss:')).toBe(true);
  });
});

describe('fetchData normalization', () => {
  it('fx returns raw rates against the base', async () => {
    mockFetchSequence([
      {
        body: {
          base: 'EUR',
          date: '2024-03-01',
          rates: { USD: 1.08, GBP: 0.85 },
        },
      },
    ]);
    const result = await exchangeRateConnector.fetchData({ base: 'EUR' }, ctx);
    expect(result.playerPayload).toEqual({
      base: 'EUR',
      date: '2024-03-01',
      rates: { USD: 1.08, GBP: 0.85 },
    });
  });

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

  it('rss parses item titles and caps the list', async () => {
    const xml = `<rss><channel><title>Feed</title>
      <item><title>First</title><pubDate>Wed, 01 Mar 2024 10:00:00 GMT</pubDate></item>
      <item><title><![CDATA[Second & more]]></title></item>
    </channel></rss>`;
    mockFetchSequence([{ body: xml, text: true }]);
    const result = await rssConnector.fetchData({ url: 'https://x/feed' }, ctx);
    expect(result.playerPayload.title).toBe('Feed');
    expect(result.playerPayload.items.map((i) => i.title)).toEqual([
      'First',
      'Second & more',
    ]);
  });

  it('throws on a non-ok upstream so the scheduler records the error', async () => {
    mockFetchSequence([{ ok: false, body: {} }]);
    await expect(
      exchangeRateConnector.fetchData({ base: 'EUR' }, ctx),
    ).rejects.toThrow(/fx upstream 500/);
  });
});

describe('gcal connector (connected)', () => {
  const connection: ResolvedConnection = {
    id: 'conn-1',
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
    expect(result.playerPayload.calendarLabel).toBe('Team');
    expect(result.playerPayload.events).toEqual([
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
