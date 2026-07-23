/**
 * Thin client for the Meta Graph API, used by the connections browse endpoint
 * (list the account's Facebook Pages / linked Instagram accounts for the config-
 * form pickers) and by the Instagram/Facebook connectors to resolve a Page access
 * token. Pure functions over `fetch`; the caller supplies an already-resolved
 * (re-extended) long-lived user access token.
 */

const GRAPH_VERSION = 'v22.0';
const GRAPH_API = `https://graph.facebook.com/${GRAPH_VERSION}`;

/** A Page / Instagram account as surfaced to a CMS picker (token-free). */
export interface MetaResourceSummary {
  id: string;
  title: string;
}

interface AccountsPage {
  id: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: { id?: string; username?: string };
}

/** Fetch the pages the user manages (`/me/accounts`) with the given fields. */
async function fetchManagedPages(
  accessToken: string,
  fields: string,
  signal?: AbortSignal,
): Promise<AccountsPage[]> {
  const params = new URLSearchParams({ fields, limit: '100' });
  const response = await fetch(
    `${GRAPH_API}/me/accounts?${params.toString()}`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      ...(signal ? { signal } : {}),
    },
  );
  if (!response.ok) {
    throw new Error(`meta graph upstream ${response.status}`);
  }
  const body = (await response.json()) as { data?: AccountsPage[] };
  return body.data ?? [];
}

/** Filter by title (client-side) and sort alphabetically for a stable picker. */
function finalize(
  items: MetaResourceSummary[],
  query: string,
): MetaResourceSummary[] {
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? items.filter((item) => item.title.toLowerCase().includes(trimmed))
    : items;
  return filtered.sort((a, b) => a.title.localeCompare(b.title));
}

/** List the Facebook Pages the connected account manages. */
export async function listFacebookPages(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<MetaResourceSummary[]> {
  const pages = await fetchManagedPages(accessToken, 'id,name', signal);
  return finalize(
    pages.map((page) => ({ id: page.id, title: page.name ?? page.id })),
    query,
  );
}

/**
 * List the Instagram professional (Business/Creator) accounts linked to the
 * user's Pages. An IG account is always reached through the Page it is connected
 * to, so we surface the IG user-id (what the media endpoint takes) titled by its
 * @handle.
 */
export async function listInstagramAccounts(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<MetaResourceSummary[]> {
  const pages = await fetchManagedPages(
    accessToken,
    'name,instagram_business_account{id,username}',
    signal,
  );
  const accounts: MetaResourceSummary[] = [];
  for (const page of pages) {
    const ig = page.instagram_business_account;
    if (ig?.id) {
      accounts.push({
        id: ig.id,
        title: ig.username ? `@${ig.username}` : (page.name ?? ig.id),
      });
    }
  }
  return finalize(accounts, query);
}

/**
 * Resolve the Page access token for `pageId` from the user's long-lived token.
 * Reading a Page's own feed requires a Page token; one derived from a long-lived
 * user token does not itself expire, so the connector fetches it fresh each run
 * rather than persisting it.
 */
export async function getPageAccessToken(
  userAccessToken: string,
  pageId: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(
    `${GRAPH_API}/${encodeURIComponent(pageId)}?fields=access_token`,
    {
      headers: { authorization: `Bearer ${userAccessToken}` },
      ...(signal ? { signal } : {}),
    },
  );
  if (!response.ok) {
    throw new Error(`meta graph upstream ${response.status}`);
  }
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error('meta: no page access token');
  }
  return body.access_token;
}
