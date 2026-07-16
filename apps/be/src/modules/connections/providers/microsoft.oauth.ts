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

// Microsoft identity platform v2, `common` authority: work/school AND personal
// accounts. A confidential client (client secret), so no PKCE — like Google.
const AUTH_URL =
  'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const ME_URL = 'https://graph.microsoft.com/v1.0/me';

/**
 * Microsoft OAuth for app connections (Outlook calendar, later Teams/SharePoint).
 * `offline_access` is what makes Microsoft return a refresh token; `openid email`
 * give the account label. The data scopes (e.g. Calendars.Read) come from the
 * connected app's connector descriptor.
 */
export const microsoftOAuthProvider: OAuthProvider = {
  id: ConnectionProvider.MICROSOFT,

  buildAuthorizationUrl(params: OAuthStartParams): string {
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: 'code',
      response_mode: 'query',
      state: params.state,
      // Reserved scopes (refresh token + identity) plus the app's data scopes.
      scope: ['openid', 'email', 'offline_access', ...params.scopes].join(' '),
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
      throw new Error('microsoft: no access_token in response');
    }

    const profile = await fetchMe(tokens.accessToken);
    return { ...tokens, accountLabel: profile.email ?? 'Microsoft account' };
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

/** The account's email/UPN for the "Connected as …" label. */
async function fetchMe(accessToken: string): Promise<{ email?: string }> {
  const response = await fetch(`${ME_URL}?$select=mail,userPrincipalName`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return {};
  }
  const profile = (await response.json()) as Record<string, unknown>;
  return {
    email:
      readString(profile, 'mail') ?? readString(profile, 'userPrincipalName'),
  };
}
