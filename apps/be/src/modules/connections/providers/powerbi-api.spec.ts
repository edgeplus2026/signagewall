import {
  POWER_BI_PICKER_DELEGATED_SCOPES,
  POWER_BI_SNAPSHOT_DELEGATED_SCOPES,
  PowerBiApiError,
  listPowerBiReportPages,
  listPowerBiReports,
  listPowerBiWorkspaces,
} from './powerbi-api';

const ACCESS_TOKEN = 'secret-power-bi-token';
const WORKSPACE_ID = 'f089354e-8366-4e18-aea3-4cb4a3a50b48';
const REPORT_ID = '879445d6-3a9e-4a74-b5ae-7c0ddabf0f11';

const originalFetch = global.fetch;

interface MockResponse {
  status?: number;
  body: unknown;
  headers?: Record<string, string>;
}

function mockFetchSequence(responses: MockResponse[]) {
  const fetchMock = jest.fn();
  for (const item of responses) {
    const status = item.status ?? 200;
    const headers = new Headers(item.headers);
    fetchMock.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      headers,
      json: jest.fn().mockResolvedValue(item.body),
    });
  }
  global.fetch = fetchMock as never;
  return fetchMock;
}

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('Power BI delegated scopes', () => {
  it('uses only the read scopes required by pickers and snapshot export', () => {
    expect(POWER_BI_PICKER_DELEGATED_SCOPES).toEqual([
      'https://analysis.windows.net/powerbi/api/Workspace.Read.All',
      'https://analysis.windows.net/powerbi/api/Report.Read.All',
    ]);
    expect(POWER_BI_SNAPSHOT_DELEGATED_SCOPES).toEqual([
      ...POWER_BI_PICKER_DELEGATED_SCOPES,
      'https://analysis.windows.net/powerbi/api/Dataset.Read.All',
    ]);
    expect(POWER_BI_SNAPSHOT_DELEGATED_SCOPES.join(' ')).not.toMatch(
      /ReadWrite|Tenant\.Read/i,
    );
  });
});

describe('listPowerBiWorkspaces', () => {
  it('returns token-free options and clearly labels capacity status', async () => {
    const fetchMock = mockFetchSequence([
      {
        body: {
          value: [
            {
              id: 'a2f89923-421a-464e-bf4c-25eab39bb09f',
              name: 'Factory KPI',
              isOnDedicatedCapacity: false,
            },
            {
              id: WORKSPACE_ID,
              name: 'Operations',
              isOnDedicatedCapacity: true,
              capacityId: 'private-capacity-id-must-not-leave-provider',
            },
            {
              id: '3d9b93c6-7b6d-4801-a491-1738910904fd',
              name: 'Legacy',
            },
          ],
        },
      },
    ]);

    const signal = new AbortController().signal;
    const result = await listPowerBiWorkspaces(ACCESS_TOKEN, '', signal);

    expect(result).toEqual([
      {
        id: WORKSPACE_ID,
        title:
          'Operations — dedicated capacity detected; export must be verified',
        snapshotCapacity: 'capacity-detected',
      },
      {
        id: '3d9b93c6-7b6d-4801-a491-1738910904fd',
        title: 'Legacy — capacity status unknown; export must be verified',
        snapshotCapacity: 'unknown',
      },
      {
        id: 'a2f89923-421a-464e-bf4c-25eab39bb09f',
        title: 'Factory KPI — snapshot unavailable: no dedicated capacity',
        snapshotCapacity: 'unsupported-no-dedicated-capacity',
      },
    ]);
    expect(JSON.stringify(result)).not.toContain(ACCESS_TOKEN);
    expect(JSON.stringify(result)).not.toContain('private-capacity-id');

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string>; signal: AbortSignal },
    ];
    expect(url).toBe('https://api.powerbi.com/v1.0/myorg/groups?$top=100');
    expect(url).not.toContain(ACCESS_TOKEN);
    expect(init.headers.authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(init.signal).toBe(signal);
  });

  it('returns an empty result and filters by workspace title client-side', async () => {
    mockFetchSequence([{ body: { value: [] } }]);
    await expect(listPowerBiWorkspaces(ACCESS_TOKEN)).resolves.toEqual([]);

    mockFetchSequence([
      {
        body: {
          value: [
            {
              id: WORKSPACE_ID,
              name: 'North Operations',
              isOnDedicatedCapacity: true,
            },
            {
              id: 'a2f89923-421a-464e-bf4c-25eab39bb09f',
              name: 'Marketing',
              isOnDedicatedCapacity: true,
            },
          ],
        },
      },
    ]);
    const filtered = await listPowerBiWorkspaces(ACCESS_TOKEN, 'north');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toContain('North Operations');
  });

  it('uses documented top/skip pagination for a full workspace page', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      name: `Workspace ${index}`,
      isOnDedicatedCapacity: true,
    }));
    const fetchMock = mockFetchSequence([
      { body: { value: firstPage } },
      {
        body: {
          value: [
            {
              id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
              name: 'Last workspace',
              isOnDedicatedCapacity: true,
            },
          ],
        },
      },
    ]);

    const result = await listPowerBiWorkspaces(ACCESS_TOKEN);
    expect(result).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://api.powerbi.com/v1.0/myorg/groups?%24top=100&%24skip=100',
    );
  });
});

describe('Power BI report and page pickers', () => {
  it('follows same-endpoint continuation pages and returns report options', async () => {
    const fetchMock = mockFetchSequence([
      {
        body: {
          value: [{ id: REPORT_ID, name: 'Shift report' }],
          '@odata.nextLink': `https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/reports?$skip=1`,
        },
      },
      {
        body: {
          value: [
            {
              id: '5b218778-e7a5-4d73-8187-f10824047715',
              name: 'Dispatch report',
            },
          ],
        },
      },
    ]);

    const result = await listPowerBiReports(
      ACCESS_TOKEN,
      WORKSPACE_ID,
      'report',
    );
    expect(result).toEqual([
      {
        id: '5b218778-e7a5-4d73-8187-f10824047715',
        title: 'Dispatch report',
      },
      { id: REPORT_ID, title: 'Shift report' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns report pages in Power BI order', async () => {
    mockFetchSequence([
      {
        body: {
          value: [
            { name: 'ReportSection2', displayName: 'Safety', order: '2' },
            { name: 'ReportSection', displayName: 'Overview', order: '0' },
            { name: 'ReportSection1', displayName: 'Dispatch', order: 1 },
          ],
        },
      },
    ]);

    await expect(
      listPowerBiReportPages(ACCESS_TOKEN, WORKSPACE_ID, REPORT_ID),
    ).resolves.toEqual([
      { id: 'ReportSection', title: 'Overview' },
      { id: 'ReportSection1', title: 'Dispatch' },
      { id: 'ReportSection2', title: 'Safety' },
    ]);
  });

  it('never forwards a bearer token to a cross-host continuation URL', async () => {
    const fetchMock = mockFetchSequence([
      {
        body: {
          value: [{ id: REPORT_ID, name: 'Safe first page' }],
          '@odata.nextLink': 'https://attacker.example/steal',
        },
      },
    ]);

    await expect(
      listPowerBiReports(ACCESS_TOKEN, WORKSPACE_ID),
    ).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
      message: 'Power BI returned an unsafe pagination link.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/v1.0/myorg/');
  });

  it('rejects path-like parent ids before issuing a request', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;

    await expect(
      listPowerBiReports(ACCESS_TOKEN, '../another-tenant'),
    ).rejects.toMatchObject({ code: 'INVALID_IDENTIFIER' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Power BI safe failures', () => {
  it.each([
    [401, 'AUTHENTICATION_REQUIRED', /reconnect/i],
    [403, 'PERMISSION_DENIED', /admin consent/i],
    [404, 'NOT_FOUND', /no longer has access/i],
  ])(
    'maps HTTP %i to %s without upstream body leakage',
    async (status, code, message) => {
      mockFetchSequence([
        {
          status,
          body: {
            error: {
              code: 'SensitiveUpstreamCode',
              message: `private body ${ACCESS_TOKEN}`,
            },
          },
        },
      ]);

      const error = await listPowerBiWorkspaces(ACCESS_TOKEN).catch(
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(PowerBiApiError);
      expect(error).toMatchObject({
        code,
        status,
        message: expect.stringMatching(message),
      });
      expect(String(error)).not.toContain('SensitiveUpstreamCode');
      expect(String(error)).not.toContain(ACCESS_TOKEN);
    },
  );

  it('surfaces throttling with a safe Retry-After value', async () => {
    mockFetchSequence([
      {
        status: 429,
        headers: { 'retry-after': '17' },
        body: { error: { message: `do not expose ${ACCESS_TOKEN}` } },
      },
    ]);

    await expect(listPowerBiWorkspaces(ACCESS_TOKEN)).rejects.toMatchObject({
      code: 'THROTTLED',
      status: 429,
      retryAfterSeconds: 17,
      message: 'Power BI is throttling requests. Try again in 17 seconds.',
    });
  });

  it('turns a capacity-shaped upstream failure into an actionable safe error', async () => {
    mockFetchSequence([
      {
        status: 400,
        body: {
          error: {
            code: 'ReportNotOnCapacity',
            message: `Premium capacity is required; internal=${ACCESS_TOKEN}`,
          },
        },
      },
    ]);

    const error = await listPowerBiWorkspaces(ACCESS_TOKEN).catch(
      (caught: unknown) => caught,
    );
    expect(error).toMatchObject({
      code: 'CAPACITY_REQUIRED',
      status: 400,
      message: expect.stringMatching(/Premium, Embedded, or Fabric/),
    });
    expect(String(error)).not.toContain(ACCESS_TOKEN);
  });

  it('rejects malformed collections and malformed items', async () => {
    mockFetchSequence([{ body: { value: 'not-an-array' } }]);
    await expect(listPowerBiWorkspaces(ACCESS_TOKEN)).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    });

    mockFetchSequence([
      {
        body: {
          value: [{ id: WORKSPACE_ID, name: 42 }],
        },
      },
    ]);
    await expect(listPowerBiWorkspaces(ACCESS_TOKEN)).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    });
  });
});
