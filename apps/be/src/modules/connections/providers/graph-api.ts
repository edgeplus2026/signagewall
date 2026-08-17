/**
 * Thin client for the OneDrive drive APIs, used by the connections browse
 * endpoint to list a connected account's PowerPoint files for the config-form
 * picker. Pure functions over `fetch` — the caller supplies an already-resolved
 * (refreshed) access token; nothing here touches encryption or the DB.
 *
 * We use `/me/drive/root/search` (NOT the Microsoft Search `/search/query`) on
 * purpose: `/search/query` only supports work/school accounts, so it returns
 * nothing for personal Microsoft accounts. Drive search works for BOTH personal
 * OneDrive and a business user's OneDrive. Each hit carries its own `driveId`
 * (via `parentReference`), which we pack into the option id (`"{driveId}|{itemId}"`)
 * so the connector and webhook can address the item in its own drive.
 *
 * Trade-off: this browses the user's OWN OneDrive plus what was explicitly
 * shared with them (`/sharedWithMe`, which includes SharePoint files). Browsing
 * arbitrary SharePoint sites the user never touched needs `/search/query`
 * (work accounts only) and can be layered on later without changing the option
 * id shape.
 */

const GRAPH_DRIVE_URL = 'https://graph.microsoft.com/v1.0/me/drive';

/** Options returned to the CMS picker per query. */
const MAX_OPTIONS = 50;
/** `@odata.nextLink` pages followed per source (50 items each). */
const MAX_PAGES = 4;
/** Delta-walk pages (500 items each): up to 4000 drive items scanned. */
const DELTA_MAX_PAGES = 8;

/** A drive item surfaced to the CMS picker (token-free). */
export interface DrivePptxOption {
  /** Packed `"{driveId}|{itemId}"` so the item is addressable in its own drive. */
  id: string;
  title: string;
}

/** Alias — the picker option shape is extension-agnostic. */
export type DriveFileOption = DrivePptxOption;

interface DriveItem {
  id?: string;
  name?: string;
  parentReference?: { driveId?: string };
  /** Present on `/sharedWithMe` hits: the item as addressed in the OWNER's drive. */
  remoteItem?: {
    id?: string;
    name?: string;
    parentReference?: { driveId?: string };
  };
}

interface DriveItemsPage {
  value?: DriveItem[];
  '@odata.nextLink'?: string;
}

/** Separator packing driveId + itemId into a single remote-select option id. */
export const DRIVE_ITEM_SEPARATOR = '|';

/**
 * Unpack a `"{driveId}|{itemId}"` option id. Splits on the FIRST separator only,
 * so an itemId is preserved intact even in the unlikely event it contains the
 * separator (driveId, which is packed first, never does). Returns null when the
 * value isn't a well-formed pair.
 */
export function unpackDriveItem(
  packed: string,
): { driveId: string; itemId: string } | null {
  const sep = packed.indexOf(DRIVE_ITEM_SEPARATOR);
  if (sep <= 0) return null;
  const driveId = packed.slice(0, sep);
  const itemId = packed.slice(sep + DRIVE_ITEM_SEPARATOR.length);
  if (!driveId || !itemId) return null;
  return { driveId, itemId };
}

/**
 * List the connected account's `.pptx` files for the picker.
 *
 * We merge four sources because none alone is enough:
 *  - `/recent` reflects activity immediately, so a freshly added/edited deck
 *    shows up right away, but it only covers recently-touched files.
 *  - `/root/delta` enumerates the WHOLE own drive without a search index —
 *    measured on a real personal account, `/root/search` returned ZERO hits
 *    for `pptx` while delta found every deck, so this is the source that
 *    actually guarantees own-drive completeness. Capped page walk.
 *  - `/root/search` still helps on work accounts (index-backed, server-side
 *    narrowing for typed queries) — kept as a best-effort supplement.
 *  - `/sharedWithMe` covers files shared with the user — including SharePoint
 *    files — which live in OTHER drives and are invisible to the first three.
 *
 * Recent items sort first (newest on top), then the own-drive enumeration
 * (alphabetical), then search hits, then shared files; all filtered to names
 * ending in `.pptx` and narrowed client-side by the typed query where the
 * source can't narrow server-side. Each source is best-effort: if one call
 * fails the others still populate the picker. Returns `{ id, title }`.
 */
export function searchDrivePptx(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<DrivePptxOption[]> {
  return searchDriveByExtension(accessToken, query, '.pptx', signal);
}

/** List the connected account's `.xlsx` workbooks (the Excel tabular sync). */
export function searchDriveXlsx(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<DriveFileOption[]> {
  return searchDriveByExtension(accessToken, query, '.xlsx', signal);
}

async function searchDriveByExtension(
  accessToken: string,
  query: string,
  extension: string,
  signal?: AbortSignal,
): Promise<DriveFileOption[]> {
  const term = query.trim();
  // Empty query → search the extension token (every such filename contains it).
  const [recent, enumerated, searched, shared] = await Promise.all([
    driveRecent(accessToken, signal).catch(() => [] as DriveItem[]),
    driveDelta(accessToken, signal).catch(() => [] as DriveItem[]),
    driveSearch(accessToken, term || extension.slice(1), signal).catch(
      () => [] as DriveItem[],
    ),
    driveSharedWithMe(accessToken, signal).catch(() => [] as DriveItem[]),
  ]);

  const lower = term.toLowerCase();
  /** Only `/root/search` narrows server-side: narrow the rest by name here. */
  const matchesTerm = (option: DriveFileOption): boolean =>
    !term || option.title.toLowerCase().includes(lower);

  const toOptions = (items: DriveItem[]): DriveFileOption[] =>
    items
      .map((item) => toFileOption(item, extension))
      .filter((o): o is DriveFileOption => o !== null)
      .filter(matchesTerm);

  const recentOptions = toOptions(recent);
  // Delta walks the drive in tree order — sort so browsing is predictable.
  const enumeratedOptions = toOptions(enumerated).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
  const searchOptions = searched
    .map((item) => toFileOption(item, extension))
    .filter((o): o is DriveFileOption => o !== null);
  const sharedOptions = toOptions(shared);

  const options: DriveFileOption[] = [];
  const seen = new Set<string>();
  for (const option of [
    ...recentOptions,
    ...enumeratedOptions,
    ...searchOptions,
    ...sharedOptions,
  ]) {
    const key = dedupeKey(option);
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(option);
    if (options.length >= MAX_OPTIONS) break;
  }
  return options;
}

/**
 * Sources disagree on the id of the SAME file: consumer OneDrive returns
 * `04D664…!s69b…` from `/recent` but `4D664…!s69b…` (no leading zero on the
 * drive prefix) from `/root/delta`. So dedupe on the drive id plus the part of
 * the item id after `!` — the prefix before it just repeats the drive id —
 * case-insensitively. Business ids carry no `!` and pass through whole. The
 * option keeps its original id (either form is accepted by Graph).
 */
function dedupeKey(option: DrivePptxOption): string {
  const unpacked = unpackDriveItem(option.id);
  if (!unpacked) return option.id.toLowerCase();
  const { driveId, itemId } = unpacked;
  const bang = itemId.indexOf('!');
  const itemKey = bang >= 0 ? itemId.slice(bang + 1) : itemId;
  return `${driveId.toLowerCase()}${DRIVE_ITEM_SEPARATOR}${itemKey.toLowerCase()}`;
}

/**
 * Map a Graph drive item to a picker option, or null if it doesn't carry the
 * wanted extension. A `/sharedWithMe` hit is addressed through its `remoteItem`
 * facet — the id and driveId of the item in the OWNER's drive (the top-level
 * ids point at the recipient's stub and are useless to the connector/webhook).
 */
function toFileOption(
  item: DriveItem,
  extension: string,
): DriveFileOption | null {
  const source = item.remoteItem ?? item;
  const itemId = source.id;
  const driveId = source.parentReference?.driveId;
  const name = source.name ?? item.name;
  // Need a drive id to address the item later (subscription + fetch).
  if (!itemId || !driveId || !name) return null;
  if (!name.toLowerCase().endsWith(extension)) return null;
  return { id: `${driveId}${DRIVE_ITEM_SEPARATOR}${itemId}`, title: name };
}

/** GET a drive-items collection, following `@odata.nextLink` up to `pages`. */
async function fetchItemPages(
  url: string,
  accessToken: string,
  signal: AbortSignal | undefined,
  pages: number,
): Promise<DriveItem[]> {
  const items: DriveItem[] = [];
  let next: string | undefined = url;
  for (let page = 0; next && page < pages; page++) {
    const response = await fetch(next, {
      headers: { authorization: `Bearer ${accessToken}` },
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) {
      throw new Error(`graph drive items upstream ${response.status}`);
    }
    const body = (await response.json()) as DriveItemsPage;
    items.push(...(body.value ?? []));
    next = body['@odata.nextLink'];
  }
  return items;
}

/** Index-backed recursive search of the user's OneDrive (paginated). */
async function driveSearch(
  accessToken: string,
  term: string,
  signal?: AbortSignal,
): Promise<DriveItem[]> {
  // OData: escape single quotes by doubling; encodeURIComponent handles spaces.
  const q = encodeURIComponent(term.replace(/'/g, "''"));
  const url = `${GRAPH_DRIVE_URL}/root/search(q='${q}')?$select=id,name,parentReference&$top=50`;
  return fetchItemPages(url, accessToken, signal, MAX_PAGES);
}

/** Recently-used items (surfaces just-added files before the search index catches up). */
async function driveRecent(
  accessToken: string,
  signal?: AbortSignal,
): Promise<DriveItem[]> {
  const url = `${GRAPH_DRIVE_URL}/recent?$top=50`;
  return fetchItemPages(url, accessToken, signal, 1);
}

/**
 * Index-free enumeration of the user's own drive via `/root/delta`. Personal
 * OneDrive's search index misses files entirely (observed: zero hits for
 * `pptx` on a drive holding several decks), so completeness has to come from
 * walking the drive. `$top=500` and a page cap bound the walk on huge drives;
 * the picker's own result cap (`MAX_OPTIONS`) keeps the response small.
 */
async function driveDelta(
  accessToken: string,
  signal?: AbortSignal,
): Promise<DriveItem[]> {
  const url = `${GRAPH_DRIVE_URL}/root/delta?$select=id,name,parentReference,file,folder&$top=500`;
  return fetchItemPages(url, accessToken, signal, DELTA_MAX_PAGES);
}

/** Files shared with the user (covers SharePoint / other-drive files). */
async function driveSharedWithMe(
  accessToken: string,
  signal?: AbortSignal,
): Promise<DriveItem[]> {
  const url = `${GRAPH_DRIVE_URL}/sharedWithMe?$top=50`;
  return fetchItemPages(url, accessToken, signal, MAX_PAGES);
}

// ---------------------------------------------------------------------------
// Excel workbook reading (the tabular sync)

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

/** A worksheet's used cells as displayed text: first row + data rows. */
export interface WorkbookTable {
  headers: string[];
  rows: string[][];
}

/**
 * A drive item's content tag — Graph's change signature for the file's CONTENT
 * (`cTag`; `eTag` also moves on metadata-only edits, so it is only the fallback).
 * Empty when Graph returns neither, which callers must read as "cannot tell" and
 * fetch anyway rather than as "unchanged".
 *
 * One cheap call that lets a connector skip an expensive read. It earns its keep
 * because Graph will not subscribe to a single file — only to a drive ROOT — so
 * every change anywhere in the operator's OneDrive notifies every connector
 * watching that drive.
 */
export async function fetchDriveItemTag(
  accessToken: string,
  driveId: string,
  itemId: string,
  signal?: AbortSignal,
): Promise<string> {
  const url = `${GRAPH_BASE_URL}/drives/${encodeURIComponent(
    driveId,
  )}/items/${encodeURIComponent(itemId)}?$select=cTag,eTag`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`graph item meta ${response.status}`);
  }
  const body = (await response.json()) as { cTag?: string; eTag?: string };
  return body.cTag ?? body.eTag ?? '';
}

/**
 * Read a worksheet's used range as displayed text via the Graph Workbook API —
 * the Excel analog of the Sheets values API; no file download, no xlsx parser.
 * `worksheet` may be blank for the workbook's first sheet. `usedRange` on a
 * huge sheet is slow, so rows are capped (`maxRows` data rows after the header
 * row) — cap what we read, not just what we return, via a row-limited range.
 */
export async function fetchWorkbookTable(
  accessToken: string,
  driveId: string,
  itemId: string,
  worksheet: string,
  maxRows: number,
  signal?: AbortSignal,
): Promise<WorkbookTable> {
  const workbookUrl = `${GRAPH_BASE_URL}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/workbook`;
  const name =
    worksheet.trim() ||
    (await firstWorksheetName(workbookUrl, accessToken, signal));
  // Escape single quotes per OData by doubling them inside the quoted name.
  const sheetPath = `worksheets('${encodeURIComponent(name.replace(/'/g, "''"))}')`;

  // `valuesOnly=true` skips formatting payloads; `$select=text` keeps only the
  // displayed strings (dates/currency arrive as the user sees them in Excel).
  const response = await fetch(
    `${workbookUrl}/${sheetPath}/usedRange(valuesOnly=true)?$select=text,rowCount`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      ...(signal ? { signal } : {}),
    },
  );
  if (!response.ok) {
    throw new Error(`graph workbook upstream ${response.status}`);
  }
  const body = (await response.json()) as {
    text?: Array<Array<string | number | boolean | null>>;
  };
  const text = (body.text ?? []).map((row) =>
    row.map((cell) =>
      cell === null || cell === undefined ? '' : String(cell),
    ),
  );

  const headers = text[0] ?? [];
  return { headers, rows: text.slice(1, 1 + maxRows) };
}

/** The workbook's first worksheet name (used when the config names none). */
async function firstWorksheetName(
  workbookUrl: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(
    `${workbookUrl}/worksheets?$select=name&$top=1`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      ...(signal ? { signal } : {}),
    },
  );
  if (!response.ok) {
    throw new Error(`graph worksheets upstream ${response.status}`);
  }
  const body = (await response.json()) as { value?: { name?: string }[] };
  const name = body.value?.[0]?.name;
  if (!name) {
    throw new Error('graph workbook has no worksheets');
  }
  return name;
}
