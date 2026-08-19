import { metaOAuthProvider } from './meta.oauth';

describe('metaOAuthProvider.buildAuthorizationUrl', () => {
  const baseParams = {
    clientId: 'app-id',
    redirectUri:
      'https://api.example.test/api/v1/connections/oauth/meta/callback',
    state: 'signed-state',
    scopes: ['instagram_basic', 'pages_show_list'],
  };

  it('binds a Business Login configuration to an authorization-code flow', () => {
    const url = new URL(
      metaOAuthProvider.buildAuthorizationUrl({
        ...baseParams,
        configurationId: 'configuration-id',
      }),
    );

    expect(url.searchParams.get('config_id')).toBe('configuration-id');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('override_default_response_type')).toBe('true');
    expect(url.searchParams.get('scope')).toBe(
      'instagram_basic,pages_show_list',
    );
  });

  it('keeps classic Facebook Login compatible without a configuration', () => {
    const url = new URL(metaOAuthProvider.buildAuthorizationUrl(baseParams));

    expect(url.searchParams.has('config_id')).toBe(false);
    expect(url.searchParams.has('override_default_response_type')).toBe(false);
  });
});
