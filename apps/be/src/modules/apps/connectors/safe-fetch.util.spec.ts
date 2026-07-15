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
    headers: new Headers(),
  });
  global.fetch = fn as never;
  return fn;
}

/** A 30x hop, then whatever the next mocked response is. */
function redirectTo(location: string, status = 302) {
  return {
    ok: false,
    status,
    body: null,
    text: () => Promise.resolve(''),
    headers: new Headers({ location }),
  };
}

function okResponse(body: string) {
  return {
    ok: true,
    status: 200,
    body: null,
    text: () => Promise.resolve(body),
    headers: new Headers(),
  };
}

/** Queue a sequence of responses for consecutive fetch calls. */
function mockFetchSequence(responses: object[]): jest.Mock {
  const fn = jest.fn();
  for (const response of responses) {
    fn.mockResolvedValueOnce(response);
  }
  global.fetch = fn as never;
  return fn;
}

/** The URL a given fetch call was made against. */
function urlOfCall(mock: jest.Mock, index: number): string {
  const calls = mock.mock.calls as Array<[string, RequestInit]>;
  return calls[index]?.[0] ?? '';
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
      // Followed by hand (see the redirect tests) rather than by fetch itself.
      expect.objectContaining({ redirect: 'manual' }),
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

describe('safeFetchText redirects', () => {
  it('follows a redirect to a public host', async () => {
    // `http://feeds.bbci.co.uk/news/rss.xml` really does answer 302 — refusing
    // redirects outright made the guard unusable for ordinary feeds.
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    const fetchMock = mockFetchSequence([
      redirectTo('https://example.com/feed.xml', 301),
      okResponse('<rss>moved</rss>'),
    ]);

    await expect(safeFetchText('http://example.com/feed')).resolves.toBe(
      '<rss>moved</rss>',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(urlOfCall(fetchMock, 1)).toBe('https://example.com/feed.xml');
  });

  it('resolves a relative Location against the current hop', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    const fetchMock = mockFetchSequence([
      redirectTo('/rss/index.xml'),
      okResponse('<rss/>'),
    ]);

    await safeFetchText('https://example.com/feed');
    expect(urlOfCall(fetchMock, 1)).toBe('https://example.com/rss/index.xml');
  });

  it('BLOCKS a redirect that points at an internal address', async () => {
    // The whole reason redirects can't be followed blindly: the first URL being
    // public says nothing about where it forwards us.
    lookupMock
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]) // hop 1: public
      .mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }]); // hop 2: metadata
    mockFetchSequence([
      redirectTo('http://metadata.evil.example/latest/meta-data/'),
      okResponse('SECRET'),
    ]);

    await expect(safeFetchText('https://example.com/feed')).rejects.toThrow(
      /non-public/,
    );
  });

  it('blocks a redirect into a non-http(s) scheme', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    mockFetchSequence([redirectTo('file:///etc/passwd'), okResponse('root:x')]);

    await expect(safeFetchText('https://example.com/feed')).rejects.toThrow(
      SsrfBlockedError,
    );
  });

  it('gives up on a redirect loop instead of spinning', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    const fn = jest.fn().mockResolvedValue(redirectTo('https://example.com/a'));
    global.fetch = fn as never;

    await expect(safeFetchText('https://example.com/a')).rejects.toThrow(
      /Too many redirects/,
    );
  });

  it('throws when a redirect carries no Location', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    mockFetchSequence([
      { ok: false, status: 302, body: null, headers: new Headers() },
    ]);

    await expect(safeFetchText('https://example.com/feed')).rejects.toThrow(
      /no location/,
    );
  });
});
