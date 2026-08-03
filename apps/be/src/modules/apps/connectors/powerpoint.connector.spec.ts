import { powerpointManifest } from '@signagewall/apps';
import {
  buildConfigZod,
  type ConnectorContext,
  type ResolvedConnection,
} from '@signagewall/apps-contract';

import { powerpointConnector } from './powerpoint.connector';
import {
  type PptxRenderer,
  setPptxRenderer,
} from './powerpoint/pptx-renderer.registry';

const connection: ResolvedConnection = {
  id: 'conn1',
  provider: 'microsoft',
  accountLabel: 'user@example.com',
  accessToken: 'token-abc',
  scopes: [],
};

const config = {
  connectionId: 'conn1',
  presentation: { id: 'drive1|item1', label: 'Deck' },
};

function makeCtx(secrets?: Record<string, unknown>): ConnectorContext {
  return {
    logger: {
      debug: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    connection,
    ...(secrets ? { secrets } : {}),
  };
}

/** Mock the single Graph item-metadata GET the connector makes. */
function mockMeta(
  meta: { name?: string; cTag?: string; eTag?: string },
  ok = true,
): jest.Mock {
  const fn = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(meta),
  });
  global.fetch = fn as never;
  return fn;
}

function makeRenderer(
  overrides: Partial<PptxRenderer> = {},
): jest.Mocked<PptxRenderer> {
  return {
    isConfigured: jest.fn(() => true),
    render: jest.fn(async ({ keyPrefix }: { keyPrefix: string }) => ({
      slideKeys: [`${keyPrefix}/slide-000.webp`, `${keyPrefix}/slide-001.webp`],
    })),
    publicUrl: jest.fn((key: string) => `https://cdn.example/${key}`),
    deleteSlides: jest.fn(async () => undefined),
    ...overrides,
  } as jest.Mocked<PptxRenderer>;
}

function renderedSecrets(state: {
  version: string;
  slideKeys: string[];
  name: string;
}): Record<string, unknown> {
  return { rendered: state };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('powerpoint connector', () => {
  it('accepts a Microsoft embed URL and rejects unrelated URLs', () => {
    const schema = buildConfigZod(powerpointManifest.configSchema, {
      source: 'embed',
    });

    expect(
      schema.safeParse({
        source: 'embed',
        embedUrl: 'https://onedrive.live.com/embed?resid=deck',
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        source: 'embed',
        embedUrl: 'https://example.com/presentation.pptx',
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        source: 'embed',
        embedUrl: 'https://onedrive.live.com/',
      }).success,
    ).toBe(false);
  });

  it('is inert in no-account embed mode', async () => {
    const embedConfig = {
      source: 'embed' as const,
      embedUrl: 'https://onedrive.live.com/embed?resid=deck',
    };

    expect(powerpointConnector.cacheKey!(embedConfig)).toBe('');
    expect(powerpointConnector.webhookResource!(embedConfig)).toBeNull();
    await expect(
      powerpointConnector.fetchData(embedConfig, makeCtx()),
    ).rejects.toThrow(/embed mode/);
  });

  it('treats a legacy v2 connection as Microsoft mode', () => {
    expect(powerpointConnector.cacheKey!(config)).toBe(
      'powerpoint:conn1:drive1|item1',
    );
    expect(powerpointConnector.webhookResource!(config)).toEqual({
      provider: 'microsoft',
      packedDriveItem: 'drive1|item1',
    });
  });

  it('renders on first fetch and returns slide urls + version + secrets', async () => {
    const renderer = makeRenderer();
    setPptxRenderer(renderer);
    mockMeta({ name: 'My Deck', cTag: 'ctag-1' });

    const result = await powerpointConnector.fetchData(config, makeCtx());

    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(result.playerPayload?.slides).toHaveLength(2);
    expect(result.playerPayload?.name).toBe('My Deck');
    expect(result.version).toBe('ctag-1');
    const stored = result.secrets?.rendered as { version: string };
    expect(stored.version).toBe('ctag-1');
  });

  it('reuses slides (no re-render) when the content tag is unchanged', async () => {
    const renderer = makeRenderer();
    setPptxRenderer(renderer);
    mockMeta({ name: 'My Deck', cTag: 'ctag-1' });

    const result = await powerpointConnector.fetchData(
      config,
      makeCtx(
        renderedSecrets({
          version: 'ctag-1',
          slideKeys: ['k/slide-000.webp'],
          name: 'My Deck',
        }),
      ),
    );

    expect(renderer.render).not.toHaveBeenCalled();
    expect(result.version).toBe('ctag-1');
    expect(result.playerPayload?.slides).toEqual([
      'https://cdn.example/k/slide-000.webp',
    ]);
    // Secrets MUST be re-returned — a payload result omitting them clears them.
    expect(result.secrets?.rendered).toBeDefined();
  });

  it('re-renders and cleans up stale slides when the deck changes', async () => {
    const renderer = makeRenderer();
    setPptxRenderer(renderer);
    mockMeta({ name: 'My Deck', cTag: 'ctag-2' });

    const result = await powerpointConnector.fetchData(
      config,
      makeCtx(
        renderedSecrets({
          version: 'ctag-1',
          slideKeys: ['old/slide-000.webp'],
          name: 'Old',
        }),
      ),
    );

    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(renderer.deleteSlides).toHaveBeenCalledWith(['old/slide-000.webp']);
    expect(result.version).toBe('ctag-2');
  });

  it('ignores a legacy autoUpdate:false — the deck always follows the file', async () => {
    const renderer = makeRenderer();
    setPptxRenderer(renderer);
    // The deck changed upstream (ctag-2); old configs may still carry the
    // removed autoUpdate switch, which must no longer pin the version.
    mockMeta({ name: 'My Deck', cTag: 'ctag-2' });

    const result = await powerpointConnector.fetchData(
      { ...config, autoUpdate: false } as typeof config,
      makeCtx(
        renderedSecrets({
          version: 'ctag-1',
          slideKeys: ['k/slide-000.webp'],
          name: 'My Deck',
        }),
      ),
    );

    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(result.version).toBe('ctag-2');
  });

  it('returns pending when the render service is not registered yet', async () => {
    setPptxRenderer(undefined as never);
    const result = await powerpointConnector.fetchData(config, makeCtx());
    expect(result.pending).toBe(true);
  });

  it('throws when no presentation is selected', async () => {
    setPptxRenderer(makeRenderer());
    await expect(
      powerpointConnector.fetchData({ connectionId: 'c' }, makeCtx()),
    ).rejects.toThrow(/no presentation/);
  });

  it('cacheKey is per connection + presentation', () => {
    const key = powerpointConnector.cacheKey!(config);
    expect(key).toBe('powerpoint:conn1:drive1|item1');
  });
});
