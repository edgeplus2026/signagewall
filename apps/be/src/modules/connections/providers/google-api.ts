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

/** A sheet's cells as displayed text: first row + data rows. */
export interface SheetTable {
  headers: string[];
  rows: string[][];
}

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Read a worksheet's cells as displayed text via the Sheets values API (the
 * tabular sync). `worksheet` may be blank for the spreadsheet's first sheet —
 * an unqualified range addresses it. Rows are capped at the source (`maxRows`
 * data rows after the header row) so a huge sheet can't balloon the fetch.
 */
export async function fetchSheetTable(
  accessToken: string,
  spreadsheetId: string,
  worksheet: string,
  maxRows: number,
  signal?: AbortSignal,
): Promise<SheetTable> {
  // A1 range: rows 1..maxRows+1 across all columns; sheet names are quoted with
  // internal quotes doubled, so any tab name is safe to embed.
  const rowRange = `1:${String(maxRows + 1)}`;
  const name = worksheet.trim();
  const range = name ? `'${name.replace(/'/g, "''")}'!${rowRange}` : rowRange;

  const url =
    `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}` +
    `?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`google sheets upstream ${response.status}`);
  }
  const body = (await response.json()) as {
    values?: Array<Array<string | number | boolean | null>>;
  };
  const values = (body.values ?? []).map((row) =>
    row.map((cell) =>
      cell === null || cell === undefined ? '' : String(cell),
    ),
  );

  const headers = values[0] ?? [];
  return { headers, rows: values.slice(1) };
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
