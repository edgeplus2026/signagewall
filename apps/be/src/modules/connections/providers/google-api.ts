/**
 * Thin client for the Google Calendar REST API, used by the connections browse
 * endpoint (list the account's calendars for the config-form picker). Pure
 * functions over `fetch` — the caller supplies an already-resolved (refreshed)
 * access token; nothing here touches encryption or the DB.
 */

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

/*
 * There is deliberately no "list the user's Drive files" helper here any more.
 * Listing a Drive needs `drive.metadata.readonly`, a RESTRICTED scope whose
 * price is an annual third-party CASA security assessment — for file names.
 * The CMS opens Google's own picker instead (`config-form/googleFilePicker.ts`)
 * and sends us the id the user chose, which `drive.file` is enough to read.
 */

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
