import type {
  ConnectorContext,
  ResolvedConnection,
} from '@signagewall/apps-contract';

import { normalizeOpsBoardStatus } from './_shared/tabular/opsboard-status';
import { opsboardConnector } from './opsboard.connector';

const originalFetch = global.fetch;

function connection(
  provider: 'google' | 'microsoft' = 'google',
): ResolvedConnection {
  return {
    id: provider === 'google' ? 'google-conn' : 'microsoft-conn',
    organizationId: 'org-1',
    appInstanceId: 'instance-1',
    provider,
    accountLabel: `${provider}@example.com`,
    accessToken: `${provider}-secret-token`,
    scopes: [],
  };
}

function makeCtx(
  provider: 'google' | 'microsoft' = 'google',
  overrides: Partial<ConnectorContext> = {},
): ConnectorContext {
  return {
    logger: {
      debug: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    connection: connection(provider),
    ...overrides,
  };
}

function mockFetchSequence(responses: Array<{ ok?: boolean; body: unknown }>) {
  const fn = jest.fn();
  for (const response of responses) {
    fn.mockResolvedValueOnce({
      ok: response.ok ?? true,
      status: response.ok === false ? 500 : 200,
      json: () => Promise.resolve(response.body),
      text: () => Promise.resolve(JSON.stringify(response.body)),
    });
  }
  global.fetch = fn as never;
  return fn;
}

const gsheetsConfig = {
  connectionId: 'google-conn',
  source: 'gsheets' as const,
  spreadsheet: { id: 'sheet-1', label: 'Shift plan' },
  worksheet: 'Morning',
  mapping: {
    label: 'Line',
    primary: 'Plan',
    secondary: 'Actual',
    status: 'State',
    note: 'Notes',
    group: 'Area',
    sortOrder: 'Order',
  },
};

afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = originalFetch;
});

describe('normalizeOpsBoardStatus', () => {
  it.each([
    [' PLANNED ', 'planned'],
    ['Zakazano', 'planned'],
    ['У ТОКУ', 'active'],
    ['Kašnjenje', 'warning'],
    ['BLOCKIERT', 'blocked'],
    ['ZAVRŠENO', 'done'],
    ['', 'neutral'],
    ['a customer-specific value', 'neutral'],
    [undefined, 'neutral'],
  ])('normalizes %p to %s without throwing', (value, expected) => {
    expect(normalizeOpsBoardStatus(value)).toBe(expected);
  });
});

describe('opsboardConnector cache and webhooks', () => {
  it('is inert for manual and incomplete connected configs', () => {
    expect(opsboardConnector.cacheKey!({ source: 'manual' })).toBe('');
    expect(
      opsboardConnector.cacheKey!({
        source: 'gsheets',
        connectionId: 'google-conn',
      }),
    ).toBe('');
    expect(
      opsboardConnector.cacheKey!({
        source: 'excel',
        workbook: { id: 'drive|item' },
      }),
    ).toBe('');
  });

  it('isolates source, connection, file, worksheet and mapping', () => {
    const base = opsboardConnector.cacheKey!(gsheetsConfig);
    const cases = [
      { ...gsheetsConfig, connectionId: 'another-google-conn' },
      { ...gsheetsConfig, spreadsheet: { id: 'sheet-2', label: 'Shift plan' } },
      { ...gsheetsConfig, worksheet: 'Night' },
      {
        ...gsheetsConfig,
        mapping: { ...gsheetsConfig.mapping, status: 'Status' },
      },
      {
        ...gsheetsConfig,
        source: 'excel' as const,
        connectionId: 'microsoft-conn',
        workbook: { id: 'drive|item', label: 'Shift.xlsx' },
      },
    ];

    expect(base).toContain('opsboard:gsheets:google-conn:sheet-1:Morning:');
    for (const candidate of cases) {
      expect(opsboardConnector.cacheKey!(candidate)).not.toBe(base);
    }
  });

  it('watches an Excel drive item but leaves Sheets to Drive files.watch', () => {
    expect(
      opsboardConnector.webhookResource!({
        source: 'excel',
        workbook: { id: 'drive|item' },
      }),
    ).toEqual({ provider: 'microsoft', packedDriveItem: 'drive|item' });
    expect(opsboardConnector.webhookResource!(gsheetsConfig)).toBeNull();
    expect(opsboardConnector.webhookResource!({ source: 'manual' })).toBeNull();
  });
});

describe('opsboardConnector manual mode', () => {
  it('does not perform a provider fetch', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;

    await expect(
      opsboardConnector.fetchData(
        {
          source: 'manual',
          rows: [{ label: 'Line 1', status: 'active' }],
        },
        makeCtx(),
      ),
    ).rejects.toThrow(/not configured for sync/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('opsboardConnector Google Sheets', () => {
  it('maps, sorts and safely normalizes localized/unknown/blank rows', async () => {
    mockFetchSequence([
      {
        body: {
          values: [
            ['Line', 'Plan', 'Actual', 'State', 'Notes', 'Area', 'Order'],
            ['Line A', '120', '118', 'U TOKU', 'Steady', 'North', '2'],
            ['', '', '', 'blocked', 'blank label must be dropped', '', '0'],
            ['Line B', '90', '92', 'ZAVRŠENO', '', 'South', '1'],
            ['Line C', '', '', 'bespoke status', '', '', 'not-a-number'],
            ['', '', '', '', '', '', ''],
          ],
        },
      },
    ]);

    const result = await opsboardConnector.fetchData(gsheetsConfig, makeCtx());

    expect(result.playerPayload).toEqual({
      sourceTitle: 'Shift plan',
      rows: [
        {
          label: 'Line B',
          primary: '90',
          secondary: '92',
          status: 'done',
          group: 'South',
        },
        {
          label: 'Line A',
          primary: '120',
          secondary: '118',
          status: 'active',
          note: 'Steady',
          group: 'North',
        },
        { label: 'Line C', status: 'neutral' },
      ],
    });
    expect(JSON.stringify(result.playerPayload)).not.toContain(
      'google-secret-token',
    );
  });

  it('registers and persists a Drive watch channel when a callback is available', async () => {
    const fetchMock = mockFetchSequence([
      { body: { values: [['Line'], ['Line A']] } },
      {
        body: {
          resourceId: 'resource-1',
          expiration: String(Date.now() + 3_600_000),
        },
      },
    ]);

    const result = await opsboardConnector.fetchData(
      { ...gsheetsConfig, mapping: { label: 'Line' } },
      makeCtx('google', {
        webhookUrl: 'https://signagewall.example/api/v1/webhooks/google/drive',
      }),
    );

    expect((fetchMock.mock.calls[1] as [string])[0]).toContain(
      '/files/sheet-1/watch',
    );
    expect(result.secrets).toEqual({
      channel: expect.objectContaining({
        resourceId: 'resource-1',
        address: 'https://signagewall.example/api/v1/webhooks/google/drive',
      }),
    });
  });

  it('maps 100 rows without truncating or overflowing the payload contract', async () => {
    const values = [
      ['Line', 'State'],
      ...Array.from({ length: 100 }, (_, index) => [
        `Line ${String(index + 1)}`,
        index % 2 === 0 ? 'active' : 'done',
      ]),
    ];
    mockFetchSequence([{ body: { values } }]);

    const result = await opsboardConnector.fetchData(
      { ...gsheetsConfig, mapping: { label: 'Line', status: 'State' } },
      makeCtx(),
    );
    expect(result.playerPayload?.rows).toHaveLength(100);
  });

  it('propagates provider failures so the host can retain last-known-good data', async () => {
    mockFetchSequence([{ ok: false, body: { error: 'unavailable' } }]);
    await expect(
      opsboardConnector.fetchData(gsheetsConfig, makeCtx()),
    ).rejects.toThrow(/google sheets upstream 500/);
  });
});

describe('opsboardConnector Microsoft Excel', () => {
  const excelConfig = {
    connectionId: 'microsoft-conn',
    source: 'excel' as const,
    workbook: { id: 'drive-1|item-1', label: 'Dispatch.xlsx' },
    worksheet: 'Dispatch',
    mapping: {
      label: 'Dock',
      primary: 'Appointment',
      secondary: 'Carrier',
      status: 'Status',
      note: 'Instruction',
    },
  };

  it('reads displayed workbook values and maps the normalized payload', async () => {
    const fetchMock = mockFetchSequence([
      {
        body: {
          text: [
            ['Dock', 'Appointment', 'Carrier', 'Status', 'Instruction'],
            ['D-04', '08:30', 'North Freight', 'Delayed', 'Call dispatch'],
            ['', '', '', '', ''],
          ],
        },
      },
    ]);

    const result = await opsboardConnector.fetchData(
      excelConfig,
      makeCtx('microsoft'),
    );

    expect((fetchMock.mock.calls[0] as [string])[0]).toContain(
      '/drives/drive-1/items/item-1/workbook/worksheets',
    );
    expect(result.playerPayload).toEqual({
      sourceTitle: 'Dispatch.xlsx',
      rows: [
        {
          label: 'D-04',
          primary: '08:30',
          secondary: 'North Freight',
          status: 'warning',
          note: 'Call dispatch',
        },
      ],
    });
    expect(JSON.stringify(result.playerPayload)).not.toContain(
      'microsoft-secret-token',
    );
  });

  it('rejects malformed workbook ids before calling Graph', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    await expect(
      opsboardConnector.fetchData(
        { ...excelConfig, workbook: { id: 'not-packed', label: 'Bad.xlsx' } },
        makeCtx('microsoft'),
      ),
    ).rejects.toThrow(/invalid workbook id/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('opsboardConnector connection errors', () => {
  it('requires a resolved connection', async () => {
    await expect(
      opsboardConnector.fetchData(
        gsheetsConfig,
        makeCtx('google', { connection: undefined }),
      ),
    ).rejects.toThrow(/no connection resolved/);
  });

  it('does not use a Google connection for Excel or Microsoft for Sheets', async () => {
    await expect(
      opsboardConnector.fetchData(
        {
          connectionId: 'google-conn',
          source: 'excel',
          workbook: { id: 'drive|item' },
          mapping: { label: 'Item' },
        },
        makeCtx('google'),
      ),
    ).rejects.toThrow(/requires a microsoft connection/);
    await expect(
      opsboardConnector.fetchData(gsheetsConfig, makeCtx('microsoft')),
    ).rejects.toThrow(/requires a google connection/);
  });
});
