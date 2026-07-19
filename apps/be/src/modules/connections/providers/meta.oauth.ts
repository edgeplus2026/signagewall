import { ConnectionProvider } from '../schemas/app-connection.schema';
import {
  OAuthExchangeResult,
  OAuthProvider,
  OAuthStartParams,
  OAuthTokens,
  readNumber,
  readString,
} from './oauth-provider';

// Meta (Facebook Login) on the Graph API. Pin a version so a Graph deprecation
// never silently changes the contract under us.
const GRAPH_VERSION = 'v22.0';
const AUTH_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const TOKEN_URL = `${GRAPH}/oauth/access_token`;

/**
 * Meta issues NO refresh token. A long-lived user token lasts ~60 days, and the
 * only way to keep a connection alive is to re-extend the token itself (pass it
 * back through `fb_exchange_token`) BEFORE it expires — an expired token can't be
 * re-extended, only re-consented. So we deliberately UNDER-report the expiry: the
 * connection service's refresh path (which fires as the stored expiry nears) then
 * re-extends roughly monthly, always well inside the 60-day hard limit, and each
 * re-extension resets the 60 days. We stash the long-lived token as the "refresh
 * token" so that same machinery has something to re-exchange.
 */
const REPORTED_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Meta OAuth for app connections (Instagram, Facebook Page). Unlike Google/
 * Microsoft this is a two-hop exchange (code → short-lived → long-lived) with no
 * refresh token; see {@link REPORTED_TTL_SECONDS}. Scopes are the data
 * permissions the connected app's connector requests (e.g. `instagram_basic`).
 */
export const metaOAuthProvider: OAuthProvider = {
  id: ConnectionProvider.META,

  buildAuthorizationUrl(params: OAuthStartParams): string {
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: 'code',
      state: params.state,
      // Facebook Login takes a comma-separated permission list (not spaces).
      // `public_profile` is granted implicitly and gives us the account name.
      scope: params.scopes.join(','),
    });
    return `${AUTH_URL}?${query.toString()}`;
  },

  async exchangeCode(params): Promise<OAuthExchangeResult> {
    // 1. Authorization code → short-lived user token.
    const shortLived = await getGraphJson(
      `${TOKEN_URL}?${new URLSearchParams({
        client_id: params.clientId,
        client_secret: params.clientSecret,
        redirect_uri: params.redirectUri,
        code: params.code,
      }).toString()}`,
    );
    const shortToken = readString(shortLived, 'access_token');
    if (!shortToken) {
      throw new Error('meta: no access_token in code exchange');
    }

    // 2. Short-lived → long-lived (~60 day) user token.
    const tokens = await extendToken(
      params.clientId,
      params.clientSecret,
      shortToken,
    );

    const [name, scopes] = await Promise.all([
      fetchName(tokens.accessToken),
      fetchGrantedScopes(tokens.accessToken),
    ]);
    return {
      ...tokens,
      scopes,
      accountLabel: name ?? 'Facebook account',
    };
  },

  async refresh(params): Promise<OAuthTokens> {
    // Re-extend the stored long-lived token for another ~60 days.
    return extendToken(
      params.clientId,
      params.clientSecret,
      params.refreshToken,
    );
  },
};

/** GET a Graph JSON endpoint, throwing on non-2xx (token endpoints are GET). */
async function getGraphJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`meta oauth endpoint ${response.status}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

/**
 * Exchange a (short- or long-lived) user token for a fresh long-lived one. The
 * new token is stored as BOTH the access and the "refresh" token — Meta has no
 * separate refresh token, so re-extending means re-exchanging the token itself.
 */
async function extendToken(
  clientId: string,
  clientSecret: string,
  currentToken: string,
): Promise<OAuthTokens> {
  const token = await getGraphJson(
    `${TOKEN_URL}?${new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: currentToken,
    }).toString()}`,
  );
  const accessToken = readString(token, 'access_token');
  if (!accessToken) {
    throw new Error('meta: no access_token in token exchange');
  }
  const realTtl = readNumber(token, 'expires_in') ?? REPORTED_TTL_SECONDS;
  return {
    accessToken,
    refreshToken: accessToken,
    // Under-report so the service re-extends long before the real ~60-day expiry.
    expiresInSeconds: Math.min(realTtl, REPORTED_TTL_SECONDS),
    scopes: [],
  };
}

/** The account's display name, for the "Connected as …" label. */
async function fetchName(accessToken: string): Promise<string | undefined> {
  const response = await fetch(`${GRAPH}/me?fields=name`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return undefined;
  }
  const profile = (await response.json()) as Record<string, unknown>;
  return readString(profile, 'name');
}

/** The permissions actually granted (Meta's token endpoint omits `scope`). */
async function fetchGrantedScopes(accessToken: string): Promise<string[]> {
  const response = await fetch(`${GRAPH}/me/permissions`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return [];
  }
  const body = (await response.json()) as {
    data?: Array<{ permission?: string; status?: string }>;
  };
  return (body.data ?? [])
    .filter((p) => p.status === 'granted' && typeof p.permission === 'string')
    .map((p) => p.permission!);
}
