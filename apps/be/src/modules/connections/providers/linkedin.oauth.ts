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
const PROFILE_URL = 'https://api.linkedin.com/v2/me';

/**
 * LinkedIn OAuth for app connections (LinkedIn Page). A confidential client
 * (client secret, no PKCE) on a plain authorization-code flow, so it is the
 * closest of the four providers to Google/Microsoft. Scopes are SPACE-delimited
 * and the data scopes (`rw_organization_admin`, `r_organization_social`) come
 * from the connected app's connector descriptor; `r_basicprofile` is prepended
 * here as the reserved identity scope that gives us the account label, exactly
 * like Google's `openid email`.
 *
 * `r_basicprofile` (+ `/v2/me`) rather than the newer OpenID Connect
 * `openid profile` (+ `/v2/userinfo`) on purpose: LinkedIn refuses the WHOLE
 * authorization request if any requested scope is not on the app, and the OIDC
 * scopes need a separate product ("Sign In with LinkedIn using OpenID Connect")
 * added to it. `r_basicprofile` ships with the same Community Management API
 * approval that makes this app work at all, so there is one fewer thing an
 * operator can leave unticked and turn into an `invalid scope` error.
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
      // r_basicprofile gives us the member's name for the "Connected as …"
      // label; the rest are the app's data scopes.
      scope: ['r_basicprofile', ...params.scopes].join(' '),
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

    const name = await fetchMemberName(tokens.accessToken);
    return { ...tokens, accountLabel: name ?? 'LinkedIn account' };
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

/** The member's display name, for the "Connected as …" label. */
async function fetchMemberName(
  accessToken: string,
): Promise<string | undefined> {
  const response = await fetch(PROFILE_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return undefined;
  }
  const profile = (await response.json()) as Record<string, unknown>;
  const name = [
    readString(profile, 'localizedFirstName'),
    readString(profile, 'localizedLastName'),
  ]
    .filter(Boolean)
    .join(' ');
  return name || undefined;
}
