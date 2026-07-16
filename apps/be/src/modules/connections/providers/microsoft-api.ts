/**
 * Thin client for Microsoft Graph, used by the connections browse endpoint (list
 * the account's calendars for the config-form picker). Pure functions over
 * `fetch`; the caller supplies an already-resolved (refreshed) access token.
 */

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

/** A calendar as surfaced to the CMS picker (token-free). */
export interface MicrosoftCalendarSummary {
  id: string;
  title: string;
  /** The default calendar sorts first and reads as "Primary". */
  primary?: boolean;
}

interface GraphCalendar {
  id: string;
  name?: string;
  isDefaultCalendar?: boolean;
}

/**
 * List the calendars the connected account can read. Graph has no free-text
 * search here, so `query` filters by title client-side. The default calendar
 * sorts first; the rest alphabetically. Mirrors the Google calendar picker.
 */
export async function listMicrosoftCalendars(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<MicrosoftCalendarSummary[]> {
  const response = await fetch(
    `${GRAPH_API}/me/calendars?$select=id,name,isDefaultCalendar&$top=100`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      ...(signal ? { signal } : {}),
    },
  );
  if (!response.ok) {
    throw new Error(`microsoft graph upstream ${response.status}`);
  }
  const body = (await response.json()) as { value?: GraphCalendar[] };

  const calendars: MicrosoftCalendarSummary[] = (body.value ?? []).map(
    (calendar) => ({
      id: calendar.id,
      title: calendar.name ?? calendar.id,
      ...(calendar.isDefaultCalendar ? { primary: true } : {}),
    }),
  );

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? calendars.filter((cal) => cal.title.toLowerCase().includes(trimmed))
    : calendars;

  return filtered.sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}
