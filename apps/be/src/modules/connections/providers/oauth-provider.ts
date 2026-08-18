import { ConnectionProvider } from '../schemas/app-connection.schema';

/** Tokens returned by an OAuth code exchange or refresh. */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  /** Seconds until the access token expires. */
  expiresInSeconds?: number;
  scopes: string[];
}

/** Result of exchanging an authorization code (tokens + account identity). */
export interface OAuthExchangeResult extends OAuthTokens {
  accountLabel: string;
  /**
   * The provider's own id for the connected account, when the provider exposes
   * one cheaply. Persisted so a provider-initiated callback that identifies the
   * user by id and nothing else — Meta's deauthorize / data-deletion requests —
   * can find the connections to tear down. Optional: providers we have no such
   * callback for simply leave it unset.
   */
  accountId?: string;
}

export interface OAuthStartParams {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes: string[];
  /**
   * PKCE code challenge (S256 of the code verifier). Set only for providers that
   * require PKCE (e.g. Canva); other providers ignore it.
   */
  codeChallenge?: string;
}

/**
 * The provider-specific half of the connection OAuth flow. Implementations are
 * pure (no Nest deps) so they are trivially unit-testable with a mocked
 * `fetch`. Credentials are passed in by the service from config.
 */
export interface OAuthProvider {
  readonly id: ConnectionProvider;

  /** Build the authorization URL to redirect the user to (consent screen). */
  buildAuthorizationUrl(params: OAuthStartParams): string;

  /** Exchange an authorization code for tokens + the account label. */
  exchangeCode(params: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
    /** PKCE code verifier; required by providers that issued a code challenge. */
    codeVerifier?: string;
  }): Promise<OAuthExchangeResult>;

  /** Exchange a refresh token for a fresh access token. */
  refresh(params: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  }): Promise<OAuthTokens>;
}

/** Read a string field from a parsed JSON object, or undefined when absent. */
export function readString(
  obj: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

/** Read a number field from a parsed JSON object, or undefined when absent. */
export function readNumber(
  obj: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = obj[key];
  return typeof value === 'number' ? value : undefined;
}

/** Build the common token shape from a parsed token-endpoint response. */
export function parseTokenResponse(
  token: Record<string, unknown>,
): OAuthTokens {
  const accessToken = readString(token, 'access_token') ?? '';
  const refreshToken = readString(token, 'refresh_token');
  const expiresInSeconds = readNumber(token, 'expires_in');
  return {
    accessToken,
    ...(refreshToken ? { refreshToken } : {}),
    ...(expiresInSeconds !== undefined ? { expiresInSeconds } : {}),
    // Split on commas as well as whitespace: RFC 6749 says space-delimited and
    // Google/Microsoft/Canva oblige, but LinkedIn answers with a comma-separated
    // list — split on spaces alone that arrived as ONE scope string containing
    // commas, so a connection looked like it had a single nonsense permission.
    scopes: (readString(token, 'scope') ?? '').split(/[\s,]+/).filter(Boolean),
  };
}

/** Shared helper: POST form-encoded body and parse JSON, throwing on non-2xx. */
export async function postForm(
  url: string,
  body: Record<string, string>,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  if (!response.ok) {
    throw new Error(`oauth token endpoint ${response.status}`);
  }
  return (await response.json()) as Record<string, unknown>;
}
