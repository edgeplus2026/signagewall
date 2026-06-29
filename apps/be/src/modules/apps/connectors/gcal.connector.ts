import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@edge/apps-contract';
import type { GcalEvent, GcalPayload } from '@edge/apps';

interface GcalConfig {
  connectionId?: string;
  calendarId?: string;
  maxEvents?: number;
}

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars';
const MAX_STORED_EVENTS = 20;

/**
 * Google Calendar connector (`connected` app). Unlike `server` apps, its cache
 * key is PER-CONNECTION (a calendar is private) — it includes the connection id
 * and calendar id so data is never shared across accounts. `fetchData` uses the
 * resolved connection's access token (decrypted by ConnectionsService).
 */
export const gcalConnector: AppConnector<GcalConfig, GcalPayload> = {
  oauth: {
    provider: 'google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  },

  cacheKey(config) {
    const connectionId = config.connectionId ?? 'none';
    const calendarId = (config.calendarId ?? 'primary').trim() || 'primary';
    return `gcal:${connectionId}:${calendarId}`;
  },

  async fetchData(
    config: GcalConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<GcalPayload>> {
    if (!ctx.connection) {
      throw new Error('gcal: no connection resolved');
    }
    const calendarId = (config.calendarId ?? 'primary').trim() || 'primary';
    const max = clampMax(config.maxEvents);

    const query = new URLSearchParams({
      timeMin: new Date().toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(max),
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

    ctx.logger.debug('gcal fetched', { calendarId, events: events.length });
    return {
      playerPayload: {
        calendarLabel: body.summary ?? 'Calendar',
        events,
        fetchedAt: new Date().toISOString(),
      },
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

function clampMax(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 8;
  }
  return Math.min(20, Math.max(1, Math.floor(value)));
}
