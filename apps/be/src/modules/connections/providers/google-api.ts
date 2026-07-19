/**
 * Thin client for the Google Calendar REST API, used by the connections browse
 * endpoint (list the account's calendars for the config-form picker). Pure
 * functions over `fetch` — the caller supplies an already-resolved (refreshed)
 * access token; nothing here touches encryption or the DB.
 */

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

/** A calendar as surfaced to the CMS picker (token-free). */
export interface GoogleCalendarSummary {
  id: string;
  title: string;
  /** The user's primary calendar sorts first and reads as "Primary". */
  primary?: boolean;
}

interface CalendarListEntry {
  id: string;
  summary?: string;
  summaryOverride?: string;
  primary?: boolean;
}

/**
 * List the calendars the connected account can read. Google's calendarList has
 * no server-side search, so `query` filters by title client-side. The primary
 * calendar sorts first; the rest alphabetically.
 */
export async function listGoogleCalendars(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<GoogleCalendarSummary[]> {
  const response = await fetch(
    `${CALENDAR_API}/users/me/calendarList?minAccessRole=reader&maxResults=250`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      ...(signal ? { signal } : {}),
    },
  );
  if (!response.ok) {
    throw new Error(`google calendar upstream ${response.status}`);
  }
  const body = (await response.json()) as { items?: CalendarListEntry[] };

  const calendars: GoogleCalendarSummary[] = (body.items ?? []).map((item) => ({
    id: item.id,
    title: item.summaryOverride ?? item.summary ?? item.id,
    ...(item.primary ? { primary: true } : {}),
  }));

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? calendars.filter((cal) => cal.title.toLowerCase().includes(trimmed))
    : calendars;

  return filtered.sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

/** A Drive file (spreadsheet, presentation, …) as surfaced to a CMS picker. */
export interface GoogleDriveFileSummary {
  id: string;
  title: string;
}

interface DriveFile {
  id: string;
  name?: string;
}

/**
 * List the connected account's Drive files of one MIME type (most-recently-
 * modified first) for a config-form picker. Drive has a server-side query, but we
 * fetch the recent files and filter by title client-side — the same simple,
 * injection-free approach as the calendar picker. `mimeType` is a fixed constant
 * per caller, never user input.
 */
async function listDriveFilesByType(
  accessToken: string,
  mimeType: string,
  query: string,
  signal?: AbortSignal,
): Promise<GoogleDriveFileSummary[]> {
  const params = new URLSearchParams({
    q: `mimeType='${mimeType}' and trashed=false`,
    fields: 'files(id,name)',
    orderBy: 'modifiedTime desc',
    pageSize: '100',
  });
  const response = await fetch(`${DRIVE_API}/files?${params.toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`google drive upstream ${response.status}`);
  }
  const body = (await response.json()) as { files?: DriveFile[] };

  const files: GoogleDriveFileSummary[] = (body.files ?? []).map((file) => ({
    id: file.id,
    title: file.name ?? file.id,
  }));
  const trimmed = query.trim().toLowerCase();
  return trimmed
    ? files.filter((file) => file.title.toLowerCase().includes(trimmed))
    : files;
}

/** List the account's Google Sheets for the spreadsheet picker. */
export function listGoogleSpreadsheets(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<GoogleDriveFileSummary[]> {
  return listDriveFilesByType(
    accessToken,
    'application/vnd.google-apps.spreadsheet',
    query,
    signal,
  );
}

/** List the account's Google Slides decks for the presentation picker. */
export function listGooglePresentations(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<GoogleDriveFileSummary[]> {
  return listDriveFilesByType(
    accessToken,
    'application/vnd.google-apps.presentation',
    query,
    signal,
  );
}
