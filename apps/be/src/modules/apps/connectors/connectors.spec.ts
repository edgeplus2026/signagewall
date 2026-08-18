import {
  oauthDescriptorFor,
  type ConnectorContext,
  type ResolvedConnection,
} from '@signagewall/apps-contract';
import type { RssPayload } from '@signagewall/apps';

import { airqualityConnector } from './airquality.connector';
import { canvaConnector } from './canva.connector';
import { cryptoConnector } from './crypto.connector';
import { currencyConnector } from './currency.connector';
import { facebookConnector } from './facebook.connector';
import { gcalConnector } from './gcal.connector';
import { gslidesConnector } from './gslides.connector';
import {
  type AssetMirror,
  setAssetMirror,
} from './_shared/asset-mirror.registry';
import { holidaysConnector } from './holidays.connector';
import { instagramConnector } from './instagram.connector';
import { linkedinConnector } from './linkedin.connector';
import { onthisdayConnector } from './onthisday.connector';
import { outlookConnector } from './outlook.connector';
import { powerPricesConnector } from './power-prices.connector';
import { rssConnector } from './rss.connector';
import { safeFetchText } from './safe-fetch.util';
import { teamsConnector } from './teams.connector';
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

/**
 * Shape of the request options the connectors pass to `fetch`, narrowed to what
 * the assertions actually read. Typing the mock (rather than leaving it `any`)
 * is what lets a test inspect `mock.calls[n][1].headers` without casting.
 */
interface FetchInit {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
}

function mockFetchSequence(
  responses: Array<{ ok?: boolean; body: unknown; text?: boolean }>,
) {
  const fn = jest.fn<Promise<unknown>, [url: string, init?: FetchInit]>();
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
    organizationId: 'org-1',
    appInstanceId: 'instance-1',
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
    const oauth = oauthDescriptorFor(gcalConnector, 'google');
    expect(oauth?.provider).toBe('google');
    expect(oauth?.scopes).toContain(
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
    const daysAhead = (timeMax.getTime() - Date.now()) / (24 * 60 * 60 * 1000);

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
    organizationId: 'org-1',
    appInstanceId: 'instance-1',
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
    const oauth = oauthDescriptorFor(canvaConnector, 'canva');
    expect(oauth?.provider).toBe('canva');
    expect(oauth?.scopes).toEqual(
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
        // currency-api shape: lowercase rate table keyed by the base.
        body: {
          date: '2026-07-14',
          eur: { usd: 1.14, gbp: 0.85, rsd: 117.2 }, // DKK requested but omitted upstream
        },
      },
    ]);
    const result = await currencyConnector.fetchData(
      { base: 'EUR', targets: ['USD', 'GBP', 'RSD', 'DKK'] },
      ctx,
    );
    expect(result.playerPayload).toEqual({
      base: 'EUR',
      date: '2026-07-14',
      rates: [
        { code: 'GBP', rate: 0.85 },
        { code: 'RSD', rate: 117.2 },
        { code: 'USD', rate: 1.14 },
      ],
    });
  });

  it('falls back to the mirror host when the primary fails', async () => {
    mockFetchSequence([
      { ok: false, body: {} },
      { body: { date: '2026-07-14', eur: { usd: 1.14 } } },
    ]);
    const result = await currencyConnector.fetchData(
      { base: 'EUR', targets: ['USD'] },
      ctx,
    );
    expect(result.playerPayload?.rates).toEqual([{ code: 'USD', rate: 1.14 }]);
  });

  it('carries only the upstream date, so an unchanged day does not fan out', async () => {
    const body = {
      date: '2026-07-14',
      eur: { usd: 1.14 },
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
        {
          id: 'bitcoin',
          symbol: 'BTC',
          name: 'Bitcoin',
          price: 65000,
          change24h: 2.3,
        },
        {
          id: 'ethereum',
          symbol: 'ETH',
          name: 'Ethereum',
          price: 1900,
          change24h: -1.1,
        },
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
  it('cacheKey is the area only, defaulting to Serbia', () => {
    expect(powerPricesConnector.cacheKey!({ area: 'RS' })).toBe('power:RS');
    expect(powerPricesConnector.cacheKey!({ area: 'DE-LU' })).toBe(
      'power:DE-LU',
    );
    // No area → the home-market default.
    expect(powerPricesConnector.cacheKey!({})).toBe('power:RS');
  });

  it('averages sub-hourly points into hourly EUR/kWh and keeps today', async () => {
    // 2026-07-15 10:20 UTC = 12:20 in Europe/Belgrade (CEST, UTC+2).
    const fixedNow = Date.UTC(2026, 6, 15, 10, 20, 0);
    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const hour10Utc = Date.UTC(2026, 6, 15, 10, 0, 0); // local 12:00
    const hour11Utc = Date.UTC(2026, 6, 15, 11, 0, 0); // local 13:00
    mockFetchSequence([
      {
        body: {
          // Four 15-minute points in the 12:00 local hour + one in 13:00.
          unix_seconds: [
            hour10Utc,
            hour10Utc + 900_000,
            hour10Utc + 1_800_000,
            hour10Utc + 2_700_000,
            hour11Utc,
          ].map((ms) => ms / 1000),
          price: [40, 40, 60, 60, 100], // EUR/MWh
        },
      },
    ]);

    const result = await powerPricesConnector.fetchData({ area: 'RS' }, ctx);
    const payload = result.playerPayload!;
    expect(payload.area).toBe('RS');
    expect(payload.areaLabel).toBe('Serbia');
    // avg(40,40,60,60)=50 EUR/MWh → 0.05 EUR/kWh; 100 → 0.1.
    expect(payload.hours).toEqual([
      { start: '2026-07-15T12:00:00', eur: 0.05 },
      { start: '2026-07-15T13:00:00', eur: 0.1 },
    ]);
    // "Now" (12:20 local) falls in the 12:00 hour.
    expect(payload.currentIndex).toBe(0);

    jest.restoreAllMocks();
  });
});

describe('holidays connector (server)', () => {
  it('cacheKey is the country only (count is display-only)', () => {
    expect(holidaysConnector.cacheKey!({ country: 'dk', count: 5 })).toBe(
      'holidays:DK',
    );
    expect(holidaysConnector.cacheKey!({ country: 'DK', count: 12 })).toBe(
      'holidays:DK',
    );
  });

  it('normalizes upcoming holidays, soonest-first', async () => {
    mockFetchSequence([
      {
        body: [
          {
            date: '2026-12-25',
            localName: 'Juledag',
            name: 'Christmas Day',
            countryCode: 'DK',
          },
          {
            date: '2027-01-01',
            localName: 'Nytårsdag',
            name: "New Year's Day",
            countryCode: 'DK',
          },
        ],
      },
    ]);
    const result = await holidaysConnector.fetchData({ country: 'DK' }, ctx);
    expect(result.playerPayload).toEqual({
      country: 'DK',
      countryName: 'Denmark',
      holidays: [
        { date: '2026-12-25', name: 'Christmas Day', localName: 'Juledag' },
        { date: '2027-01-01', name: "New Year's Day", localName: 'Nytårsdag' },
      ],
    });
  });
});

describe('onthisday connector (server)', () => {
  it('cacheKey is the language only; unknown languages fall back to en', () => {
    expect(onthisdayConnector.cacheKey!({ language: 'DE', count: 6 })).toBe(
      'onthisday:de',
    );
    expect(onthisdayConnector.cacheKey!({ language: 'xx' })).toBe(
      'onthisday:en',
    );
  });

  it('sorts events most-recent-first and stamps today as MM-DD', async () => {
    mockFetchSequence([
      {
        body: {
          events: [
            { year: 1492, text: 'Columbus reaches the Americas.' },
            { year: 1969, text: 'Apollo 11 launches.' },
            { year: null, text: 'ignored — no year' },
          ],
        },
      },
    ]);
    const result = await onthisdayConnector.fetchData({ language: 'en' }, ctx);
    const payload = result.playerPayload!;
    expect(payload.monthDay).toMatch(/^\d{2}-\d{2}$/);
    expect(payload.events).toEqual([
      { year: 1969, text: 'Apollo 11 launches.' },
      { year: 1492, text: 'Columbus reaches the Americas.' },
    ]);
  });
});

describe('gslides connector (connected)', () => {
  const connectedCtx: ConnectorContext = {
    ...ctx,
    connection: {
      id: 'c1',
      organizationId: 'org-1',
      appInstanceId: 'instance-1',
      provider: 'google',
      accountLabel: 'me@example.com',
      accessToken: 'tok',
      scopes: [],
    } satisfies ResolvedConnection,
  };

  let mirrorImages: jest.MockedFunction<AssetMirror['mirrorImages']>;

  beforeEach(() => {
    mirrorImages = jest.fn((params) =>
      Promise.resolve(
        params.urls.map(
          (_, i) => `${params.keyPrefix}/${String(i).padStart(3, '0')}.webp`,
        ),
      ),
    );
    setAssetMirror({
      isConfigured: () => true,
      mirrorImages,
      publicUrl: (key: string) => `https://cdn.test/${key}`,
      deleteObjects: () => Promise.resolve(),
    });
  });

  it('cacheKey is per-connection + presentation (maxSlides display-only)', () => {
    const a = gslidesConnector.cacheKey!({
      connectionId: 'c1',
      presentation: { id: 'P1' },
      maxSlides: 9,
    });
    const b = gslidesConnector.cacheKey!({
      connectionId: 'c1',
      presentation: { id: 'P1' },
      maxSlides: 3,
    });
    expect(a).toBe('gslides:c1:P1');
    expect(a).toBe(b);
  });

  it('mirrors each exported slide to storage and reports the Drive revision', async () => {
    // Drive metadata (change detection), then the page ids, then one thumbnail
    // export per page. `ensureDriveChannel` makes no call without a webhookUrl.
    mockFetchSequence([
      { body: { name: 'Deck', version: '7', modifiedTime: 'T1' } },
      { body: { slides: [{ objectId: 'p1' }, { objectId: 'p2' }] } },
      { body: { contentUrl: 'https://img/1' } },
      { body: { contentUrl: 'https://img/2' } },
    ]);

    const result = await gslidesConnector.fetchData(
      { connectionId: 'c1', presentation: { id: 'P1', label: 'ignored' } },
      connectedCtx,
    );

    // Google's expiring thumbnail URLs go to the mirror, never to the player.
    expect(mirrorImages).toHaveBeenCalledTimes(1);
    expect(mirrorImages.mock.calls[0]?.[0].urls).toEqual([
      'https://img/1',
      'https://img/2',
    ]);

    const payload = result.playerPayload!;
    expect(payload.title).toBe('Deck');
    expect(payload.slides).toHaveLength(2);
    for (const url of payload.slides) {
      expect(url).toMatch(/^https:\/\/cdn\.test\/gslides\//);
    }
    // The Drive revision is a STABLE signature now that slide URLs are permanent.
    expect(result.version).toBe('7');
    expect(result.secrets?.mirrored).toMatchObject({ version: '7' });
  });

  it('reuses mirrored slides when the Drive revision is unchanged', async () => {
    // Only the cheap metadata call — no page listing, no thumbnail exports.
    const fetchMock = mockFetchSequence([
      { body: { name: 'Deck', version: '7', modifiedTime: 'T1' } },
    ]);

    const result = await gslidesConnector.fetchData(
      { connectionId: 'c1', presentation: { id: 'P1' } },
      {
        ...connectedCtx,
        secrets: {
          mirrored: {
            version: '7',
            slideKeys: ['gslides/abc/def/000.webp'],
            title: 'Deck',
          },
        },
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mirrorImages).not.toHaveBeenCalled();
    expect(result.playerPayload?.slides).toEqual([
      'https://cdn.test/gslides/abc/def/000.webp',
    ]);
    // Re-persisted, or the payload upsert would null out the mirror state.
    expect(result.secrets?.mirrored).toMatchObject({ version: '7' });
  });

  it('fails the whole fetch when one slide cannot be exported', async () => {
    // A partial export must never be mirrored and cached under this revision —
    // it would replay a deck with a hole in it until the next edit.
    mockFetchSequence([
      { body: { name: 'Deck', version: '8' } },
      { body: { slides: [{ objectId: 'p1' }, { objectId: 'p2' }] } },
      { body: { contentUrl: 'https://img/1' } },
      { ok: false, body: {} },
    ]);

    await expect(
      gslidesConnector.fetchData(
        { connectionId: 'c1', presentation: { id: 'P1' } },
        connectedCtx,
      ),
    ).rejects.toThrow(/thumbnail/);
    expect(mirrorImages).not.toHaveBeenCalled();
  });
});

describe('outlook connector (connected, microsoft)', () => {
  const connectedCtx: ConnectorContext = {
    ...ctx,
    connection: {
      id: 'c1',
      organizationId: 'org-1',
      appInstanceId: 'instance-1',
      provider: 'microsoft',
      accountLabel: 'me@example.com',
      accessToken: 'tok',
      scopes: [],
    } satisfies ResolvedConnection,
  };

  it('cacheKey is per-connection + calendar', () => {
    expect(
      outlookConnector.cacheKey!({
        connectionId: 'c1',
        calendar: { id: 'cal1' },
      }),
    ).toBe('outlook:c1:cal1');
  });

  it('normalizes Graph events to the shared calendar payload', async () => {
    mockFetchSequence([
      {
        body: {
          value: [
            {
              subject: 'Standup',
              start: { dateTime: '2026-07-16T09:00:00.0000000' },
              end: { dateTime: '2026-07-16T09:15:00.0000000' },
              isAllDay: false,
              location: { displayName: 'Room 1' },
            },
          ],
        },
      },
    ]);
    const result = await outlookConnector.fetchData(
      { connectionId: 'c1', calendar: { id: 'cal1', label: 'Team' } },
      connectedCtx,
    );
    expect(result.playerPayload).toEqual({
      calendarLabel: 'Team',
      events: [
        {
          title: 'Standup',
          start: '2026-07-16T09:00:00.000Z',
          end: '2026-07-16T09:15:00.000Z',
          allDay: false,
          location: 'Room 1',
        },
      ],
    });
  });
});

describe('instagram connector (connected, meta)', () => {
  const connectedCtx: ConnectorContext = {
    ...ctx,
    connection: {
      id: 'c1',
      organizationId: 'org-1',
      appInstanceId: 'instance-1',
      provider: 'meta',
      accountLabel: 'Acme',
      accessToken: 'user-tok',
      scopes: [],
    } satisfies ResolvedConnection,
  };

  it('cacheKey is per-connection + account', () => {
    expect(
      instagramConnector.cacheKey!({
        connectionId: 'c1',
        account: { id: 'ig-1' },
      }),
    ).toBe('instagram:c1:ig-1');
  });

  it('normalizes media (video → thumbnail) and labels by @handle', async () => {
    mockFetchSequence([
      {
        body: {
          data: [
            {
              id: 'm1',
              caption: 'Hello',
              media_type: 'IMAGE',
              media_url: 'https://cdn/img1.jpg',
              permalink: 'https://instagram.com/p/1',
              timestamp: '2026-07-16T10:00:00+0000',
              username: 'acme',
            },
            {
              id: 'm2',
              media_type: 'VIDEO',
              media_url: 'https://cdn/vid.mp4',
              thumbnail_url: 'https://cdn/vid-thumb.jpg',
              username: 'acme',
            },
          ],
        },
      },
    ]);
    const result = await instagramConnector.fetchData(
      { connectionId: 'c1', account: { id: 'ig-1' } },
      connectedCtx,
    );
    expect(result.playerPayload).toEqual({
      accountLabel: '@acme',
      posts: [
        {
          id: 'm1',
          text: 'Hello',
          imageUrl: 'https://cdn/img1.jpg',
          permalink: 'https://instagram.com/p/1',
          timestamp: '2026-07-16T10:00:00+0000',
          mediaType: 'image',
        },
        {
          id: 'm2',
          imageUrl: 'https://cdn/vid-thumb.jpg',
          mediaType: 'video',
        },
      ],
    });
    // No `version`: rotating CDN URLs are meant to fan out (see SocialPayload).
    expect(result.version).toBeUndefined();
  });
});

describe('facebook connector (connected, meta)', () => {
  const connectedCtx: ConnectorContext = {
    ...ctx,
    connection: {
      id: 'c1',
      organizationId: 'org-1',
      appInstanceId: 'instance-1',
      provider: 'meta',
      accountLabel: 'Acme',
      accessToken: 'user-tok',
      scopes: [],
    } satisfies ResolvedConnection,
  };

  it('cacheKey is per-connection + page', () => {
    expect(
      facebookConnector.cacheKey!({
        connectionId: 'c1',
        page: { id: 'pg-1' },
      }),
    ).toBe('facebook:c1:pg-1');
  });

  it('resolves a page token then normalizes the feed', async () => {
    const fetchMock = mockFetchSequence([
      // 1. resolve the Page access token from the user token
      { body: { access_token: 'page-tok' } },
      // 2. read the Page feed with that Page token
      {
        body: {
          data: [
            {
              id: 'p1',
              message: 'Big news',
              created_time: '2026-07-16T08:00:00+0000',
              full_picture: 'https://cdn/fb1.jpg',
              permalink_url: 'https://facebook.com/p1',
            },
            { id: 'p2', story: 'Acme updated their cover photo' },
          ],
        },
      },
    ]);
    const result = await facebookConnector.fetchData(
      { connectionId: 'c1', page: { id: 'pg-1', label: 'Acme Page' } },
      connectedCtx,
    );
    expect(result.playerPayload).toEqual({
      accountLabel: 'Acme Page',
      posts: [
        {
          id: 'p1',
          text: 'Big news',
          imageUrl: 'https://cdn/fb1.jpg',
          permalink: 'https://facebook.com/p1',
          timestamp: '2026-07-16T08:00:00+0000',
          mediaType: 'image',
        },
        { id: 'p2', text: 'Acme updated their cover photo', mediaType: 'text' },
      ],
    });
    // The feed read must use the resolved Page token, not the user token.
    const feedCall = fetchMock.mock.calls[1];
    expect(feedCall[1]?.headers?.authorization).toBe('Bearer page-tok');
  });
});

describe('linkedin connector (connected, linkedin)', () => {
  const connectedCtx: ConnectorContext = {
    ...ctx,
    connection: {
      id: 'c1',
      organizationId: 'org-1',
      appInstanceId: 'instance-1',
      provider: 'linkedin',
      accountLabel: 'Robin Kline',
      accessToken: 'tok',
      scopes: [],
    } satisfies ResolvedConnection,
  };

  it('cacheKey is per-connection + organization', () => {
    expect(
      linkedinConnector.cacheKey!({
        connectionId: 'c1',
        organization: { id: 'urn:li:organization:2414183' },
      }),
    ).toBe('linkedin:c1:urn:li:organization:2414183');
  });

  it('cacheKey normalizes a bare numeric page id to an organization URN', () => {
    expect(
      linkedinConnector.cacheKey!({
        connectionId: 'c1',
        organization: '2414183',
      }),
    ).toBe('linkedin:c1:urn:li:organization:2414183');
  });

  it('normalizes posts: little-format text, epoch→ISO, drops drafts and image-only', async () => {
    const fetchMock = mockFetchSequence([
      {
        body: {
          elements: [
            {
              id: 'urn:li:share:6856921137721544704',
              lifecycleState: 'PUBLISHED',
              publishedAt: 1784192400000,
              commentary:
                'Ship it {hashtag|\\#|coding} with @[Devtestco](urn:li:organization:2414183)',
            },
            // No commentary, but an article carries its own headline → fold it in.
            {
              id: 'urn:li:share:2',
              lifecycleState: 'PUBLISHED',
              publishedAt: 1784192400000,
              content: {
                article: {
                  source: 'https://example.com/post',
                  title: 'We are hiring',
                  description: 'Three roles open in Niš',
                },
              },
            },
            // Draft — must be skipped.
            {
              id: 'urn:li:share:3',
              lifecycleState: 'DRAFT',
              commentary: 'not live yet',
            },
            // Image-only: the image URN is unresolvable without a write scope, so
            // there is nothing renderable — must be skipped.
            {
              id: 'urn:li:share:4',
              lifecycleState: 'PUBLISHED',
              content: { media: { id: 'urn:li:image:C5F22AQEYStbwuCM12w' } },
            },
          ],
        },
      },
    ]);
    const result = await linkedinConnector.fetchData(
      {
        connectionId: 'c1',
        organization: { id: 'urn:li:organization:2414183', label: 'Devtestco' },
      },
      connectedCtx,
    );
    expect(result.playerPayload).toEqual({
      accountLabel: 'Devtestco',
      posts: [
        {
          id: 'urn:li:share:6856921137721544704',
          text: 'Ship it #coding with Devtestco',
          permalink:
            'https://www.linkedin.com/feed/update/urn:li:share:6856921137721544704/',
          timestamp: '2026-07-16T09:00:00.000Z',
          mediaType: 'text',
        },
        {
          id: 'urn:li:share:2',
          text: 'We are hiring — Three roles open in Niš',
          permalink: 'https://www.linkedin.com/feed/update/urn:li:share:2/',
          timestamp: '2026-07-16T09:00:00.000Z',
          mediaType: 'text',
        },
      ],
    });
    // Text-only → stable payload, so no version and no fan-out (unlike Meta's).
    expect(result.version).toBeUndefined();

    // LinkedIn rejects a versioned call that omits either header, and the finder
    // must ask for the picked Page's posts.
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('author=urn%3Ali%3Aorganization%3A2414183');
    expect(url).toContain('q=author');
    expect(init?.headers?.['LinkedIn-Version']).toBeDefined();
    expect(init?.headers?.['X-Restli-Protocol-Version']).toBe('2.0.0');
  });
});

describe('teams connector (connected, microsoft)', () => {
  const connectedCtx: ConnectorContext = {
    ...ctx,
    connection: {
      id: 'c1',
      organizationId: 'org-1',
      appInstanceId: 'instance-1',
      provider: 'microsoft',
      accountLabel: 'me@example.com',
      accessToken: 'tok',
      scopes: [],
    } satisfies ResolvedConnection,
  };

  it('cacheKey splits the composite team::channel id', () => {
    expect(
      teamsConnector.cacheKey!({
        connectionId: 'c1',
        channel: { id: 'team-1::19:abc@thread.tacv2' },
      }),
    ).toBe('teams:c1:team-1:19:abc@thread.tacv2');
  });

  it('normalizes messages: strips HTML, folds in subject, drops system/deleted', async () => {
    mockFetchSequence([
      {
        body: {
          value: [
            {
              id: 'm1',
              messageType: 'message',
              subject: 'Heads up',
              createdDateTime: '2026-07-16T09:00:00Z',
              webUrl: 'https://teams.microsoft.com/l/message/1',
              body: {
                contentType: 'html',
                content: '<p>Office closed <b>Friday</b></p>',
              },
              from: { user: { displayName: 'Robin Kline' } },
            },
            // System event — must be skipped.
            {
              id: 'm2',
              messageType: 'systemEventMessage',
              body: { contentType: 'html', content: '<systemEventMessage/>' },
            },
            // Deleted — must be skipped.
            {
              id: 'm3',
              messageType: 'message',
              deletedDateTime: '2026-07-16T10:00:00Z',
              body: { contentType: 'text', content: 'gone' },
            },
          ],
        },
      },
    ]);
    const result = await teamsConnector.fetchData(
      {
        connectionId: 'c1',
        channel: { id: 'team-1::chan-1', label: 'Ops · General' },
      },
      connectedCtx,
    );
    expect(result.playerPayload).toEqual({
      accountLabel: 'Ops · General',
      posts: [
        {
          id: 'm1',
          author: 'Robin Kline',
          text: 'Heads up — Office closed Friday',
          permalink: 'https://teams.microsoft.com/l/message/1',
          timestamp: '2026-07-16T09:00:00Z',
          mediaType: 'text',
        },
      ],
    });
    // Stable payload (no rotating URLs) → no version, no fan-out.
    expect(result.version).toBeUndefined();
  });
});
