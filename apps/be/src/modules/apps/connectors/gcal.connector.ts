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
/** Cap on events stored per fetch (a busy 6-week window can be large). */
const MAX_STORED_EVENTS = 250;

/** Resolve the chosen calendar id from config ({ id } or legacy string). */
function calendarIdOf(config: GcalConfig): string {
  const value = config.calendar;
  const id = typeof value === 'string' ? value : (value?.id ?? '');
  return id.trim() || 'primary';
}

/**
 * The event window to fetch: from a week before the 1st of the current month to
 * six weeks after it. This covers every view the embed renders — the month grid
 * (up to 6 weeks incl. leading/trailing days), the current week, today, and a
 * near-term schedule — from a single fetch. The embed slices per view/timezone.
 */
function eventWindow(now: Date): { timeMin: string; timeMax: string } {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const timeMin = new Date(monthStart);
  timeMin.setDate(timeMin.getDate() - 7);
  const timeMax = new Date(monthStart);
  timeMax.setDate(timeMax.getDate() + 42);
  return { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() };
}

/**
 * Google Calendar connector (`connected` app). Unlike `server` apps, its cache
 * key is PER-CONNECTION (a calendar is private) — it includes the connection id
 * and calendar id so data is never shared across accounts. `fetchData` uses the
 * resolved connection's access token (decrypted by ConnectionsService). It
 * fetches a broad window (see {@link eventWindow}) so the embed can render any
 * view (day/week/month/schedule); the view and other display settings are
 * applied client-side and never affect the cache key.
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
