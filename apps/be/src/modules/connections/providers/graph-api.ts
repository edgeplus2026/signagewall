/**
 * Thin client for the OneDrive drive-search API, used by the connections browse
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
 * Trade-off: this searches the user's OWN OneDrive, not arbitrary SharePoint
 * sites. SharePoint-site coverage needs `/search/query` (work accounts only) and
 * can be layered on later without changing the option id shape.
 */

const GRAPH_DRIVE_URL = 'https://graph.microsoft.com/v1.0/me/drive';

/** A drive item surfaced to the CMS picker (token-free). */
export interface DrivePptxOption {
  /** Packed `"{driveId}|{itemId}"` so the item is addressable in its own drive. */
  id: string;
  title: string;
}

interface DriveItem {
  id?: string;
  name?: string;
  parentReference?: { driveId?: string };
}

interface DriveSearchResponse {
  value?: DriveItem[];
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
 * We merge two sources because neither alone is enough:
 *  - `/root/search` is index-backed and comprehensive, but its index LAGS — a
 *    just-added deck can take minutes to appear.
 *  - `/recent` reflects activity immediately, so a freshly added/edited deck
 *    shows up right away, but it only covers recently-touched files.
 *
 * Recent items sort first (newest on top), then search results; both are filtered
 * to names ending in `.pptx`. For a typed query, search narrows server-side and
 * recent is narrowed client-side by name. Each source is best-effort: if one
 * call fails the other still populates the picker. Returns `{ id, title }`.
 */
export async function searchDrivePptx(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<DrivePptxOption[]> {
  const term = query.trim();
  // Empty query → search the `pptx` token (every `.pptx` filename contains it).
  const [recent, searched] = await Promise.all([
    driveRecent(accessToken, signal).catch(() => [] as DriveItem[]),
    driveSearch(accessToken, term || 'pptx', signal).catch(
      () => [] as DriveItem[],
    ),
  ]);

  const lower = term.toLowerCase();
  const recentOptions = recent
    .map(toPptxOption)
    .filter((o): o is DrivePptxOption => o !== null)
    // Recent isn't a search: narrow by name to honour the typed query.
    .filter((o) => !term || o.title.toLowerCase().includes(lower));
  const searchOptions = searched
    .map(toPptxOption)
    .filter((o): o is DrivePptxOption => o !== null);

  const options: DrivePptxOption[] = [];
  const seen = new Set<string>();
  for (const option of [...recentOptions, ...searchOptions]) {
    if (seen.has(option.id)) continue;
    seen.add(option.id);
    options.push(option);
    if (options.length >= 25) break;
  }
  return options;
}

/** Map a Graph drive item to a picker option, or null if it isn't a `.pptx`. */
function toPptxOption(item: DriveItem): DrivePptxOption | null {
  const itemId = item.id;
  const driveId = item.parentReference?.driveId;
  const name = item.name;
  // Need a drive id to address the item later (subscription + fetch).
  if (!itemId || !driveId || !name) return null;
  if (!name.toLowerCase().endsWith('.pptx')) return null;
  return { id: `${driveId}${DRIVE_ITEM_SEPARATOR}${itemId}`, title: name };
}

/** Index-backed recursive search of the user's OneDrive. */
async function driveSearch(
  accessToken: string,
  term: string,
  signal?: AbortSignal,
): Promise<DriveItem[]> {
  // OData: escape single quotes by doubling; encodeURIComponent handles spaces.
  const q = encodeURIComponent(term.replace(/'/g, "''"));
  const url = `${GRAPH_DRIVE_URL}/root/search(q='${q}')?$select=id,name,parentReference&$top=25`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`graph drive search upstream ${response.status}`);
  }
  const body = (await response.json()) as DriveSearchResponse;
  return body.value ?? [];
}

/** Recently-used items (surfaces just-added files before the search index catches up). */
async function driveRecent(
  accessToken: string,
  signal?: AbortSignal,
): Promise<DriveItem[]> {
  const url = `${GRAPH_DRIVE_URL}/recent?$select=id,name,parentReference&$top=50`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`graph drive recent upstream ${response.status}`);
  }
  const body = (await response.json()) as DriveSearchResponse;
  return body.value ?? [];
}
