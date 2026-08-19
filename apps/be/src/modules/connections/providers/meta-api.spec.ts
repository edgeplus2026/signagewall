import { listFacebookPages, listInstagramAccounts } from './meta-api';

const ACCESS_TOKEN = 'secret-meta-token';
const originalFetch = global.fetch;

interface MockResponse {
  status?: number;
  body: unknown;
}

function mockFetchSequence(responses: MockResponse[]) {
  const fetchMock = jest.fn();
  for (const item of responses) {
    const status = item.status ?? 200;
    fetchMock.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
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

describe('Meta account discovery', () => {
  it('merges directly managed and business-portfolio Pages', async () => {
    mockFetchSequence([
      { body: { data: [{ id: 'personal', name: 'Personal Page' }] } },
      { body: { data: [{ id: 'business-1' }] } },
      {
        body: {
          data: [
            { id: 'business-page', name: 'Business Page' },
            { id: 'personal', name: 'Personal Page' },
          ],
        },
      },
      { body: { data: [{ id: 'client-page', name: 'Client Page' }] } },
    ]);

    await expect(listFacebookPages(ACCESS_TOKEN, '')).resolves.toEqual([
      { id: 'business-page', title: 'Business Page' },
      { id: 'client-page', title: 'Client Page' },
      { id: 'personal', title: 'Personal Page' },
    ]);
  });

  it('discovers both Instagram relationship fields on business Pages', async () => {
    const fetchMock = mockFetchSequence([
      { body: { data: [] } },
      { body: { data: [{ id: 'business-1' }] } },
      {
        body: {
          data: [
            {
              id: 'page-1',
              name: 'SignageWall',
              instagram_business_account: {
                id: 'ig-1',
                username: 'signagewall',
              },
            },
          ],
        },
      },
      {
        body: {
          data: [
            {
              id: 'page-2',
              name: 'Client',
              connected_instagram_account: {
                id: 'ig-2',
                username: 'client',
              },
            },
          ],
        },
      },
    ]);

    await expect(listInstagramAccounts(ACCESS_TOKEN, '')).resolves.toEqual([
      { id: 'ig-2', title: '@client' },
      { id: 'ig-1', title: '@signagewall' },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const [, init] of fetchMock.mock.calls as [
      string,
      { headers: Record<string, string> },
    ][]) {
      expect(init.headers.authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
    }
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(
      `access_token=${ACCESS_TOKEN}`,
    );
  });

  it('keeps directly managed Pages when portfolio permission is unavailable', async () => {
    mockFetchSequence([
      { body: { data: [{ id: 'personal', name: 'Personal Page' }] } },
      {
        status: 400,
        body: {
          error: { code: 100, message: 'Missing Permission' },
        },
      },
    ]);

    await expect(listFacebookPages(ACCESS_TOKEN, '')).resolves.toEqual([
      { id: 'personal', title: 'Personal Page' },
    ]);
  });

  it('rejects continuation URLs outside the Meta Graph origin', async () => {
    mockFetchSequence([
      {
        body: {
          data: [],
          paging: { next: 'https://attacker.example/steal' },
        },
      },
      { body: { data: [] } },
    ]);

    await expect(listFacebookPages(ACCESS_TOKEN, '')).rejects.toThrow(
      'invalid continuation URL',
    );
  });
});
