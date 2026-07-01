import { canvaOAuthProvider } from './canva.oauth';

function mockFetchSequence(responses: Array<{ ok?: boolean; body: unknown }>) {
  const fn = jest.fn();
  for (const res of responses) {
    fn.mockResolvedValueOnce({
      ok: res.ok ?? true,
      status: res.ok === false ? 400 : 200,
      json: () => Promise.resolve(res.body),
    });
  }
  global.fetch = fn as never;
  return fn;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('canvaOAuthProvider', () => {
  it('builds an authorization URL carrying the PKCE challenge (S256)', () => {
    const url = canvaOAuthProvider.buildAuthorizationUrl({
      clientId: 'cid',
      redirectUri: 'https://app/cb',
      state: 'state-jwt',
      scopes: ['design:meta:read', 'design:content:read'],
      codeChallenge: 'challenge-123',
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      'https://www.canva.com/api/oauth/authorize',
    );
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('code_challenge')).toBe('challenge-123');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('scope')).toBe(
      'design:meta:read design:content:read',
    );
  });

  it('omits PKCE params when no challenge is supplied', () => {
    const url = canvaOAuthProvider.buildAuthorizationUrl({
      clientId: 'cid',
      redirectUri: 'https://app/cb',
      state: 's',
      scopes: ['profile:read'],
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.has('code_challenge')).toBe(false);
  });

  it('exchanges the code with the PKCE verifier and resolves the account label', async () => {
    const fetchMock = mockFetchSequence([
      // token endpoint
      {
        body: {
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          scope: 'design:meta:read profile:read',
        },
      },
      // profile endpoint
      { body: { profile: { display_name: 'Jane Designer' } } },
    ]);

    const result = await canvaOAuthProvider.exchangeCode({
      clientId: 'cid',
      clientSecret: 'secret',
      redirectUri: 'https://app/cb',
      code: 'auth-code',
      codeVerifier: 'verifier-abc',
    });

    // The token request includes the PKCE verifier.
    const body = (fetchMock.mock.calls[0] as [string, { body: string }])[1]
      .body;
    expect(body).toContain('code_verifier=verifier-abc');
    expect(body).toContain('grant_type=authorization_code');

    expect(result.accessToken).toBe('at');
    expect(result.refreshToken).toBe('rt');
    expect(result.accountLabel).toBe('Jane Designer');
  });

  it('refreshes the access token (rotating refresh token is parsed)', async () => {
    mockFetchSequence([
      {
        body: {
          access_token: 'at2',
          refresh_token: 'rt2',
          expires_in: 3600,
          scope: 'design:meta:read',
        },
      },
    ]);

    const tokens = await canvaOAuthProvider.refresh({
      clientId: 'cid',
      clientSecret: 'secret',
      refreshToken: 'rt',
    });

    expect(tokens.accessToken).toBe('at2');
    expect(tokens.refreshToken).toBe('rt2');
  });
});
