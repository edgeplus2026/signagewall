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

const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

/**
 * LinkedIn OAuth for app connections (LinkedIn Page). A confidential client
 * (client secret, no PKCE) on a plain authorization-code flow, so it is the
 * closest of the four providers to Google/Microsoft. Scopes are SPACE-delimited
 * and the data scopes (`r_organization_admin`, `r_organization_social`) come
 * from the connected app's connector descriptor; `openid`/`profile` are
 * prepended here as the reserved identity scopes that give us the account label,
 * exactly like Google's `openid email`.
 *
 * TOKEN LIFETIME — LinkedIn issues 60-day access tokens and, unlike Google or
 * Microsoft, a refresh token ONLY for apps approved for "Programmatic Refresh
 * Tokens". We therefore persist whatever the exchange returns and let the
 * service's normal refresh path use it when present: with a refresh token the
 * connection renews itself indefinitely (the scheduler's proactive pass fires
 * inside the 60-day window); without one it simply lapses after 60 days and the
 * operator reconnects — LinkedIn has no re-extension equivalent to Meta's
 * `fb_exchange_token`, so there is nothing to fake here.
 */
export const linkedinOAuthProvider: OAuthProvider = {
  id: ConnectionProvider.LINKEDIN,

  buildAuthorizationUrl(params: OAuthStartParams): string {
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      state: params.state,
      // openid/profile give us the member's name for the "Connected as …" label;
      // the rest are the app's data scopes.
      scope: ['openid', 'profile', ...params.scopes].join(' '),
    });
    return `${AUTH_URL}?${query.toString()}`;
  },

  async exchangeCode(params): Promise<OAuthExchangeResult> {
    const token = await postForm(TOKEN_URL, {
      grant_type: 'authorization_code',
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
    });

    const tokens = parseTokenResponse(token);
    if (!tokens.accessToken) {
      throw new Error('linkedin: no access_token in response');
    }

    const profile = await fetchUserInfo(tokens.accessToken);
    return { ...tokens, accountLabel: profile.name ?? 'LinkedIn account' };
  },

  async refresh(params): Promise<OAuthTokens> {
    const token = await postForm(TOKEN_URL, {
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    });
    return parseTokenResponse(token);
  },
};

/** The member's display name, for the "Connected as …" label (OpenID userinfo). */
async function fetchUserInfo(accessToken: string): Promise<{ name?: string }> {
  const response = await fetch(USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return {};
  }
  const profile = (await response.json()) as Record<string, unknown>;
  return { name: readString(profile, 'name') };
}
