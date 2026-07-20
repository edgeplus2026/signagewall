import { randomUUID } from 'node:crypto';

import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { GcalEvent, GcalPayload } from '@edge/apps';

interface GcalConfig {
  connectionId?: string;
  /** The chosen calendar: { id, label } from the `remote-select` picker. */
  calendar?: { id?: string } | string;
}

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars';
const CHANNELS_STOP_API =
  'https://www.googleapis.com/calendar/v3/channels/stop';

/**
 * Cap on events stored per fetch. Raised with the window below: a wider look-ahead
 * is only useful if the events in it actually survive the cut, and `orderBy=startTime`
 * means a low cap silently truncates the FAR end — the months you widened the window
 * to see.
 */
const MAX_STORED_EVENTS = 500;

/** How far back and forward the schedule wants to see, from today. */
const DAYS_BACK = 7;
const DAYS_AHEAD = 60;

/** Re-register a push channel once it is inside this of its expiry. */
const RENEW_BEFORE_MS = 24 * 60 * 60 * 1000;

/** Resolve the chosen calendar id from config ({ id } or legacy string). */
function calendarIdOf(config: GcalConfig): string {
  const value = config.calendar;
  const id = typeof value === 'string' ? value : (value?.id ?? '');
  return id.trim() || 'primary';
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/** Monday-based, matching the month grid the embed draws. */
function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  return addDays(s, -((s.getDay() + 6) % 7));
}

/**
 * The event window to fetch.
 *
 * Two views want different things and one fetch has to satisfy both, so we take the
 * WIDER of them on each side: the month grid needs every day it draws (the Monday
 * before the 1st through the Sunday after the last), and the schedule wants a long
 * look ahead from TODAY.
 *
 * The old window was anchored on the 1st of the month and ran 42 days from it, and it
 * was wrong twice over. It SHRANK as the month went on — on the 31st, a view named
 * "Upcoming" could see twelve days — and anything past its end was never fetched at
 * all: an event booked in July for September did not appear on the screen, and no
 * amount of waiting would have made it, because the fetch never asked for it.
 */
function eventWindow(now: Date): { timeMin: string; timeMax: string } {
  const monthFirst = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLast = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const gridStart = startOfWeek(monthFirst);
  const gridEnd = addDays(startOfWeek(monthLast), 6);

  const back = addDays(startOfDay(now), -DAYS_BACK);
  const ahead = addDays(startOfDay(now), DAYS_AHEAD);

  const timeMin = gridStart < back ? gridStart : back;
  const lastDay = gridEnd > ahead ? gridEnd : ahead;
  return {
    timeMin: timeMin.toISOString(),
    // `timeMax` is exclusive: to include the last day whole, end at its midnight.
    timeMax: addDays(lastDay, 1).toISOString(),
  };
}

interface WatchChannel {
  id: string;
  resourceId: string;
  /** Epoch ms, as Google returns it. */
  expiration: number;
  /** The callback this channel was registered against. */
  address: string;
}

function readChannel(
  secrets: Record<string, unknown> | undefined,
): WatchChannel | undefined {
  const channel = secrets?.channel as Partial<WatchChannel> | undefined;
  if (
    !channel ||
    typeof channel.id !== 'string' ||
    typeof channel.resourceId !== 'string' ||
    typeof channel.expiration !== 'number' ||
    typeof channel.address !== 'string'
  ) {
    return undefined;
  }
  return channel as WatchChannel;
}

/**
 * Keep a Google push channel alive for this calendar, and hand back what to remember.
 *
 * Google's `events.watch` is a SUBSCRIPTION WITH AN EXPIRY, not a standing hook: it
 * lasts days, then goes quiet without telling anyone. So this runs on every poll and
 * re-registers once the channel is inside a day of dying — the poll is what keeps the
 * push alive, which is the tidy part of leaving both mechanisms in place.
 *
 * It NEVER throws into the fetch. A calendar that can't be watched (no public URL, a
 * scope Google won't grant, a rate limit) must still be READ; failing the fetch over
 * a failed subscription would trade a screen that is five minutes stale for a screen
 * that is blank.
 */
async function ensureChannel(
  calendarId: string,
  ctx: ConnectorContext,
): Promise<WatchChannel | undefined> {
  const address = ctx.webhookUrl;
  const existing = readChannel(ctx.secrets);

  // No public address: this deployment can't be pushed to. Keep polling, say nothing.
  if (!address) {
    return undefined;
  }

  // Alive, and registered against the address we would use now. (A changed
  // `PUBLIC_API_URL` has to re-register, or the pings go to the old host for days.)
  if (
    existing &&
    existing.address === address &&
    existing.expiration - Date.now() > RENEW_BEFORE_MS
  ) {
    return existing;
  }

  try {
    const id = randomUUID();
    const response = await fetch(
      `${CALENDAR_API}/${encodeURIComponent(calendarId)}/events/watch`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${ctx.connection?.accessToken ?? ''}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ id, type: 'web_hook', address }),
        ...(ctx.signal ? { signal: ctx.signal } : {}),
      },
    );
    if (!response.ok) {
      ctx.logger.warn('gcal watch failed', {
        calendarId,
        status: response.status,
      });
      return existing;
    }
    const body = (await response.json()) as {
      resourceId?: string;
      expiration?: string;
    };
    if (!body.resourceId) {
      return existing;
    }

    const channel: WatchChannel = {
      id,
      resourceId: body.resourceId,
      expiration: Number(body.expiration ?? 0),
      address,
    };

    // The new channel is live, so retire the old one — otherwise every renewal leaves
    // a channel behind that goes on pinging us until it expires on its own, and each
    // ping costs a fetch. Best-effort: a channel we fail to stop still expires.
    if (existing) {
      void fetch(CHANNELS_STOP_API, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${ctx.connection?.accessToken ?? ''}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          id: existing.id,
          resourceId: existing.resourceId,
        }),
      }).catch(() => undefined);
    }

    ctx.logger.debug('gcal watching', {
      calendarId,
      expiresIn: channel.expiration - Date.now(),
    });
    return channel;
  } catch (error) {
    ctx.logger.warn('gcal watch errored', {
      calendarId,
      error: error instanceof Error ? error.message : String(error),
    });
    return existing;
  }
}

/**
 * Google Calendar connector (`connected` app). Unlike `server` apps, its cache
 * key is PER-CONNECTION (a calendar is private) — it includes the connection id
 * and calendar id so data is never shared across accounts. `fetchData` uses the
 * resolved connection's access token (decrypted by ConnectionsService). It
 * fetches a broad window (see {@link eventWindow}) so the embed can render any
 * view (day/week/month/schedule); the view and other display settings are
 * applied client-side and never affect the cache key.
 *
 * It also SUBSCRIBES: each fetch keeps a Google push channel alive for the calendar
 * (see {@link ensureChannel}), so an event added in Google reaches the screen in
 * seconds rather than at the next poll. The poll stays — it is what renews the
 * channel, and it is what catches the change when a ping is lost or the channel has
 * quietly expired. Push is the accelerator; polling is the floor.
 */
export const gcalConnector: AppConnector<GcalConfig, GcalPayload> = {
  oauth: {
    provider: 'google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  },

  // Where Google posts this connector's channel notifications; the host builds
  // the absolute `ctx.webhookUrl` from it.
  webhookPath: 'webhooks/google/calendar',

  cacheKey(config) {
    const connectionId = config.connectionId ?? 'none';
    return `gcal:${connectionId}:${calendarIdOf(config)}`;
  },

  async fetchData(
    config: GcalConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<GcalPayload>> {
    if (!ctx.connection) {
      throw new Error('gcal: no connection resolved');
    }
    const calendarId = calendarIdOf(config);
    const { timeMin, timeMax } = eventWindow(new Date());

    const query = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(MAX_STORED_EVENTS),
    });
    const url = `${CALENDAR_API}/${encodeURIComponent(calendarId)}/events?${query.toString()}`;

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${ctx.connection.accessToken}` },
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    });
    if (!response.ok) {
      throw new Error(`gcal upstream ${response.status}`);
    }
    const body = (await response.json()) as {
      summary?: string;
      items?: GoogleEvent[];
    };

    const events: GcalEvent[] = (body.items ?? [])
      .slice(0, MAX_STORED_EVENTS)
      .map(toEvent)
      .filter((event): event is GcalEvent => event !== null);

    const channel = await ensureChannel(calendarId, ctx);

    ctx.logger.debug('gcal fetched', { calendarId, events: events.length });
    // No `fetchedAt` in the payload. This connector returns no `version`, so the host
    // falls back to deep-comparing the payload to decide whether to push it to every
    // screen — and a timestamp is never equal to itself, so a calendar nobody had
    // touched was re-pushed every five minutes, rebuilding every screen showing it.
    // See the note on `GcalPayload`; the age of the data travels out-of-band in `meta`.
    return {
      playerPayload: {
        calendarLabel: body.summary ?? 'Calendar',
        events,
      },
      ...(channel ? { secrets: { channel } } : {}),
    };
  },
};

interface GoogleEvent {
  summary?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

function toEvent(item: GoogleEvent): GcalEvent | null {
  const start = item.start?.dateTime ?? item.start?.date;
  if (!start) {
    return null;
  }
  const allDay = !item.start?.dateTime;
  const end = item.end?.dateTime ?? item.end?.date;
  return {
    title: item.summary ?? '(no title)',
    start,
    ...(end ? { end } : {}),
    allDay,
    ...(item.location ? { location: item.location } : {}),
  };
}
