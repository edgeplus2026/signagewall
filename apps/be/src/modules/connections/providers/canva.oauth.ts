import { ConnectionProvider } from '../schemas/app-connection.schema';
import {
  OAuthExchangeResult,
  OAuthProvider,
  OAuthStartParams,
  OAuthTokens,
  parseTokenResponse,
  postForm,
  readString,
} from './oauth-provider';

const AUTH_URL = 'https://www.canva.com/api/oauth/authorize';
const TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';
const PROFILE_URL = 'https://api.canva.com/rest/v1/users/me/profile';

/**
 * Canva (Connect API) OAuth for app connections. Works for both personal and
 * business Canva accounts — the OAuth flow treats them identically.
 *
 * Unlike Google/Microsoft, Canva mandates PKCE: the authorization request
 * carries a SHA-256 `code_challenge` and the token exchange must present the
 * matching `code_verifier` (threaded through by ConnectionsService via the
 * signed `state`). Refresh tokens are single-use and rotate — the service
 * already persists the new refresh token returned on each refresh.
 */
export const canvaOAuthProvider: OAuthProvider = {
  id: ConnectionProvider.CANVA,

  buildAuthorizationUrl(params: OAuthStartParams): string {
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: 'code',
      state: params.state,
      scope: params.scopes.join(' '),
    });
    if (params.codeChallenge) {
      query.set('code_challenge', params.codeChallenge);
      query.set('code_challenge_method', 'S256');
    }
    return `${AUTH_URL}?${query.toString()}`;
  },

  async exchangeCode(params): Promise<OAuthExchangeResult> {
    const token = await postForm(TOKEN_URL, {
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
      code: params.code,
      ...(params.codeVerifier ? { code_verifier: params.codeVerifier } : {}),
    });

    const tokens = parseTokenResponse(token);
    if (!tokens.accessToken) {
      throw new Error('canva: no access_token in response');
    }

    const profile = await fetchProfile(tokens.accessToken);
    return { ...tokens, accountLabel: profile.displayName ?? 'Canva account' };
  },

  async refresh(params): Promise<OAuthTokens> {
    const token = await postForm(TOKEN_URL, {
      client_id: params.clientId,
      client_secret: params.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
    });
    return parseTokenResponse(token);
  },
};

async function fetchProfile(
  accessToken: string,
): Promise<{ displayName?: string }> {
  const response = await fetch(PROFILE_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return {};
  }
  // Canva returns { profile: { display_name } }.
  const body = (await response.json()) as { profile?: Record<string, unknown> };
  const profile = body.profile ?? {};
  return { displayName: readString(profile, 'display_name') };
}
