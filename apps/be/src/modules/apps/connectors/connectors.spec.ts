import type { ConnectorContext, ResolvedConnection } from '@edge/apps-contract';
import type { RssPayload } from '@edge/apps';

import { airqualityConnector } from './airquality.connector';
import { canvaConnector } from './canva.connector';
import { cryptoConnector } from './crypto.connector';
import { currencyConnector } from './currency.connector';
import { gcalConnector } from './gcal.connector';
import { powerPricesConnector } from './power-prices.connector';
import { rssConnector } from './rss.connector';
import { safeFetchText } from './safe-fetch.util';
import { weatherConnector } from './weather.connector';

// The RSS connector fetches through the SSRF guard, which resolves the host over
// DNS and refuses anything non-public — so a test feed at `example.com` would be
// blocked before it was ever parsed. The guard has its own spec
// (`safe-fetch.util.spec.ts`); here we mock it and test the parsing.
jest.mock('./safe-fetch.util', () => ({ safeFetchText: jest.fn() }));
const safeFetchMock = safeFetchText as jest.MockedFunction<
  typeof safeFetchText
>;

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
            apparent_temperature: 19,
            weather_code: 1,
            wind_speed_10m: 9,
            wind_direction_10m: 200,
            relative_humidity_2m: 55,
            is_day: 1,
            time: '2024-03-01T12:00',
          },
          daily: {
            time: ['2024-03-01'],
            weather_code: [1],
            temperature_2m_max: [24],
            temperature_2m_min: [12],
            precipitation_probability_max: [30],
            uv_index_max: [4],
            sunrise: ['2024-03-01T06:12'],
            sunset: ['2024-03-01T17:38'],
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
      feelsLikeC: 19,
      windDegrees: 200,
      isDay: true,
      precipitationProbability: 30,
      daily: [
        {
          date: '2024-03-01',
          maxC: 24,
          minC: 12,
          precipitationProbability: 30,
          uvIndexMax: 4,
          sunrise: '2024-03-01T06:12',
          sunset: '2024-03-01T17:38',
        },
      ],
    });
  });

  // The hourly series comes back from LOCAL MIDNIGHT, so most of a midday response
  // is already in the past. Shipping it whole would put "3am, 4°" on a wall at
  // lunchtime — the trim is the only thing standing between the payload and that.
  it('weather trims the hourly series to the current hour onward', async () => {
    mockFetchSequence([
      {
        body: {
          current: {
            temperature_2m: 21,
            weather_code: 1,
            wind_speed_10m: 9,
            relative_humidity_2m: 55,
            is_day: 1,
            // Half past twelve: the 12:00 bucket is the one we are IN, and it is the
            // one the layouts label "Now".
            time: '2024-03-01T12:30',
          },
          hourly: {
            time: [
              '2024-03-01T10:00',
              '2024-03-01T11:00',
              '2024-03-01T12:00',
              '2024-03-01T13:00',
            ],
            temperature_2m: [15, 18, 21, 23],
            weather_code: [1, 1, 2, 3],
            precipitation_probability: [0, 5, 10, 40],
            is_day: [1, 1, 1, 1],
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
      { location: { lat: 44.8, lng: 20.5, label: 'Belgrade' } },
      ctx,
    );

    expect(result.playerPayload?.hourly).toEqual([
      {
        time: '2024-03-01T12:00',
        temperatureC: 21,
        weatherCode: 2,
        precipitationProbability: 10,
        isDay: true,
      },
      {
        time: '2024-03-01T13:00',
        temperatureC: 23,
        weatherCode: 3,
        precipitationProbability: 40,
        isDay: true,
      },
    ]);
  });

  // A player caches the last payload it was given, so the embed has to survive a
  // forecast with none of the fields added after v1 — which is exactly what upstream
  // returns when a series is unavailable for a location.
  it('weather omits the optional fields rather than writing undefined into them', async () => {
    mockFetchSequence([
      {
        body: {
          current: {
            temperature_2m: 21,
            weather_code: 1,
            wind_speed_10m: 9,
            relative_humidity_2m: 55,
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
      { location: { lat: 44.8, lng: 20.5, label: 'Belgrade' } },
      ctx,
    );
    const payload = result.playerPayload!;

    expect(payload.hourly).toEqual([]);
    expect(payload).not.toHaveProperty('feelsLikeC');
    expect(payload).not.toHaveProperty('windDegrees');
    expect(payload.daily[0]).not.toHaveProperty('sunrise');
    // `is_day` absent upstream: the embed defaults to daylight, but the connector
    // still has to say something, and a missing sun is a worse guess than a present one.
    expect(payload.isDay).toBe(true);
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

  it('cacheKey is PER-CONNECTION + calendar (from the picker value)', () => {
    const a = gcalConnector.cacheKey!({
      connectionId: 'conn-1',
      calendar: { id: 'team@group.calendar.google.com' },
    });
    const b = gcalConnector.cacheKey!({
      connectionId: 'conn-2',
      calendar: { id: 'team@group.calendar.google.com' },
    });
    const primary = gcalConnector.cacheKey!({ connectionId: 'conn-1' });
    expect(a).toBe('gcal:conn-1:team@group.calendar.google.com');
    // Different connections never share a cache entry (privacy).
    expect(a).not.toBe(b);
    // No calendar chosen → defaults to the account's primary calendar.
    expect(primary).toBe('gcal:conn-1:primary');
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
      { connectionId: 'conn-1', calendar: { id: 'primary' } },
      connectedCtx,
    );

    // Authorization header carries the decrypted access token.
    const calls = fetchMock.mock.calls as unknown as Array<
      [string, { headers: Record<string, string> }]
    >;
    expect(calls[0][1].headers.authorization).toBe('Bearer tok-abc');
    // A broad window (timeMin/timeMax) is requested so any view can render.
    expect(calls[0][0]).toContain('timeMin=');
    expect(calls[0][0]).toContain('timeMax=');
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

  // The host has no `version` to compare for this connector, so it deep-compares the
  // payload to decide whether to re-push it to every screen. A timestamp in there is
  // never equal to itself: the calendar looked changed on every fetch and every screen
  // showing it was rebuilt, mid-animation, every five minutes, for nothing.
  it('puts NO timestamp in the payload (it would fan out on every refresh)', async () => {
    mockFetchSequence([{ body: { summary: 'Team', items: [] } }]);

    const result = await gcalConnector.fetchData(
      { connectionId: 'conn-1' },
      connectedCtx,
    );

    expect(result.playerPayload).toEqual({
      calendarLabel: 'Team',
      events: [],
    });
    expect(result.playerPayload).not.toHaveProperty('fetchedAt');
  });

  // The window used to be anchored on the 1st of the month and run 42 days from it,
  // so it SHRANK through the month and anything past its end was never fetched at all.
  it('asks for a window that rolls with today, not with the 1st of the month', async () => {
    const fetchMock = mockFetchSequence([{ body: { items: [] } }]);
    jest.useFakeTimers().setSystemTime(new Date('2026-07-31T10:00:00Z'));

    await gcalConnector.fetchData({ connectionId: 'conn-1' }, connectedCtx);

    const url = new URL((fetchMock.mock.calls[0] as [string])[0]);
    const timeMax = new Date(url.searchParams.get('timeMax')!);
    const timeMin = new Date(url.searchParams.get('timeMin')!);
    const daysAhead =
      (timeMax.getTime() - Date.now()) / (24 * 60 * 60 * 1000);

    // On the 31st, the old window could see 12 days. This one still sees ~60.
    expect(daysAhead).toBeGreaterThan(59);
    expect(timeMin.getTime()).toBeLessThan(Date.now());
    jest.useRealTimers();
  });

  describe('push subscription', () => {
    const CHANNEL = 'https://api.example.com/api/v1/webhooks/google/calendar';
    const watchCtx: ConnectorContext = { ...connectedCtx, webhookUrl: CHANNEL };

    it('registers a watch channel and remembers it in secrets', async () => {
      const fetchMock = mockFetchSequence([
        { body: { summary: 'Team', items: [] } },
        { body: { resourceId: 'res-1', expiration: '1800000000000' } },
      ]);

      const result = await gcalConnector.fetchData(
        { connectionId: 'conn-1' },
        watchCtx,
      );

      const [url, init] = fetchMock.mock.calls[1] as [
        string,
        { method: string; body: string },
      ];
      expect(url).toContain('/events/watch');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body) as { address: string; type: string };
      expect(body.address).toBe(CHANNEL);
      expect(body.type).toBe('web_hook');

      const channel = (result.secrets as { channel: { resourceId: string } })
        .channel;
      expect(channel.resourceId).toBe('res-1');
      // The payload still arrives — the subscription is a side-effect of the fetch.
      expect(result.playerPayload!.calendarLabel).toBe('Team');
    });

    // A laptop has no address Google could POST to. Subscribing is skipped and the
    // poll carries the data; this must not be an error.
    it('does not subscribe when the deployment has no public URL', async () => {
      const fetchMock = mockFetchSequence([{ body: { items: [] } }]);

      const result = await gcalConnector.fetchData(
        { connectionId: 'conn-1' },
        connectedCtx,
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.secrets).toBeUndefined();
      expect(result.playerPayload).toBeDefined();
    });

    it('reuses a live channel instead of re-subscribing every poll', async () => {
      const fetchMock = mockFetchSequence([{ body: { items: [] } }]);
      const alive = {
        id: 'chan-1',
        resourceId: 'res-1',
        expiration: Date.now() + 5 * 24 * 60 * 60 * 1000,
        address: CHANNEL,
      };

      const result = await gcalConnector.fetchData(
        { connectionId: 'conn-1' },
        { ...watchCtx, secrets: { channel: alive } },
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect((result.secrets as { channel: unknown }).channel).toEqual(alive);
    });

    it('renews a channel that is about to expire, and stops the old one', async () => {
      const fetchMock = mockFetchSequence([
        { body: { items: [] } },
        { body: { resourceId: 'res-2', expiration: '1800000000000' } },
        { body: {} }, // channels/stop
      ]);
      const dying = {
        id: 'chan-old',
        resourceId: 'res-old',
        expiration: Date.now() + 60_000,
        address: CHANNEL,
      };

      const result = await gcalConnector.fetchData(
        { connectionId: 'conn-1' },
        { ...watchCtx, secrets: { channel: dying } },
      );

      const stop = fetchMock.mock.calls[2] as [string, { body: string }];
      expect(stop[0]).toContain('/channels/stop');
      expect(JSON.parse(stop[1].body)).toMatchObject({
        id: 'chan-old',
        resourceId: 'res-old',
      });
      expect(
        (result.secrets as { channel: { resourceId: string } }).channel
          .resourceId,
      ).toBe('res-2');
    });

    // A calendar that can't be watched must still be READ. Failing the fetch over a
    // failed subscription trades a screen that is five minutes stale for a blank one.
    it('still returns the events when the subscription fails', async () => {
      mockFetchSequence([
        { body: { summary: 'Team', items: [] } },
        { ok: false, body: {} },
      ]);

      const result = await gcalConnector.fetchData(
        { connectionId: 'conn-1' },
        watchCtx,
      );

      expect(result.playerPayload!.calendarLabel).toBe('Team');
      expect(result.secrets).toBeUndefined();
    });
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

describe('rss connector (server)', () => {
  const FEED = 'https://news.example.com/feed.xml';

  beforeEach(() => {
    safeFetchMock.mockReset();
  });

  async function fetchFeed(xml: string): Promise<RssPayload> {
    safeFetchMock.mockResolvedValue(xml);
    const result = await rssConnector.fetchData({ url: FEED }, ctx);
    return result.playerPayload as RssPayload;
  }

  describe('cacheKey', () => {
    it('is the feed URL, so the same feed shares one fetch', () => {
      const a = rssConnector.cacheKey!({ url: FEED });
      const b = rssConnector.cacheKey!({ url: ` ${FEED} ` });
      expect(a).toBe(b);
      expect(a).toMatch(/^rss:[0-9a-f]{40}$/);
    });

    it('ignores display settings — differently styled screens still share it', () => {
      // The whole economy of the app rests on this: 100 screens on one feed must
      // cost one upstream fetch, however each of them is configured to look.
      const plain = rssConnector.cacheKey!({ url: FEED });
      const styled = rssConnector.cacheKey!({
        url: FEED,
        displayMode: 'story',
        theme: 'light',
        showQr: false,
        itemCount: 3,
        secondsPerStory: 20,
      } as never);
      expect(styled).toBe(plain);
    });

    it('normalizes trivial spelling differences so they still share one fetch', () => {
      const plain = rssConnector.cacheKey!({
        url: 'https://news.example.com/feed',
      });
      for (const spelling of [
        'https://news.example.com/feed/',
        'https://NEWS.EXAMPLE.COM/feed',
        'https://news.example.com/feed#top',
      ]) {
        expect(rssConnector.cacheKey!({ url: spelling })).toBe(plain);
      }
    });

    it('is a different key for a different feed', () => {
      expect(rssConnector.cacheKey!({ url: FEED })).not.toBe(
        rssConnector.cacheKey!({ url: 'https://other.example.com/rss' }),
      );
    });
  });

  describe('RSS 2.0', () => {
    it('normalizes title, link, summary, image and date', async () => {
      const payload = await fetchFeed(`<?xml version="1.0"?>
        <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
          <channel>
            <title>The Example Times</title>
            <link>https://news.example.com</link>
            <item>
              <title>Bridge reopens after two years</title>
              <link>https://news.example.com/bridge</link>
              <description><![CDATA[<p>The <b>old bridge</b> is open again.</p>]]></description>
              <pubDate>Tue, 01 Jul 2025 09:30:00 GMT</pubDate>
              <media:content url="https://cdn.example.com/bridge.jpg" medium="image"/>
            </item>
          </channel>
        </rss>`);

      expect(payload.title).toBe('The Example Times');
      expect(payload.link).toBe('https://news.example.com/');
      expect(payload.items).toHaveLength(1);
      expect(payload.items[0]).toEqual({
        title: 'Bridge reopens after two years',
        link: 'https://news.example.com/bridge',
        // Markup stripped: the bundle renders text, never a feed's HTML.
        summary: 'The old bridge is open again.',
        imageUrl: 'https://cdn.example.com/bridge.jpg',
        publishedAt: '2025-07-01T09:30:00.000Z',
      });
    });

    it('falls back through enclosure and then the body <img> for the image', async () => {
      const payload = await fetchFeed(`<rss><channel>
        <title>T</title>
        <item>
          <title>With enclosure</title>
          <enclosure url="https://cdn.example.com/a.png" type="image/png"/>
        </item>
        <item>
          <title>With an inline image only</title>
          <content:encoded xmlns:content="http://purl.org/rss/1.0/modules/content/"><![CDATA[
            <p>Lead</p><img src="/img/inline.jpg" alt=""/>
          ]]></content:encoded>
        </item>
        <item><title>With no image at all</title></item>
      </channel></rss>`);

      expect(payload.items[0]?.imageUrl).toBe('https://cdn.example.com/a.png');
      // Relative src resolved against the feed's own address.
      expect(payload.items[1]?.imageUrl).toBe(
        'https://news.example.com/img/inline.jpg',
      );
      expect(payload.items[2]?.imageUrl).toBeUndefined();
    });

    it('picks the biggest size a media:group offers, not the first', async () => {
      // News CMSes ship one picture at several sizes in no reliable order. Taking
      // the first hands a 1080p wall a 240px thumbnail stretched across half of it.
      const payload =
        await fetchFeed(`<rss xmlns:media="http://search.yahoo.com/mrss/">
        <channel><title>T</title>
          <item>
            <title>Sized</title>
            <media:thumbnail url="https://cdn.example.com/small.jpg" width="240"/>
            <media:thumbnail url="https://cdn.example.com/large.jpg" width="1920"/>
            <media:thumbnail url="https://cdn.example.com/medium.jpg" width="640"/>
          </item>
        </channel>
      </rss>`);

      expect(payload.items[0]?.imageUrl).toBe(
        'https://cdn.example.com/large.jpg',
      );
    });

    it('drops a non-http(s) image and link rather than passing them to the screen', async () => {
      const payload = await fetchFeed(`<rss><channel>
        <title>T</title>
        <item>
          <title>Hostile</title>
          <link>javascript:alert(1)</link>
          <enclosure url="javascript:alert(2)" type="image/png"/>
        </item>
      </channel></rss>`);

      expect(payload.items[0]?.link).toBeUndefined();
      expect(payload.items[0]?.imageUrl).toBeUndefined();
    });

    it('truncates a long summary so the cached payload stays small', async () => {
      const payload = await fetchFeed(`<rss><channel><title>T</title>
        <item>
          <title>Long</title>
          <description>${'word '.repeat(200)}</description>
        </item>
      </channel></rss>`);

      const summary = payload.items[0]?.summary ?? '';
      expect(summary.length).toBeLessThanOrEqual(301);
      expect(summary.endsWith('…')).toBe(true);
    });

    it('caps a runaway title, which one layout renders a span per character of', async () => {
      // Feeds ship monsters — a malformed CDATA block, an article body pasted into
      // <title>. The `kinetic` layout sets the headline a letter at a time, so an
      // unbounded title there is an unbounded number of animated DOM nodes on a
      // signage stick. Bound it at the door instead of in each of ten renderers.
      const payload = await fetchFeed(`<rss><channel><title>T</title>
        <item><title>${'word '.repeat(200)}</title></item>
      </channel></rss>`);

      const title = payload.items[0]?.title ?? '';
      expect(title.length).toBeLessThanOrEqual(221);
      expect(title.endsWith('…')).toBe(true);
    });

    it('caps the stored items at 30 however big the feed is', async () => {
      const items = Array.from(
        { length: 50 },
        (_unused, i) => `<item><title>Story ${i}</title></item>`,
      ).join('');
      const payload = await fetchFeed(
        `<rss><channel><title>T</title>${items}</channel></rss>`,
      );
      expect(payload.items).toHaveLength(30);
      expect(payload.items[0]?.title).toBe('Story 0');
    });

    it('decodes entities in a CDATA title instead of printing them on the wall', async () => {
      // CDATA is literal by definition, so the XML parser decodes nothing inside
      // it — and feeds wrap titles in CDATA constantly. `DJI&#8217;s` reached the
      // screen exactly like that.
      const payload = await fetchFeed(`<rss><channel>
        <title><![CDATA[The Verge &#8212; Tech]]></title>
        <item><title><![CDATA[DJI&#8217;s <b>best</b> mic]]></title></item>
      </channel></rss>`);

      expect(payload.title).toBe('The Verge — Tech');
      // Entities resolved AND the markup CDATA smuggled through stripped out.
      expect(payload.items[0]?.title).toBe('DJI’s best mic');
    });

    it('survives an out-of-range numeric entity instead of breaking the feed forever', async () => {
      // `String.fromCodePoint` THROWS above U+10FFFF, and that number comes out
      // of a stranger's feed. Unguarded, one bad entity in one headline threw out
      // of the parse and the feed then failed on every refresh, permanently.
      const payload = await fetchFeed(`<rss><channel><title>T</title>
        <item><title>Bad &#x110000; entity &#999999999; here &#8217;ok</title></item>
      </channel></rss>`);

      // The impossible ones are left as literal text; the real one still decodes.
      expect(payload.items[0]?.title).toBe(
        'Bad &#x110000; entity &#999999999; here ’ok',
      );
    });

    it('skips an item with no title rather than rendering a blank story', async () => {
      const payload = await fetchFeed(`<rss><channel><title>T</title>
        <item><description>orphan</description></item>
        <item><title>Real</title></item>
      </channel></rss>`);
      expect(payload.items).toHaveLength(1);
      expect(payload.items[0]?.title).toBe('Real');
    });
  });

  describe('Atom', () => {
    it('reads the story link from the alternate <link href>, not rel="self"', async () => {
      const payload = await fetchFeed(`<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Atom Journal</title>
          <link rel="self" href="https://news.example.com/atom.xml"/>
          <entry>
            <title>An entry</title>
            <link rel="enclosure" href="https://cdn.example.com/audio.mp3"/>
            <link rel="alternate" href="https://news.example.com/entry-1"/>
            <summary>A short teaser.</summary>
            <published>2025-06-30T08:00:00Z</published>
          </entry>
        </feed>`);

      expect(payload.title).toBe('Atom Journal');
      expect(payload.items[0]).toEqual({
        title: 'An entry',
        link: 'https://news.example.com/entry-1',
        summary: 'A short teaser.',
        publishedAt: '2025-06-30T08:00:00.000Z',
      });
    });

    it('takes the teaser from <summary> but still finds the image in <content>', async () => {
      // The Verge (and much of the Atom world) writes a plain teaser into
      // <summary> and puts the illustrated body in <content>. Searching only the
      // field we chose for the summary found no image and shipped a text-only
      // screen for every such feed.
      const payload = await fetchFeed(`<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Illustrated</title>
          <entry>
            <title>Two fields, two jobs</title>
            <link rel="alternate" href="https://news.example.com/two"/>
            <summary type="html">The teaser, written for a teaser.</summary>
            <content type="html">
              &lt;p&gt;The body.&lt;/p&gt;&lt;img src="https://cdn.example.com/lead.png"/&gt;
            </content>
          </entry>
        </feed>`);

      expect(payload.items[0]?.summary).toBe(
        'The teaser, written for a teaser.',
      );
      expect(payload.items[0]?.imageUrl).toBe(
        'https://cdn.example.com/lead.png',
      );
    });

    it('decodes a double-encoded image URL instead of losing it at the #', async () => {
      // HTML inside XML is encoded twice, so `&amp;#038;` survives the XML parse
      // as `&#038;`. Left alone, that `#` starts a URL fragment and the image
      // loads without half its query — WordPress feeds do this constantly.
      const payload = await fetchFeed(`<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>WP</title>
          <entry>
            <title>Double-encoded</title>
            <content type="html">
              &lt;img src="https://cdn.example.com/a.png?quality=90&amp;#038;crop=1" /&gt;
            </content>
          </entry>
        </feed>`);

      expect(payload.items[0]?.imageUrl).toBe(
        'https://cdn.example.com/a.png?quality=90&crop=1',
      );
    });

    it('prefers a written teaser over truncating the full article', async () => {
      const payload = await fetchFeed(`<rss><channel><title>T</title>
        <item>
          <title>Both</title>
          <description>The teaser.</description>
          <content:encoded xmlns:content="http://purl.org/rss/1.0/modules/content/">
            ${'The full article body. '.repeat(40)}
          </content:encoded>
        </item>
      </channel></rss>`);
      expect(payload.items[0]?.summary).toBe('The teaser.');
    });
  });

  describe('RSS 1.0 / RDF', () => {
    it('finds items hanging off the root beside <channel>', async () => {
      const payload = await fetchFeed(`<?xml version="1.0"?>
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                 xmlns:dc="http://purl.org/dc/elements/1.1/">
          <channel><title>RDF Wire</title></channel>
          <item>
            <title>An RDF story</title>
            <link>https://news.example.com/rdf-1</link>
            <dc:date>2025-06-29T10:00:00Z</dc:date>
          </item>
        </rdf:RDF>`);

      expect(payload.title).toBe('RDF Wire');
      expect(payload.items[0]).toMatchObject({
        title: 'An RDF story',
        link: 'https://news.example.com/rdf-1',
        publishedAt: '2025-06-29T10:00:00.000Z',
      });
    });
  });

  describe('failures are surfaced, not swallowed', () => {
    it('throws on a missing url', async () => {
      await expect(rssConnector.fetchData({}, ctx)).rejects.toThrow(
        /missing feed url/,
      );
      expect(safeFetchMock).not.toHaveBeenCalled();
    });

    it('throws when the document is not a feed', async () => {
      await expect(
        fetchFeed('<html><body>Not a feed</body></html>'),
      ).rejects.toThrow(/not an RSS or Atom feed/);
    });

    it('throws on an empty feed, so the last good payload stays on screen', async () => {
      await expect(
        fetchFeed('<rss><channel><title>Empty</title></channel></rss>'),
      ).rejects.toThrow(/no items/);
    });

    it('lets an SSRF block propagate to the scheduler', async () => {
      safeFetchMock.mockRejectedValue(
        new Error('Blocked non-public address: 10.0.0.1'),
      );
      await expect(
        rssConnector.fetchData({ url: 'http://internal.corp/feed' }, ctx),
      ).rejects.toThrow(/non-public/);
    });
  });

  it('carries no timestamp, so an unchanged feed does not fan out every refresh', async () => {
    // The host deep-compares payloads to decide whether to push to every player.
    // A `fetchedAt` in here would make a quiet feed look new every 5 minutes.
    const xml = `<rss><channel><title>T</title>
      <item><title>Same story</title></item>
    </channel></rss>`;
    const first = await fetchFeed(xml);
    const second = await fetchFeed(xml);
    expect(second).toEqual(first);
  });
});

describe('currency connector (server)', () => {
  it('cacheKey is the base + sorted targets, order- and display-agnostic', () => {
    const a = currencyConnector.cacheKey!({
      base: 'eur',
      targets: ['USD', 'GBP'],
    });
    const b = currencyConnector.cacheKey!({
      base: 'EUR',
      targets: ['gbp', 'usd', 'EUR'], // any order; the base is dropped
    });
    expect(a).toBe('fx:EUR:GBP,USD');
    expect(a).toBe(b);
  });

  it('normalizes rates in sorted order and drops codes the upstream omits', async () => {
    mockFetchSequence([
      {
        body: {
          amount: 1,
          base: 'EUR',
          date: '2026-07-14',
          rates: { USD: 1.14, GBP: 0.85 }, // DKK requested but omitted upstream
        },
      },
    ]);
    const result = await currencyConnector.fetchData(
      { base: 'EUR', targets: ['USD', 'GBP', 'DKK'] },
      ctx,
    );
    expect(result.playerPayload).toEqual({
      base: 'EUR',
      date: '2026-07-14',
      rates: [
        { code: 'GBP', rate: 0.85 },
        { code: 'USD', rate: 1.14 },
      ],
    });
  });

  it('carries only the upstream date, so an unchanged day does not fan out', async () => {
    const body = {
      base: 'EUR',
      date: '2026-07-14',
      rates: { USD: 1.14 },
    };
    mockFetchSequence([{ body }, { body }]);
    const first = await currencyConnector.fetchData(
      { base: 'EUR', targets: ['USD'] },
      ctx,
    );
    const second = await currencyConnector.fetchData(
      { base: 'EUR', targets: ['USD'] },
      ctx,
    );
    expect(second).toEqual(first);
  });
});

describe('crypto connector (server)', () => {
  it('cacheKey is the sorted coin set + quote currency', () => {
    const a = cryptoConnector.cacheKey!({
      coins: ['ethereum', 'bitcoin'],
      vs: 'USD',
    });
    expect(a).toBe('crypto:bitcoin,ethereum:usd');
  });

  it('labels coins from the catalog in a stable order with the 24h change', async () => {
    mockFetchSequence([
      {
        body: {
          bitcoin: { usd: 65000, usd_24h_change: 2.3 },
          ethereum: { usd: 1900, usd_24h_change: -1.1 },
        },
      },
    ]);
    const result = await cryptoConnector.fetchData(
      { coins: ['ethereum', 'bitcoin'], vs: 'usd' },
      ctx,
    );
    // Curated order (BTC before ETH), not the config order.
    expect(result.playerPayload).toEqual({
      vs: 'usd',
      coins: [
        { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 65000, change24h: 2.3 },
        { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 1900, change24h: -1.1 },
      ],
    });
  });
});

describe('air quality connector (server)', () => {
  it('cacheKey is coarse coordinates, shared regardless of the shown index', () => {
    const a = airqualityConnector.cacheKey!({
      location: { lat: 55.681, lng: 12.571 },
      scale: 'european',
    });
    const b = airqualityConnector.cacheKey!({
      location: { lat: 55.684, lng: 12.574 },
      scale: 'us',
    });
    expect(a).toBe('aq:55.68,12.57');
    expect(a).toBe(b);
  });

  it('carries both indices and the pollutants it was sent', async () => {
    mockFetchSequence([
      {
        body: {
          current: {
            time: '2026-07-15T15:00',
            european_aqi: 35,
            us_aqi: 31,
            pm2_5: 6.1,
            pm10: 9.2,
            ozone: 88,
            nitrogen_dioxide: 6,
            sulphur_dioxide: 0.6,
          },
        },
      },
    ]);
    const result = await airqualityConnector.fetchData(
      { location: { lat: 55.68, lng: 12.57, label: 'Copenhagen' } },
      ctx,
    );
    expect(result.playerPayload).toEqual({
      location: 'Copenhagen',
      observedAt: '2026-07-15T15:00',
      europeanAqi: 35,
      usAqi: 31,
      pm25: 6.1,
      pm10: 9.2,
      o3: 88,
      no2: 6,
      so2: 0.6,
    });
  });
});

describe('power-prices connector (server)', () => {
  it('cacheKey is the area only (currency is display-only)', () => {
    expect(powerPricesConnector.cacheKey!({ area: 'dk1', currency: 'EUR' })).toBe(
      'power:DK1',
    );
    expect(powerPricesConnector.cacheKey!({ area: 'DK1', currency: 'DKK' })).toBe(
      'power:DK1',
    );
  });

  it('orders hours oldest-first and converts MWh prices to per-kWh', async () => {
    mockFetchSequence([
      {
        // API returns newest-first; the connector reverses to ascending.
        body: {
          records: [
            {
              HourUTC: '2026-07-15T13:00:00',
              HourDK: '2026-07-15T15:00:00',
              PriceArea: 'DK1',
              SpotPriceDKK: 1900,
              SpotPriceEUR: 255,
            },
            {
              HourUTC: '2026-07-15T12:00:00',
              HourDK: '2026-07-15T14:00:00',
              PriceArea: 'DK1',
              SpotPriceDKK: 1850,
              SpotPriceEUR: 248,
            },
          ],
        },
      },
    ]);
    const result = await powerPricesConnector.fetchData({ area: 'DK1' }, ctx);
    const payload = result.playerPayload!;
    expect(payload.area).toBe('DK1');
    expect(payload.hours).toEqual([
      { start: '2026-07-15T14:00:00', dkk: 1.85, eur: 0.248 },
      { start: '2026-07-15T15:00:00', dkk: 1.9, eur: 0.255 },
    ]);
    // The current hour is resolved from UTC; it always points inside the series.
    expect(payload.currentIndex).toBeGreaterThanOrEqual(-1);
    expect(payload.currentIndex).toBeLessThan(payload.hours.length);
  });
});
