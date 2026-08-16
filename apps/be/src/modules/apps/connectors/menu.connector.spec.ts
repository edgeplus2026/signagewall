import type {
  ConnectorContext,
  ResolvedConnection,
} from '@signagewall/apps-contract';

import { menuConnector } from './menu.connector';

const connection: ResolvedConnection = {
  id: 'conn-1',
  provider: 'google',
  accountLabel: 'menu@example.com',
  accessToken: 'token',
  scopes: [],
};

function makeCtx(overrides: Partial<ConnectorContext> = {}): ConnectorContext {
  return {
    logger: {
      debug: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    connection,
    ...overrides,
  };
}

function mockFetchSequence(responses: Array<{ ok?: boolean; body: unknown }>) {
  const fn = jest.fn();
  for (const res of responses) {
    fn.mockResolvedValueOnce({
      ok: res.ok ?? true,
      status: res.ok === false ? 500 : 200,
      json: () => Promise.resolve(res.body),
    });
  }
  global.fetch = fn as never;
  return fn;
}

const gsheetsConfig = {
  connectionId: 'conn-1',
  source: 'gsheets',
  spreadsheet: { id: 'sheet-1', label: 'Menu 2026' },
  worksheet: '',
  mapping: { name: 'Name', price: 'Price', category: 'Group' },
};

describe('menuConnector.cacheKey', () => {
  it('is empty (inert) for manual and incomplete configs', () => {
    expect(menuConnector.cacheKey!({ source: 'manual' })).toBe('');
    expect(
      menuConnector.cacheKey!({ source: 'gsheets', connectionId: 'c' }),
    ).toBe('');
    expect(
      menuConnector.cacheKey!({ source: 'gsheets', spreadsheet: { id: 's' } }),
    ).toBe('');
  });

  it('keys on source, connection, file, worksheet AND mapping', () => {
    const a = menuConnector.cacheKey!(gsheetsConfig);
    const b = menuConnector.cacheKey!({
      ...gsheetsConfig,
      mapping: { name: 'Name', price: 'Cost' },
    });
    expect(a).toContain('menu:gsheets:conn-1:sheet-1:first:');
    // Different mappings shape different payloads — they must not share a key.
    expect(a).not.toBe(b);
  });
});

describe('menuConnector.webhookResource', () => {
  it('names the workbook drive item only for the excel source', () => {
    expect(
      menuConnector.webhookResource!({
        source: 'excel',
        workbook: { id: 'drive-1|item-1' },
      }),
    ).toEqual({ provider: 'microsoft', packedDriveItem: 'drive-1|item-1' });
    expect(
      menuConnector.webhookResource!({
        source: 'gsheets',
        spreadsheet: { id: 'sheet-1' },
      }),
    ).toBeNull();
    expect(menuConnector.webhookResource!({ source: 'manual' })).toBeNull();
  });
});

describe('menuConnector.fetchData (gsheets)', () => {
  it('maps sheet rows to normalized items, parsing prices', async () => {
    mockFetchSequence([
      {
        body: {
          values: [
            ['Name', 'Price', 'Group'],
            ['Espresso', '2,50 €', 'Drinks'],
            ['Special', 'ask us', 'Food'],
            ['', '', ''],
          ],
        },
      },
    ]);

    const result = await menuConnector.fetchData(gsheetsConfig, makeCtx());
    expect(result.playerPayload).toEqual({
      sourceTitle: 'Menu 2026',
      items: [
        { name: 'Espresso', price: 2.5, category: 'Drinks' },
        // A price cell with no number stays verbatim text.
        { name: 'Special', price: 'ask us', category: 'Food' },
      ],
    });
    // No webhookUrl in ctx → no channel subscription attempted, no secrets.
    expect(result.secrets).toBeUndefined();
  });

  it('registers a Drive watch channel when the deployment has a public URL', async () => {
    const fetchMock = mockFetchSequence([
      { body: { values: [['Name'], ['Espresso']] } },
      // files.watch response
      {
        body: {
          resourceId: 'res-1',
          expiration: String(Date.now() + 3_600_000),
        },
      },
    ]);

    const result = await menuConnector.fetchData(
      gsheetsConfig,
      makeCtx({
        webhookUrl: 'https://signagewall.example/api/v1/webhooks/google/drive',
      }),
    );

    const watchCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(watchCall[0]).toContain('/files/sheet-1/watch');
    expect(result.secrets).toEqual({
      channel: expect.objectContaining({
        resourceId: 'res-1',
        address: 'https://signagewall.example/api/v1/webhooks/google/drive',
      }),
    });
  });

  it('never fails the fetch over a failed watch registration', async () => {
    mockFetchSequence([
      { body: { values: [['Name'], ['Espresso']] } },
      { ok: false, body: {} },
    ]);

    const result = await menuConnector.fetchData(
      gsheetsConfig,
      makeCtx({
        webhookUrl: 'https://signagewall.example/api/v1/webhooks/google/drive',
      }),
    );
    expect(result.playerPayload?.items).toEqual([{ name: 'Espresso' }]);
    expect(result.secrets).toBeUndefined();
  });
});

const excelConfig = {
  connectionId: 'conn-2',
  source: 'excel',
  workbook: { id: 'drive-1|item-1', label: 'menu.xlsx' },
  worksheet: 'Sheet1',
  mapping: { name: 'Name', price: 'Price' },
};

/** The used-range read, as Graph returns it. */
const workbookBody = {
  text: [
    ['Name', 'Price'],
    ['Burger', '9.90'],
  ],
};

describe('menuConnector.fetchData (excel)', () => {
  it('reads the workbook used range via Graph and maps it', async () => {
    const fetchMock = mockFetchSequence([
      { body: { cTag: 'tag-1' } },
      { body: workbookBody },
    ]);

    const result = await menuConnector.fetchData(excelConfig, makeCtx());

    const metaUrl = (fetchMock.mock.calls[0] as [string])[0];
    expect(metaUrl).toContain('/drives/drive-1/items/item-1');
    expect(metaUrl).toContain('cTag');

    const rangeUrl = (fetchMock.mock.calls[1] as [string])[0];
    expect(rangeUrl).toContain(
      '/drives/drive-1/items/item-1/workbook/worksheets',
    );
    expect(rangeUrl).toContain('usedRange');

    expect(result.playerPayload).toEqual({
      sourceTitle: 'menu.xlsx',
      items: [{ name: 'Burger', price: 9.9 }],
    });
    // The tag is remembered WITH the items it produced, and doubles as the
    // change signature so an unchanged workbook doesn't fan out.
    expect(result.version).toBe('tag-1');
    expect(result.secrets).toEqual({
      workbook: { tag: 'tag-1', items: [{ name: 'Burger', price: 9.9 }] },
    });
  });

  /**
   * Graph refuses to subscribe to a single file — only to a drive ROOT — so a
   * photo dropped anywhere in the operator's OneDrive notifies every menu
   * syncing from that drive. Without this short-circuit each one re-read the
   * whole workbook.
   */
  it('skips the used-range read when the content tag is unchanged', async () => {
    const fetchMock = mockFetchSequence([{ body: { cTag: 'tag-1' } }]);

    const result = await menuConnector.fetchData(
      excelConfig,
      makeCtx({
        secrets: {
          workbook: { tag: 'tag-1', items: [{ name: 'Burger', price: 9.9 }] },
        },
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.playerPayload).toEqual({
      sourceTitle: 'menu.xlsx',
      items: [{ name: 'Burger', price: 9.9 }],
    });
    expect(result.version).toBe('tag-1');
  });

  it('re-reads when the content tag moved', async () => {
    const fetchMock = mockFetchSequence([
      { body: { cTag: 'tag-2' } },
      { body: workbookBody },
    ]);

    const result = await menuConnector.fetchData(
      excelConfig,
      makeCtx({ secrets: { workbook: { tag: 'tag-1', items: [] } } }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.version).toBe('tag-2');
  });

  it('falls back to eTag when Graph reports no cTag', async () => {
    mockFetchSequence([{ body: { eTag: 'etag-9' } }, { body: workbookBody }]);

    const result = await menuConnector.fetchData(excelConfig, makeCtx());
    expect(result.version).toBe('etag-9');
  });

  /**
   * No tag means "cannot tell", which must never be read as "unchanged" — a
   * board that stops updating is worse than one that re-reads.
   */
  it('reads anyway, and stores no state, when Graph reports no tag at all', async () => {
    const fetchMock = mockFetchSequence([{ body: {} }, { body: workbookBody }]);

    const result = await menuConnector.fetchData(
      excelConfig,
      makeCtx({ secrets: { workbook: { tag: '', items: [] } } }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.version).toBeUndefined();
    expect(result.secrets).toBeUndefined();
    expect(result.playerPayload).toEqual({
      sourceTitle: 'menu.xlsx',
      items: [{ name: 'Burger', price: 9.9 }],
    });
  });
});
