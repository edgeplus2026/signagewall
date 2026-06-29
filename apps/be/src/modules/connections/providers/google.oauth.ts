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

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

/**
 * Google OAuth for app connections (Calendar, Slides). Distinct from the login
 * flow: requests `access_type=offline` + `prompt=consent` so Google returns a
 * refresh token, and asks for the data scopes the connected app needs.
 */
export const googleOAuthProvider: OAuthProvider = {
  id: ConnectionProvider.GOOGLE,

  buildAuthorizationUrl(params: OAuthStartParams): string {
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state: params.state,
      // openid/email give us the account label; the rest are app data scopes.
      scope: ['openid', 'email', ...params.scopes].join(' '),
    });
    return `${AUTH_URL}?${query.toString()}`;
  },

  async exchangeCode(params): Promise<OAuthExchangeResult> {
    const token = await postForm(TOKEN_URL, {
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
      code: params.code,
    });

    const tokens = parseTokenResponse(token);
    if (!tokens.accessToken) {
      throw new Error('google: no access_token in response');
    }

    const profile = await fetchUserInfo(tokens.accessToken);
    return { ...tokens, accountLabel: profile.email ?? 'Google account' };
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

async function fetchUserInfo(accessToken: string): Promise<{ email?: string }> {
  const response = await fetch(USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return {};
  }
  const profile = (await response.json()) as Record<string, unknown>;
  return { email: readString(profile, 'email') };
}
