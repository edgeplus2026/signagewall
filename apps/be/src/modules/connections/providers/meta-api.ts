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
  connected_instagram_account?: { id?: string; username?: string };
}

interface MetaBusiness {
  id: string;
}

interface GraphCollection<T> {
  data?: T[];
  paging?: { next?: string };
}

class MetaGraphError extends Error {
  constructor(readonly status: number) {
    super(`meta graph upstream ${status}`);
  }
}

/** Follow a Graph collection while keeping the bearer token out of URLs. */
async function fetchCollection<T>(
  accessToken: string,
  initialUrl: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | undefined = initialUrl;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: { authorization: `Bearer ${accessToken}` },
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) {
      throw new MetaGraphError(response.status);
    }
    const body = (await response.json()) as GraphCollection<T>;
    items.push(...(body.data ?? []));

    if (!body.paging?.next) {
      nextUrl = undefined;
      continue;
    }

    const continuation = new URL(body.paging.next);
    if (
      continuation.origin !== 'https://graph.facebook.com' ||
      !continuation.pathname.startsWith(`/${GRAPH_VERSION}/`)
    ) {
      throw new Error('meta graph returned an invalid continuation URL');
    }
    continuation.searchParams.delete('access_token');
    nextUrl = continuation.toString();
  }

  return items;
}

/** Fetch Pages directly assigned to the user (`/me/accounts`). */
async function fetchManagedPages(
  accessToken: string,
  fields: string,
  signal?: AbortSignal,
): Promise<AccountsPage[]> {
  const params = new URLSearchParams({ fields, limit: '100' });
  return fetchCollection<AccountsPage>(
    accessToken,
    `${GRAPH_API}/me/accounts?${params.toString()}`,
    signal,
  );
}

/**
 * Fetch Pages owned by or shared with the user's business portfolios. Meta does
 * not consistently include these in `/me/accounts`, even when the user has full
 * Page access, so Facebook Login for Business also needs `business_management`.
 */
async function fetchBusinessPages(
  accessToken: string,
  fields: string,
  signal?: AbortSignal,
): Promise<AccountsPage[]> {
  const businesses = await fetchCollection<MetaBusiness>(
    accessToken,
    `${GRAPH_API}/me/businesses?${new URLSearchParams({ fields: 'id', limit: '100' }).toString()}`,
    signal,
  );
  const pageParams = new URLSearchParams({ fields, limit: '100' }).toString();
  const pages = await Promise.all(
    businesses.flatMap((business) =>
      ['owned_pages', 'client_pages'].map((edge) =>
        fetchCollection<AccountsPage>(
          accessToken,
          `${GRAPH_API}/${encodeURIComponent(business.id)}/${edge}?${pageParams}`,
          signal,
        ),
      ),
    ),
  );
  return pages.flat();
}

/** Merge personal and business-owned Pages without duplicating Page ids. */
async function fetchVisiblePages(
  accessToken: string,
  fields: string,
  signal?: AbortSignal,
): Promise<AccountsPage[]> {
  const managedPages = await fetchManagedPages(accessToken, fields, signal);
  let businessPages: AccountsPage[] = [];
  try {
    businessPages = await fetchBusinessPages(accessToken, fields, signal);
  } catch (error) {
    // A pre-existing token may not yet include `business_management`, and Meta
    // returns 400/403 for `/me/businesses` in that case. Keep directly managed
    // Pages usable while the user reauthorizes instead of blanking the picker.
    if (
      !(error instanceof MetaGraphError) ||
      (error.status !== 400 && error.status !== 403)
    ) {
      throw error;
    }
  }
  return [
    ...new Map(
      [...managedPages, ...businessPages].map((p) => [p.id, p]),
    ).values(),
  ];
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
  const pages = await fetchVisiblePages(accessToken, 'id,name', signal);
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
  const pages = await fetchVisiblePages(
    accessToken,
    'id,name,instagram_business_account{id,username},connected_instagram_account{id,username}',
    signal,
  );
  const accounts = new Map<string, MetaResourceSummary>();
  for (const page of pages) {
    const ig =
      page.instagram_business_account ?? page.connected_instagram_account;
    if (ig?.id) {
      accounts.set(ig.id, {
        id: ig.id,
        title: ig.username ? `@${ig.username}` : (page.name ?? ig.id),
      });
    }
  }
  return finalize([...accounts.values()], query);
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
