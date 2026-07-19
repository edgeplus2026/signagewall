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

const GRAPH_ME_URL = 'https://graph.microsoft.com/v1.0/me';

function authBase(tenant: string): string {
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`;
}

/**
 * Microsoft (Entra ID / Graph) OAuth for app connections (Outlook calendar,
 * Teams, PowerPoint on OneDrive/SharePoint). Uses the configured tenant
 * ('common' by default: work/school AND personal accounts; set a tenant id for
 * single-tenant). A confidential client (client secret), so no PKCE — like
 * Google. `offline_access` is what makes Microsoft return a refresh token;
 * `openid email` give the account label. The data scopes (e.g. Calendars.Read)
 * come from the connected app's connector descriptor.
 */
export function createMicrosoftOAuthProvider(tenant: string): OAuthProvider {
  const AUTH_URL = `${authBase(tenant)}/authorize`;
  const TOKEN_URL = `${authBase(tenant)}/token`;

  return {
    id: ConnectionProvider.MICROSOFT,

    buildAuthorizationUrl(params: OAuthStartParams): string {
      const query = new URLSearchParams({
        client_id: params.clientId,
        redirect_uri: params.redirectUri,
        response_type: 'code',
        response_mode: 'query',
        state: params.state,
        // Reserved scopes (refresh token + identity) plus the app's data scopes.
        scope: ['openid', 'email', 'offline_access', ...params.scopes].join(
          ' ',
        ),
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
      return {
        ...tokens,
        accountLabel:
          profile.mail ?? profile.userPrincipalName ?? 'Microsoft account',
      };
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
}

async function fetchMe(
  accessToken: string,
): Promise<{ mail?: string; userPrincipalName?: string }> {
  const response = await fetch(GRAPH_ME_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return {};
  }
  const profile = (await response.json()) as Record<string, unknown>;
  return {
    mail: readString(profile, 'mail'),
    userPrincipalName: readString(profile, 'userPrincipalName'),
  };
}
