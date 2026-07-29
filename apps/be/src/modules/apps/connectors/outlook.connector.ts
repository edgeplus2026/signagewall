import type {
  AppConnector,
  ConnectorContext,
  ConnectorResult,
} from '@signagewall/apps-contract';
import type { GcalEvent, GcalPayload } from '@signagewall/apps';

interface OutlookConfig {
  connectionId?: string;
  /** The chosen calendar: { id, label } from the `remote-select` picker. */
  calendar?: { id?: string; label?: string } | string;
  // View / language / theme / scroll are display-only (the embed applies them).
}

const GRAPH = 'https://graph.microsoft.com/v1.0';

/** The event window to fetch — a week back, two months ahead of today. */
const DAYS_BACK = 7;
const DAYS_AHEAD = 60;
/** Cap stored events; `$orderby=start/dateTime` keeps the soonest. */
const MAX_EVENTS = 500;

function calendarIdOf(config: OutlookConfig): string {
  const value = config.calendar;
  const id = typeof value === 'string' ? value : (value?.id ?? '');
  return id.trim();
}

/**
 * Graph returns local-to-`Prefer` datetimes with 7-digit fractional seconds and
 * no zone. With `Prefer: outlook.timezone="UTC"` they ARE UTC, so trim the
 * fraction to milliseconds and stamp `Z` — a value `new Date()` parses correctly.
 */
function toIso(dateTime: string): string {
  let value = dateTime.replace(/(\.\d{3})\d+/, '$1');
  if (!/[Zz]$/.test(value) && !/[+-]\d\d:?\d\d$/.test(value)) {
    value += 'Z';
  }
  return value;
}

interface GraphEvent {
  subject?: string;
  isAllDay?: boolean;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  location?: { displayName?: string };
}

/** Map a Graph event to the shared calendar event shape; drop undated ones. */
function toEvent(item: GraphEvent): GcalEvent | null {
  const start = item.start?.dateTime;
  if (!start) return null;
  const event: GcalEvent = {
    title: item.subject ?? '(no title)',
    start: toIso(start),
    allDay: item.isAllDay === true,
  };
  const end = item.end?.dateTime;
  if (end) event.end = toIso(end);
  const location = item.location?.displayName;
  if (location) event.location = location;
  return event;
}

function windowIso(now: Date): { start: string; end: string } {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - DAYS_BACK);
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + DAYS_AHEAD);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Outlook Calendar connector (`connected`, Microsoft). Per-connection cache key
 * plus the calendar id (a calendar is private). Fetches a broad window via
 * Microsoft Graph `calendarView` and normalizes to the shared {@link GcalPayload}
 * so the Google Calendar embed renders it unchanged. View/language/theme are
 * display-only. No fetch timestamp in the payload.
 *
 * Updates are pushed live by a Graph subscription on the calendar's event
 * collection ({@link outlookConnector.webhookResource}); the slow poll
 * (`refreshSeconds`) is the reconcile fallback — it re-populates on first save,
 * slides the fetch window forward over time, and recovers any missed
 * notification or a deploy with no public webhook URL.
 */
export const outlookConnector: AppConnector<OutlookConfig, GcalPayload> = {
  oauth: {
    provider: 'microsoft',
    authorizationUrl:
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['https://graph.microsoft.com/Calendars.Read'],
  },

  cacheKey(config) {
    const connectionId = config.connectionId ?? 'none';
    return `outlook:${connectionId}:${calendarIdOf(config) || 'default'}`;
  },

  // Which Graph resource the external subscription orchestrator should watch for
  // this config (`AppInstancesService.ensureWebhookSubscription`). We watch the
  // picked calendar's event collection (default calendar when none is picked)
  // for create/update/delete, so any calendar change pushes a refresh live. The
  // subscription can't target the sliding `calendarView`, so the reconcile poll
  // still handles events entering/leaving the fetch window over time.
  webhookResource(config) {
    const calendarId = calendarIdOf(config);
    const graphResource = calendarId
      ? `/me/calendars/${encodeURIComponent(calendarId)}/events`
      : '/me/events';
    return {
      provider: 'microsoft',
      graphResource,
      changeType: 'created,updated,deleted',
    };
  },

  async fetchData(
    config: OutlookConfig,
    ctx: ConnectorContext,
  ): Promise<ConnectorResult<GcalPayload>> {
    if (!ctx.connection) {
      throw new Error('outlook: no connection resolved');
    }
    const calendarId = calendarIdOf(config);
    const { start, end } = windowIso(new Date());
    const query = new URLSearchParams({
      startDateTime: start,
      endDateTime: end,
      $select: 'subject,start,end,isAllDay,location',
      $orderby: 'start/dateTime',
      $top: String(MAX_EVENTS),
    });
    // A picked calendar, else the account's default calendar view.
    const base = calendarId
      ? `${GRAPH}/me/calendars/${encodeURIComponent(calendarId)}/calendarView`
      : `${GRAPH}/me/calendarView`;

    const response = await fetch(`${base}?${query.toString()}`, {
      headers: {
        authorization: `Bearer ${ctx.connection.accessToken}`,
        // Ask Graph for UTC datetimes so `toIso` can just stamp `Z`.
        Prefer: 'outlook.timezone="UTC"',
      },
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    });
    if (!response.ok) {
      throw new Error(`outlook upstream ${response.status}`);
    }
    const body = (await response.json()) as { value?: GraphEvent[] };

    const events: GcalEvent[] = (body.value ?? [])
      .map(toEvent)
      .filter((event): event is GcalEvent => event !== null);

    const label =
      typeof config.calendar === 'object' ? config.calendar?.label : '';
    ctx.logger.debug('outlook fetched', { calendarId, events: events.length });
    return { playerPayload: { calendarLabel: label || 'Calendar', events } };
  },
};
