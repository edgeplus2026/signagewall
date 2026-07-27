/**
 * Thin client for the LinkedIn versioned REST API, used by the connections
 * browse endpoint to list the Pages (organizations) a connected account
 * administers for the config-form picker. Pure functions over `fetch`; the caller
 * supplies an already-resolved access token.
 *
 * Every versioned call needs BOTH the `LinkedIn-Version` and the
 * `X-Restli-Protocol-Version: 2.0.0` headers — LinkedIn rejects the request
 * outright without them, which is why they live in one shared helper here.
 */

/**
 * The API version to pin (LinkedIn's `YYYYMM` moniker). LinkedIn sunsets each
 * version about a year after release, so this is a deliberate, reviewable
 * constant rather than "latest" — the same reasoning as the pinned Meta Graph
 * version. Bumping it is a code change with a changelog to read first.
 */
const LINKEDIN_VERSION = '202606';
const REST_API = 'https://api.linkedin.com/rest';

/** Cap on admin roles read for the picker (one page; nobody admins 100+ Pages). */
const MAX_ORGANIZATIONS = 100;

/**
 * Cap on individual name lookups when the batch call is unavailable. The
 * Community Management Development tier allows only 500 app calls per 24h, so an
 * un-capped per-org pass on a member with many Pages could spend the day's quota
 * on cosmetics. Beyond this the picker shows id-derived labels.
 */
const MAX_NAME_LOOKUPS = 10;

/** A Page as surfaced to a CMS picker (token-free). */
export interface LinkedInResourceSummary {
  /** The organization URN (`urn:li:organization:123`) — what the Posts API takes. */
  id: string;
  title: string;
}

/** Headers every versioned LinkedIn REST call must carry. */
export function linkedinHeaders(accessToken: string): Record<string, string> {
  return {
    authorization: `Bearer ${accessToken}`,
    'LinkedIn-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

/** GET a versioned LinkedIn endpoint as JSON, throwing on non-2xx. */
async function linkedinGet(
  path: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${REST_API}${path}`, {
    headers: linkedinHeaders(accessToken),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`linkedin upstream ${response.status}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

interface AclElement {
  /** Newer responses name it `organization`; some name it `organizationTarget`. */
  organization?: string;
  organizationTarget?: string;
  role?: string;
  state?: string;
}

/** The numeric id inside an `urn:li:organization:{id}` URN, or '' when absent. */
function organizationId(urn: string): string {
  const id = urn.slice(urn.lastIndexOf(':') + 1).trim();
  return /^\d+$/.test(id) ? id : '';
}

/** Filter by title (client-side) and sort alphabetically for a stable picker. */
function finalize(
  items: LinkedInResourceSummary[],
  query: string,
): LinkedInResourceSummary[] {
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? items.filter((item) => item.title.toLowerCase().includes(trimmed))
    : items;
  return filtered.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * List the LinkedIn Pages the connected member is an APPROVED ADMINISTRATOR of.
 *
 * Two calls, because LinkedIn splits "which Pages may I touch" from "what are
 * they called":
 *  1. `organizationAcls?q=roleAssignee` — the member's role assignments. This one
 *     is REQUIRED; without it there is nothing to show. It returns URNs only.
 *  2. the display names for those URNs. BEST-EFFORT in two steps, because the
 *     cheap way is unavailable on the tier most operators start on: the batch
 *     `organizationsLookup` is a Rest.li BATCH_GET, which the Community
 *     Management **Development tier forbids outright**, so anything it misses is
 *     retried as individual `organizations/{id}` GETs (capped — see
 *     {@link MAX_NAME_LOOKUPS} — since that tier also allows only 500 calls a
 *     day). If both fail the picker degrades to "Page {id}" labels rather than
 *     breaking: the id is what the connector actually fetches with, the name is
 *     only what the operator reads.
 *
 * Only ADMINISTRATOR/APPROVED roles are listed: those are the ones whose posts
 * `r_organization_social` is guaranteed to let us read, so the picker never
 * offers a Page the connector would then 403 on.
 */
export async function listLinkedInOrganizations(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<LinkedInResourceSummary[]> {
  const params = new URLSearchParams({
    q: 'roleAssignee',
    role: 'ADMINISTRATOR',
    state: 'APPROVED',
    count: String(MAX_ORGANIZATIONS),
  });
  const acls = await linkedinGet(
    `/organizationAcls?${params.toString()}`,
    accessToken,
    signal,
  );
  const elements = (acls.elements ?? []) as AclElement[];

  // Preserve first-seen order and drop duplicates (a member can hold the same
  // role twice across states we didn't filter on).
  const urns: string[] = [];
  for (const element of elements) {
    const urn = (
      element.organization ??
      element.organizationTarget ??
      ''
    ).trim();
    if (urn && organizationId(urn) && !urns.includes(urn)) {
      urns.push(urn);
    }
  }
  if (urns.length === 0) {
    return [];
  }

  const names = await fetchOrganizationNames(urns, accessToken, signal);
  return finalize(
    urns.map((urn) => ({
      id: urn,
      title: names.get(urn) ?? `Page ${organizationId(urn)}`,
    })),
    query,
  );
}

interface LookupResult {
  localizedName?: string;
  vanityName?: string;
}

/**
 * Best-effort org URN → display name map: one batch call, then single GETs for
 * whatever it didn't cover (the Development tier blocks BATCH_GET entirely, so
 * there the batch always misses and the singles do all the work). Never throws —
 * the caller falls back to an id-derived label (see
 * {@link listLinkedInOrganizations}).
 */
async function fetchOrganizationNames(
  urns: string[],
  accessToken: string,
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  // Rest.li batch ids are a literal `List(1,2,3)` of NUMERIC ids — not URNs, and
  // the parentheses/commas must stay unencoded for LinkedIn to parse it.
  const ids = urns.map(organizationId).join(',');
  try {
    const body = await linkedinGet(
      `/organizationsLookup?ids=List(${ids})`,
      accessToken,
      signal,
    );
    const results = (body.results ?? {}) as Record<string, LookupResult>;
    for (const urn of urns) {
      const title = titleOf(results[organizationId(urn)]);
      if (title) {
        names.set(urn, title);
      }
    }
  } catch {
    // Batch refused (Development tier) — the per-org pass below covers it.
  }

  for (const urn of urns.slice(0, MAX_NAME_LOOKUPS)) {
    if (names.has(urn)) {
      continue;
    }
    try {
      const body = await linkedinGet(
        `/organizations/${organizationId(urn)}`,
        accessToken,
        signal,
      );
      const title = titleOf(body);
      if (title) {
        names.set(urn, title);
      }
    } catch {
      // Out of quota or not permitted — this Page keeps its id-derived label.
    }
  }
  return names;
}

/** An organization's display name from a lookup result, if it carried one. */
function titleOf(result: LookupResult | undefined): string | undefined {
  return result?.localizedName ?? result?.vanityName;
}
