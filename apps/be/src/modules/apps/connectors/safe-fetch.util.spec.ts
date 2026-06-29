import * as dns from 'node:dns/promises';

import { SsrfBlockedError, safeFetchText } from './safe-fetch.util';

jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));

const lookupMock = dns.lookup as unknown as jest.Mock;

function mockFetchText(body: string, ok = true): jest.Mock {
  const fn = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    body: null, // exercise the response.text() fallback path
    text: () => Promise.resolve(body),
  });
  global.fetch = fn as never;
  return fn;
}

afterEach(() => {
  jest.restoreAllMocks();
  lookupMock.mockReset();
});

describe('safeFetchText SSRF guard', () => {
  it('rejects non-http(s) protocols without touching the network', async () => {
    const fetchMock = mockFetchText('');
    await expect(safeFetchText('file:///etc/passwd')).rejects.toThrow(
      SsrfBlockedError,
    );
    await expect(safeFetchText('ftp://example.com')).rejects.toThrow(
      SsrfBlockedError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks the cloud metadata IP literal', async () => {
    const fetchMock = mockFetchText('');
    await expect(
      safeFetchText('http://169.254.169.254/latest/meta-data/'),
    ).rejects.toThrow(/non-public/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks a hostname that resolves to a private address', async () => {
    lookupMock.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);
    const fetchMock = mockFetchText('');
    await expect(safeFetchText('http://internal.corp/feed')).rejects.toThrow(
      /non-public/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks localhost / loopback', async () => {
    lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    await expect(safeFetchText('http://localhost:8080')).rejects.toThrow(
      /non-public/,
    );
  });

  it('blocks IPv4-mapped IPv6 loopback', async () => {
    lookupMock.mockResolvedValue([{ address: '::ffff:127.0.0.1', family: 6 }]);
    await expect(safeFetchText('http://sneaky.example')).rejects.toThrow(
      /non-public/,
    );
  });

  it('allows a public host and returns the body', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    const fetchMock = mockFetchText('<rss></rss>');
    const text = await safeFetchText('https://example.com/feed');
    expect(text).toBe('<rss></rss>');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/feed',
      expect.objectContaining({ redirect: 'error' }),
    );
  });

  it('throws on a non-ok upstream', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    mockFetchText('', false);
    await expect(safeFetchText('https://example.com/feed')).rejects.toThrow(
      /upstream 500/,
    );
  });
});
